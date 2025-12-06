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
    const productsCollection = collection(firestore, 'products');
    const snapshot = await getDocs(productsCollection);
    const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json(products);
  } catch (error) {
    console.error('Failed to fetch products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}
