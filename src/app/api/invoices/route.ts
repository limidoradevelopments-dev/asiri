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
 * Creates an invoice, updates stock, updates vehicle last visit
 */
export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const validation = invoiceSchema.safeParse(payload);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const invoiceData = validation.data;
    
    // Convert JS date timestamp to Firestore Timestamp for querying consistency
    const invoiceDataForDb = {
        ...invoiceData,
        date: Timestamp.fromMillis(invoiceData.date)
    }

    // 1. Decrement stock for products first to ensure availability.
    const productItems = invoiceData.items.filter(item => !item.itemId.startsWith('custom-'));

    for (const item of productItems) {
      try {
        await db.increment("products", item.itemId, "stock", -item.quantity);
      } catch (stockError) {
        console.error(`Stock update failed for item ${item.itemId}:`, stockError);
        return NextResponse.json({ error: `Failed to update stock for ${item.name}. Please check inventory.` }, { status: 500 });
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
