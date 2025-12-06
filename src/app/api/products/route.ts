// app/api/products/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server/db";

type Product = Record<string, any>;

/**
 * GET /api/products
 * Returns array of products
 */
export async function GET() {
  try {
    const products = await db.getAll("products");
    return NextResponse.json(products, { status: 200 });
  } catch (err) {
    console.error("GET /api/products error:", err);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

/**
 * POST /api/products
 * Body: JSON product object (without id)
 * Creates a product and returns created object
 */
export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    if (!payload || typeof payload !== "object") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    // Basic validation example: require `name`
    if (!payload.name || typeof payload.name !== "string") {
      return NextResponse.json({ error: "`name` is required" }, { status: 400 });
    }

    const created = await db.create("products", payload as Product);
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("POST /api/products error:", err);
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}

/**
 * PUT /api/products
 * Body: { id: string, ...fieldsToUpdate }
 * Updates an existing product (partial allowed)
 */
export async function PUT(req: NextRequest) {
  try {
    const payload = await req.json();
    if (!payload || typeof payload !== "object" || !payload.id) {
      return NextResponse.json({ error: "Invalid payload: id required" }, { status: 400 });
    }
    const { id, ...fields } = payload;
    if (Object.keys(fields).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const updated = await db.update("products", id, fields);
    return NextResponse.json(updated, { status: 200 });
  } catch (err) {
    console.error("PUT /api/products error:", err);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

/**
 * DELETE /api/products?id=<id>
 */
export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id query param required" }, { status: 400 });

    await db.remove("products", id);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("DELETE /api/products error:", err);
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}
