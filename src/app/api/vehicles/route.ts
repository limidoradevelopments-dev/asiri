// app/api/vehicles/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { initializeFirebase } from "@/firebase/server-init";
import { collection, getDocs, query, where } from "firebase/firestore";
import { z } from "zod";

const vehicleSchema = z.object({
  customerId: z.string().min(1),
  numberPlate: z.string().min(1, 'Vehicle Number is required'),
  make: z.string().min(1, 'Make is required'),
  model: z.string().min(1, 'Model is required'),
  year: z.coerce.number().int().min(1900, 'Invalid year').max(new Date().getFullYear() + 1, 'Invalid year'),
  mileage: z.coerce.number().int().min(0, "Mileage must be a positive number.").optional(),
  fuelType: z.enum(['Petrol', 'Diesel', 'Hybrid', 'EV']).optional(),
  transmission: z.enum(['Auto', 'Manual']).optional(),
});


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
    const validation = vehicleSchema.safeParse(payload);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.flatten().fieldErrors }, { status: 400 });
    }
    
    // --- UNIQUENESS CHECK ---
    const { firestore } = initializeFirebase();
    const vehiclesRef = collection(firestore, "vehicles");
    const q = query(vehiclesRef, where("numberPlate", "==", validation.data.numberPlate.toUpperCase()));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
        return NextResponse.json({ error: "A vehicle with this number plate already exists." }, { status: 409 });
    }

    // Ensure numberPlate is stored in uppercase for consistent searching
    const dataToCreate = {
        ...validation.data,
        numberPlate: validation.data.numberPlate.toUpperCase(),
    }

    const created = await db.create("vehicles", dataToCreate);
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("POST /api/vehicles error:", err);
    return NextResponse.json({ error: "Failed to create vehicle" }, { status: 500 });
  }
}

/**
 * PUT /api/vehicles
 * Updates an existing vehicle
 */
export async function PUT(req: NextRequest) {
    try {
        const payload = await req.json();
        const { id, ...data } = payload;
        
        if (!id) {
            return NextResponse.json({ error: "ID is required for update" }, { status: 400 });
        }

        // We use .partial() here because not all fields are sent for update
        const validation = vehicleSchema.partial().safeParse(data);
         if (!validation.success) {
            return NextResponse.json({ error: validation.error.flatten().fieldErrors }, { status: 400 });
        }

        const dataToUpdate = {
            ...validation.data,
        };
        if(dataToUpdate.numberPlate) {
            dataToUpdate.numberPlate = dataToUpdate.numberPlate.toUpperCase();
        }

        const updated = await db.update("vehicles", id, dataToUpdate);
        return NextResponse.json(updated, { status: 200 });

    } catch (err) {
        console.error("PUT /api/vehicles error:", err);
        return NextResponse.json({ error: "Failed to update vehicle" }, { status: 500 });
    }
}


/**
 * DELETE /api/vehicles?id=<id>
 * Deletes a vehicle by its ID.
 */
export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id query param required" }, { status: 400 });
    }

    await db.remove("vehicles", id);
    return NextResponse.json({ success: true, id }, { status: 200 });

  } catch (err) {
    console.error("DELETE /api/vehicles error:", err);
    return NextResponse.json({ error: "Failed to delete vehicle" }, { status: 500 });
  }
}
