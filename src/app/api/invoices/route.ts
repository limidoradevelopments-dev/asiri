// app/api/invoices/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { z } from "zod";
import { serverTimestamp } from "firebase/firestore";

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

    // 1. Create Invoice
    const createdInvoice = await db.create("invoices", invoiceData);

    // 2. Decrement stock for products
    const productItems = invoiceData.items.filter(item => !item.itemId.startsWith('custom-'));

    for (const item of productItems) {
      // Use atomic decrement
      await db.increment("products", item.itemId, "stock", -item.quantity);
    }
    
    // 3. Update vehicle's last visit
    // Note: serverTimestamp() is a Firestore-specific value.
    // The db abstraction might need to handle this if we switch DBs.
    await db.update("vehicles", invoiceData.vehicleId, { lastVisit: serverTimestamp() });

    return NextResponse.json(createdInvoice, { status: 201 });
  } catch (err) {
    console.error("POST /api/invoices error:", err);
    return NextResponse.json({ error: "Failed to create invoice" }, { status: 500 });
  }
}
