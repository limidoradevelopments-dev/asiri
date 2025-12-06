// app/api/vehicles/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { initializeFirebase } from "@/firebase/server-init";
import { collection, getDocs, query, where } from "firebase/firestore";

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
    
    // --- UNIQUENESS CHECK ---
    const { firestore } = initializeFirebase();
    const vehiclesRef = collection(firestore, "vehicles");
    const q = query(vehiclesRef, where("numberPlate", "==", payload.numberPlate.toUpperCase()));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
        return NextResponse.json({ error: "A vehicle with this number plate already exists." }, { status: 409 });
    }

    // Ensure numberPlate is stored in uppercase for consistent searching
    const dataToCreate = {
        ...payload,
        numberPlate: payload.numberPlate.toUpperCase(),
    }

    const created = await db.create("vehicles", dataToCreate);
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("POST /api/vehicles error:", err);
    return NextResponse.json({ error: "Failed to create vehicle" }, { status: 500 });
  }
}
