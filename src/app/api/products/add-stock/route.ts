
// app/api/products/add-stock/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/server/db";

const addStockSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  quantity: z.number().int().gt(0, "Quantity must be a positive integer"),
});

/**
 * POST /api/products/add-stock
 * Body: { productId: string, quantity: number }
 * Atomically increments the stock of a product.
 */
export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const validation = addStockSchema.safeParse(payload);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.flatten().fieldErrors }, { status: 400 });
    }
    
    const { productId, quantity } = validation.data;

    // First check if product exists
    const product = await db.getOne("products", productId);
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Use atomic increment
    await db.increment("products", productId, "stock", quantity);
    
    // Return the new state of the product
    const updatedProduct = await db.getOne("products", productId);

    return NextResponse.json(updatedProduct, { status: 200 });
  } catch (err) {
    console.error("POST /api/products/add-stock error:", err);
    return NextResponse.json({ error: "Failed to update stock" }, { status: 500 });
  }
}
