// app/api/employees/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server/db";

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
