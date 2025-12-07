// src/app/api/customers-vehicles/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db';
import type { Customer, Vehicle } from '@/lib/data';
import { WithId } from '@/firebase';

export type CustomerWithVehicle = {
  customer: WithId<Customer>;
  vehicle: WithId<Vehicle>;
};

/**
 * GET /api/customers-vehicles
 * Returns an array of vehicles, each enriched with its customer's details.
 */
export async function GET(req: NextRequest) {
  try {
    const combinedData = await db.getAllCustomersWithVehicles();

    return NextResponse.json(combinedData, { status: 200 });

  } catch (err) {
    console.error('GET /api/customers-vehicles error:', err);
    return NextResponse.json({ error: 'Failed to fetch customer and vehicle data' }, { status: 500 });
  }
}
