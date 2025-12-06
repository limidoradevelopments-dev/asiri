// app/api/vehicles/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server/db";

/**
 * GET /api/vehicles
 * Returns array of vehicles
 */
export async function GET() {
  try {
    const vehicles = await db.getAll("vehicles");
    return NextResponse.json(vehicles, { status: 200 });
  } catch (err) {
    console.error("GET /api/vehicles error:", err);
    return NextResponse.json({ error: "Failed to fetch vehicles" }, { status: 500 });
  }
}

/**
 * POST /api/vehicles
 * Body: JSON vehicle object (without id)
 * Creates a vehicle and returns created object
 */
export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    if (!payload || typeof payload !== "object") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    if (!payload.numberPlate || typeof payload.numberPlate !== "string") {
      return NextResponse.json({ error: "`numberPlate` is required" }, { status: 400 });
    }

    const created = await db.create("vehicles", payload);
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("POST /api/vehicles error:", err);
    return NextResponse.json({ error: "Failed to create vehicle" }, { status: 500 });
  }
}
