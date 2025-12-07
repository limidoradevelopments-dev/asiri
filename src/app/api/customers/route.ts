// app/api/customers/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { z } from "zod";

const customerSchema = z.object({
  name: z.string().min(1, 'Full Name is required'),
  phone: z.string().min(1, 'Phone Number is required'),
  address: z.string().optional(),
  nic: z.string().optional(),
});


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
    const validation = customerSchema.safeParse(payload);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const created = await db.create("customers", validation.data);
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("POST /api/customers error:", err);
    return NextResponse.json({ error: "Failed to create customer" }, { status: 500 });
  }
}


/**
 * PUT /api/customers
 * Body: { id: string, ...customerData }
 * Updates an existing customer
 */
export async function PUT(req: NextRequest) {
  try {
    const payload = await req.json();
    const { id, ...data } = payload;

    if (!id) {
      return NextResponse.json({ error: "ID is required for update" }, { status: 400 });
    }

    const validation = customerSchema.safeParse(data);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const updated = await db.update("customers", id, validation.data);
    return NextResponse.json(updated, { status: 200 });

  } catch (err) {
    console.error("PUT /api/customers error:", err);
    return NextResponse.json({ error: "Failed to update customer" }, { status: 500 });
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
