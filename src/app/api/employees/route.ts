
// app/api/employees/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { z } from "zod";

const employeeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  address: z.string().min(1, 'Address is required'),
  mobile: z.string().min(1, 'Mobile number is required'),
  notes: z.string().optional(),
});


/**
 * GET /api/employees
 * Returns array of employees
 */
export async function GET() {
  try {
    const employees = await db.getAll("employees");
    return NextResponse.json(employees, { status: 200 });
  } catch (err) {
    console.error("GET /api/employees error:", err);
    return NextResponse.json({ error: "Failed to fetch employees" }, { status: 500 });
  }
}

/**
 * POST /api/employees
 * Creates a new employee
 */
export async function POST(req: NextRequest) {
    try {
        const payload = await req.json();
        const validation = employeeSchema.safeParse(payload);
        if (!validation.success) {
            return NextResponse.json({ error: validation.error.flatten().fieldErrors }, { status: 400 });
        }
        
        const created = await db.create("employees", validation.data);
        return NextResponse.json(created, { status: 201 });

    } catch (err) {
        console.error("POST /api/employees error:", err);
        return NextResponse.json({ error: "Failed to create employee" }, { status: 500 });
    }
}

/**
 * PUT /api/employees
 * Updates an existing employee
 */
export async function PUT(req: NextRequest) {
    try {
        const payload = await req.json();
        const { id, ...data } = payload;
        
        if (!id) {
            return NextResponse.json({ error: "ID is required for update" }, { status: 400 });
        }

        const validation = employeeSchema.safeParse(data);
         if (!validation.success) {
            return NextResponse.json({ error: validation.error.flatten().fieldErrors }, { status: 400 });
        }

        const updated = await db.update("employees", id, validation.data);
        return NextResponse.json(updated, { status: 200 });

    } catch (err) {
        console.error("PUT /api/employees error:", err);
        return NextResponse.json({ error: "Failed to update employee" }, { status: 500 });
    }
}

/**
 * DELETE /api/employees?id=<id>
 * Deletes an employee
 */
export async function DELETE(req: NextRequest) {
    try {
        const url = new URL(req.url);
        const id = url.searchParams.get("id");
        if (!id) {
            return NextResponse.json({ error: "id query param required" }, { status: 400 });
        }

        await db.remove("employees", id);
        return NextResponse.json({ success: true }, { status: 200 });

    } catch (err) {
        console.error("DELETE /api/employees error:", err);
        return NextResponse.json({ error: "Failed to delete employee" }, { status: 500 });
    }
}

