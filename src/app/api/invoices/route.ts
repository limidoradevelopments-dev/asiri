// app/api/invoices/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { z } from "zod";
import { initializeFirebase } from "@/firebase/server-init";
import { collection, query, getDocs, orderBy, limit, startAfter, Timestamp } from "firebase/firestore";
import type { Invoice, Payment } from "@/lib/data";

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
    
    const invoicesSnapshot = await getDocs(invoicesQuery);
    const invoices = invoicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as (Invoice & { id: string })[];

    const enrichedInvoices = await db.enrichInvoices(invoices);
    
    const hasMore = invoices.length === BATCH_SIZE;

    return NextResponse.json({ invoices: enrichedInvoices, hasMore }, { status: 200 });

  } catch (err) {
    console.error("GET /api/invoices error:", err);
    const message = err instanceof Error ? err.message : "Failed to fetch invoices";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


const paymentSchema = z.object({
  id: z.string().optional(),
  method: z.enum(['Cash', 'Card', 'Check']),
  amount: z.number().positive('Payment amount must be positive.'),
  chequeNumber: z.string().optional(),
  bank: z.string().optional(),
});

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
  payments: z.array(paymentSchema).nonempty('At least one payment method is required.'),
  amountPaid: z.number(),
  balanceDue: z.number(),
  changeGiven: z.number(),
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
    
    const { firestore } = initializeFirebase();
    const productsRef = collection(firestore, 'products');
    const allProductsSnapshot = await getDocs(productsRef);
    const productIds = new Set(allProductsSnapshot.docs.map(doc => doc.id));

    const productItems = invoiceData.items.filter(item => productIds.has(item.itemId));


    for (const item of productItems) {
      try {
        await db.increment("products", item.itemId, "stock", -item.quantity);
      } catch (stockError) {
        console.error(`Stock update failed for item ${item.itemId}:`, stockError);
        return NextResponse.json({ error: `Failed to update stock for product ${item.name}. Please check inventory.` }, { status: 500 });
      }
    }
    
    const createdInvoice = await db.create("invoices", invoiceDataForDb);

    await db.update("vehicles", invoiceData.vehicleId, { lastVisit: invoiceDataForDb.date });

    return NextResponse.json(createdInvoice, { status: 201 });
  } catch (err) {
    console.error("POST /api/invoices error:", err);
    return NextResponse.json({ error: "Failed to create invoice" }, { status: 500 });
  }
}

const addPaymentSchema = z.object({
  invoiceId: z.string(),
  newPayments: z.array(paymentSchema).nonempty(),
});

/**
 * PUT /api/invoices
 * Body: { invoiceId: string, newPayments: Payment[] }
 * Adds new payments to an existing invoice and updates its status.
 */
export async function PUT(req: NextRequest) {
    try {
        const payload = await req.json();
        const validation = addPaymentSchema.safeParse(payload);

        if (!validation.success) {
            return NextResponse.json({ error: validation.error.flatten().fieldErrors }, { status: 400 });
        }

        const { invoiceId, newPayments } = validation.data;

        const existingInvoice = await db.getOne("invoices", invoiceId) as Invoice | null;
        if (!existingInvoice) {
            return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
        }
        
        // --- LOGIC TO MERGE PAYMENTS AND UPDATE TOTALS ---
        const allPayments = [...existingInvoice.payments, ...newPayments];
        const totalAmountPaid = allPayments.reduce((sum, p) => sum + p.amount, 0);

        let newBalanceDue = existingInvoice.total - totalAmountPaid;
        let newPaymentStatus: Invoice['paymentStatus'] = 'Partial';
        let changeGiven = 0;

        if (newBalanceDue <= 0) {
            changeGiven = Math.abs(newBalanceDue);
            newBalanceDue = 0;
            newPaymentStatus = 'Paid';
        }

        const updateData = {
            payments: allPayments,
            amountPaid: totalAmountPaid,
            balanceDue: newBalanceDue,
            paymentStatus: newPaymentStatus,
            changeGiven: existingInvoice.changeGiven ? existingInvoice.changeGiven + changeGiven : changeGiven,
        };
        
        const updatedInvoice = await db.update("invoices", invoiceId, updateData);

        return NextResponse.json(updatedInvoice, { status: 200 });

    } catch (err) {
        console.error("PUT /api/invoices error:", err);
        const message = err instanceof Error ? err.message : "Failed to update invoice payment";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
    
