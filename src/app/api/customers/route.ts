// app/api/customers/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server/db";

/**
 * GET /api/customers
 * Returns array of customers
 */
export async function GET() {
  try {
    const customers = await db.getAll("customers");
    return NextResponse.json(customers, { status: 200 });
  } catch (err) {
    console.error("GET /api/customers error:", err);
    return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 });
  }
}

/**
 * POST /api/customers
 * Body: JSON customer object (without id)
 * Creates a customer and returns created object
 */
export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    if (!payload || typeof payload !== "object") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    if (!payload.name || typeof payload.name !== "string") {
      return NextResponse.json({ error: "`name` is required" }, { status: 400 });
    }

    const created = await db.create("customers", payload);
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("POST /api/customers error:", err);
    return NextResponse.json({ error: "Failed to create customer" }, { status: 500 });
  }
}

/**
 * DELETE /api/customers?id=<id>
 * Deletes a customer by their ID.
 */
export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id query param required" }, { status: 400 });
    }

    await db.remove("customers", id);
    return NextResponse.json({ success: true, id }, { status: 200 });

  } catch (err) {
    console.error("DELETE /api/customers error:", err);
    return NextResponse.json({ error: "Failed to delete customer" }, { status: 500 });
  }
}
