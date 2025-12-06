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

    // 1. Decrement stock for products first to ensure availability.
    const productItems = invoiceData.items.filter(item => !item.itemId.startsWith('custom-'));

    // This is not a true atomic transaction, but it's a safer order of operations.
    // For full atomicity, a Firestore transaction/batch write would be needed in db.ts.
    for (const item of productItems) {
      try {
        await db.increment("products", item.itemId, "stock", -item.quantity);
      } catch (stockError) {
        // If any stock update fails, we stop and return an error.
        // NOTE: This doesn't roll back previous successful stock updates in this loop.
        // A true transaction is needed for that.
        console.error(`Stock update failed for item ${item.itemId}:`, stockError);
        return NextResponse.json({ error: `Failed to update stock for ${item.name}. Please check inventory.` }, { status: 500 });
      }
    }
    
    // 2. If all stock updates are successful, create the invoice.
    const createdInvoice = await db.create("invoices", invoiceData);

    // 3. Update vehicle's last visit.
    await db.update("vehicles", invoiceData.vehicleId, { lastVisit: serverTimestamp() });

    return NextResponse.json(createdInvoice, { status: 201 });
  } catch (err) {
    console.error("POST /api/invoices error:", err);
    // This will catch errors from invoice creation or vehicle update.
    return NextResponse.json({ error: "Failed to create invoice" }, { status: 500 });
  }
}
