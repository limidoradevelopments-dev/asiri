
// src/app/api/vehicles/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { initializeFirebase } from "@/firebase/server-init";
import { collection, query, where, getDocs, limit } from "firebase/firestore";

/**
 * GET /api/vehicles/search?query=<search_term>
 * Searches for vehicles by numberPlate
 */
export async function GET(req: NextRequest) {
  try {
    const { firestore } = initializeFirebase();
    const url = new URL(req.url);
    const searchQuery = url.searchParams.get("query");

    if (!searchQuery) {
      return NextResponse.json({ error: "Query parameter is required" }, { status: 400 });
    }

    const vehiclesRef = collection(firestore, "vehicles");
    
    // Create a query to find documents where numberPlate starts with the search query
    const q = query(
        vehiclesRef, 
        where('numberPlate', '>=', searchQuery.toUpperCase()),
        where('numberPlate', '<=', searchQuery.toUpperCase() + '\uf8ff'),
        limit(10) // Limit results for performance
    );

    const querySnapshot = await getDocs(q);
    const vehicles = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return NextResponse.json(vehicles, { status: 200 });

  } catch (err) {
    console.error("GET /api/vehicles/search error:", err);
    return NextResponse.json({ error: "Failed to search for vehicles" }, { status: 500 });
  }
}

    
