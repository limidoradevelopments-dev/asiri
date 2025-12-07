
// app/api/invoices/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { z } from "zod";
import { initializeFirebase } from "@/firebase/server-init";
import { collection, query, getDocs, orderBy, limit, startAfter, Timestamp } from "firebase/firestore";
import type { Invoice, Customer, Vehicle, Employee } from "@/lib/data";

const BATCH_SIZE = 50;

/**
 * GET /api/invoices
 * Returns paginated, enriched invoices.
 * Supports cursor-based pagination with `startAfter` (timestamp).
 */
export async function GET(req: NextRequest) {
  try {
    const { firestore } = initializeFirebase();
    const url = new URL(req.url);
    const cursor = url.searchParams.get("startAfter");

    // --- Base Query ---
    let invoicesQuery = query(
      collection(firestore, 'invoices'),
      orderBy("date", "desc"),
      limit(BATCH_SIZE)
    );
    
    // --- Pagination ---
    if (cursor) {
      // Create a Firestore Timestamp from the numeric cursor
      const cursorTimestamp = Timestamp.fromMillis(Number(cursor));
      invoicesQuery = query(
        collection(firestore, 'invoices'),
        orderBy("date", "desc"),
        startAfter(cursorTimestamp),
        limit(BATCH_SIZE)
      );
    }
    
    const [
      invoicesSnapshot,
      customersSnapshot,
      vehiclesSnapshot,
      employeesSnapshot
    ] = await Promise.all([
      getDocs(invoicesQuery),
      getDocs(collection(firestore, 'customers')),
      getDocs(collection(firestore, 'vehicles')),
      getDocs(collection(firestore, 'employees'))
    ]);

    const invoices = invoicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as (Invoice & { id: string })[];

    // --- Server-Side Enrichment ---
    const customerMap = new Map(customersSnapshot.docs.map(doc => [doc.id, doc.data() as Customer]));
    const vehicleMap = new Map(vehiclesSnapshot.docs.map(doc => [doc.id, doc.data() as Vehicle]));
    const employeeMap = new Map(employeesSnapshot.docs.map(doc => [doc.id, doc.data() as Employee]));

    const enrichedInvoices = invoices.map(invoice => ({
      ...invoice,
      customerDetails: { id: invoice.customerId, ...customerMap.get(invoice.customerId) },
      vehicleDetails: { id: invoice.vehicleId, ...vehicleMap.get(invoice.vehicleId) },
      employeeDetails: { id: invoice.employeeId, ...employeeMap.get(invoice.employeeId) },
      // Keep flattened names for easy display
      customerName: customerMap.get(invoice.customerId)?.name,
      vehicleNumberPlate: vehicleMap.get(invoice.vehicleId)?.numberPlate,
      employeeName: employeeMap.get(invoice.employeeId)?.name,
    }));
    
    const hasMore = invoices.length === BATCH_SIZE;

    return NextResponse.json({ invoices: enrichedInvoices, hasMore }, { status: 200 });

  } catch (err) {
    console.error("GET /api/invoices error:", err);
    const message = err instanceof Error ? err.message : "Failed to fetch invoices";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


const invoiceSchema = z.object({
  invoiceNumber: z.string(),
  customerId: z.string(),
  vehicleId: z.string(),
  employeeId: z.string(),
  date: z.number(),
  items: z.array(z.object({
    itemId: z.string(),
    name: z.string(),
    quantity: z.number(),
    unitPrice: z.number(),
    discount: z.number(),
    total: z.number(),
  })),
  subtotal: z.number(),
  globalDiscountPercent: z.number(),
  globalDiscountAmount: z.number(),
  total: z.number(),
  paymentStatus: z.enum(['Paid', 'Partial', 'Unpaid']),
  amountPaid: z.number(),
  balanceDue: z.number(),
  changeGiven: z.number(),
  paymentMethod: z.enum(['Cash', 'Card', 'Check']),
  chequeNumber: z.string().optional(),
  bank: z.string().optional(),
});

/**
 * POST /api/invoices
 * Body: JSON invoice object
 * Creates an invoice, updates stock for products, and updates vehicle's last visit.
 */
export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const validation = invoiceSchema.safeParse(payload);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const invoiceData = validation.data;
    
    const invoiceDataForDb = {
        ...invoiceData,
        date: Timestamp.fromMillis(invoiceData.date)
    };

    // 1. Filter out only product items to decrement stock.
    // We can identify products because services/custom items will not have an ID that matches a product.
    // A robust way is to check if the itemId exists in the products collection, but for performance,
    // we can rely on a naming convention or simply attempt the decrement and handle errors.
    // A simpler approach is to check if the itemId is NOT a 'custom-' one.
    // The POS logic sends product IDs from firestore, and `custom-` for custom jobs. Services have their own IDs.
    // To robustly distinguish products from services, we'll check against the products collection.
    // However, the current logic is to just try and decrement. A better way would be to get all product IDs first.
    // Let's stick to the current pattern, but be more explicit about filtering.
    // The safest way without changing too much is to filter out items that are clearly not products.
    // Services might have IDs that look like product IDs.
    // The current `invoiceData.items` doesn't distinguish between product/service.
    // The POS page does. Let's assume for now any item that is not a 'custom' job could be a product.
    
    const productItems = invoiceData.items.filter(item => {
        // Services/Custom items might not have a standard format.
        // Let's assume custom jobs have 'custom-' prefix, and we only try to update stock for others.
        // This implicitly assumes services won't cause an error, which is true for `db.increment`.
        // A better check would be needed if services and products shared an ID space in a harmful way.
        return !item.itemId.startsWith('custom-');
    });

    // Check against the actual products DB to be certain.
    const { firestore } = initializeFirebase();
    const productsRef = collection(firestore, 'products');
    const allProductsSnapshot = await getDocs(productsRef);
    const productIds = new Set(allProductsSnapshot.docs.map(doc => doc.id));

    const itemsToUpdateStock = productItems.filter(item => productIds.has(item.itemId));


    for (const item of itemsToUpdateStock) {
      try {
        await db.increment("products", item.itemId, "stock", -item.quantity);
      } catch (stockError) {
        console.error(`Stock update failed for item ${item.itemId}:`, stockError);
        // This is a critical failure. We should not create the invoice if stock cannot be guaranteed.
        return NextResponse.json({ error: `Failed to update stock for product ${item.name}. Please check inventory.` }, { status: 500 });
      }
    }
    
    // 2. If all stock updates are successful, create the invoice.
    const createdInvoice = await db.create("invoices", invoiceDataForDb);

    // 3. Update vehicle's last visit.
    await db.update("vehicles", invoiceData.vehicleId, { lastVisit: invoiceDataForDb.date });

    return NextResponse.json(createdInvoice, { status: 201 });
  } catch (err) {
    console.error("POST /api/invoices error:", err);
    // This will catch errors from invoice creation or vehicle update.
    return NextResponse.json({ error: "Failed to create invoice" }, { status: 500 });
  }
}

    