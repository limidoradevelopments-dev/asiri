
// app/api/products/adjust-stock/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/server/db";
import { toZonedTime } from 'date-fns-tz';
import { Timestamp } from "firebase/firestore";

const adjustmentSchema = z.object({
  productId: z.string().min(1),
  action: z.enum(['decrement', 'delete']),
  quantity: z.number().int().optional(),
  reason: z.string().min(10),
});

/**
 * POST /api/products/adjust-stock
 * Body: { productId, action, quantity?, reason }
 * Performs a stock adjustment (decrement or delete) and logs the action.
 */
export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const validation = adjustmentSchema.safeParse(payload);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.flatten().fieldErrors }, { status: 400 });
    }
    
    const { productId, action, quantity, reason } = validation.data;
    
    // 1. Fetch the product to ensure it exists and get its name
    const product = await db.getOne("products", productId);
    if (!product) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }

    // 2. Prepare the log entry
    const nowInSL = toZonedTime(new Date(), 'Asia/Colombo');
    const logEntry = {
        productId,
        productName: product.name,
        date: Timestamp.fromDate(nowInSL),
        action,
        reason,
        quantity: action === 'decrement' ? quantity : null,
    };
    
    // 3. Perform the requested action
    if (action === 'decrement') {
        if (quantity === undefined || quantity <= 0) {
            return NextResponse.json({ error: "A positive quantity is required for decrement." }, { status: 400 });
        }
        if (product.stock < quantity) {
             return NextResponse.json({ error: "Adjustment quantity cannot be greater than current stock." }, { status: 400 });
        }
        await db.increment("products", productId, "stock", -quantity);
    } else if (action === 'delete') {
        await db.remove("products", productId);
    }

    // 4. Create the log entry in Firestore
    await db.create("stock_adjustment_logs", logEntry);
    
    return NextResponse.json({ success: true, message: `Action '${action}' performed on '${product.name}' and logged.` }, { status: 200 });
    
  } catch (err) {
    console.error("POST /api/products/adjust-stock error:", err);
    const message = err instanceof Error ? err.message : "Failed to perform stock adjustment.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
