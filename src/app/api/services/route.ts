'use server';
import { db } from "@/lib/server/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const services = await db.getAll('services');
    return NextResponse.json(services);
  } catch (error) {
    console.error('Failed to fetch services:', error);
    return NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 });
  }
}
