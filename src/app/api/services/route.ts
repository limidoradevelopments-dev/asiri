'use server';
import { collection, getDocs } from "firebase/firestore";
import { initializeFirebase } from "@/firebase/server-init";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { firestore } = initializeFirebase();
     if (!firestore) {
      throw new Error("Firestore is not initialized.");
    }
    const servicesCollection = collection(firestore, 'services');
    const snapshot = await getDocs(servicesCollection);
    const services = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json(services);
  } catch (error) {
    console.error('Failed to fetch services:', error);
    return NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 });
  }
}
