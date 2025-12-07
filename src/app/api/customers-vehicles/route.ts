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
    const [vehicles, customers] = await Promise.all([
      db.getAll('vehicles'),
      db.getAll('customers'),
    ]);

    const customerMap = new Map(customers.map(c => [c.id, c as WithId<Customer>]));

    const combinedData: CustomerWithVehicle[] = vehicles
      .map(vehicle => {
        const customer = customerMap.get(vehicle.customerId);
        // Only include vehicles that have a valid, linked customer
        return customer ? { customer, vehicle: vehicle as WithId<Vehicle> } : null;
      })
      .filter((item): item is CustomerWithVehicle => item !== null)
      .sort((a, b) => a.customer.name.localeCompare(b.customer.name)); // Sort by customer name for consistent order

    return NextResponse.json(combinedData, { status: 200 });

  } catch (err) {
    console.error('GET /api/customers-vehicles error:', err);
    return NextResponse.json({ error: 'Failed to fetch customer and vehicle data' }, { status: 500 });
  }
}
