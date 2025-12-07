// app/api/services/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { Timestamp } from "firebase/firestore";

type Service = Record<string, any>;

export async function GET() {
  try {
    const services = await db.getAll("services");
    return NextResponse.json(services, { status: 200 });
  } catch (err) {
    console.error("GET /api/services error:", err);
    return NextResponse.json({ error: "Failed to fetch services" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    if (!payload || typeof payload !== "object") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    if (!payload.name || typeof payload.name !== "string") {
      return NextResponse.json({ error: "`name` is required" }, { status: 400 });
    }

    const nowTimestamp = Timestamp.now();

    const dataToCreate = {
      ...payload,
      createdAt: nowTimestamp,
      updatedAt: nowTimestamp,
    };

    const created = await db.create("services", dataToCreate as Service);
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("POST /api/services error:", err);
    return NextResponse.json({ error: "Failed to create service" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const payload = await req.json();
    if (!payload || typeof payload !== "object" || !payload.id) {
      return NextResponse.json({ error: "Invalid payload: id required" }, { status: 400 });
    }
    const { id, ...fields } = payload;
    if (Object.keys(fields).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const nowTimestamp = Timestamp.now();

    const dataToUpdate = {
      ...fields,
      updatedAt: nowTimestamp,
    };

    const updated = await db.update("services", id, dataToUpdate);
    return NextResponse.json(updated, { status: 200 });
  } catch (err) {
    console.error("PUT /api/services error:", err);
    return NextResponse.json({ error: "Failed to update service" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id query param required" }, { status: 400 });

    await db.remove("services", id);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("DELETE /api/services error:", err);
    return NextResponse.json({ error: "Failed to delete service" }, { status: 500 });
  }
}
