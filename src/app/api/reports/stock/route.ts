
// src/app/api/reports/stock/route.ts
import { NextRequest, NextResponse } from "next/server";
import { initializeFirebase } from "@/firebase/server-init";
import { collection, getDocs, query, where, Timestamp } from "firebase/firestore";
import type { Invoice, Product } from "@/lib/data";

// Helper to safely convert Firestore Timestamp to number
const toMillis = (timestamp: any): number => {
  if (!timestamp) return 0;
  if (typeof timestamp === 'number') return timestamp;
  if (timestamp.toDate) return timestamp.toDate().getTime(); // For Timestamps from server
  if (timestamp.seconds) return timestamp.seconds * 1000; // For Timestamps from client
  return 0;
};

export type StockTransaction = {
    date: number;
    productName: string;
    type: 'Sale' | 'Manual Adjustment' | 'Stock Addition' | 'Deletion';
    quantityChange: number;
    reason: string | null;
    reference: string; // e.g., Invoice Number or 'Manual Action'
};

export async function GET(req: NextRequest) {
  try {
    const { firestore } = initializeFirebase();
    const url = new URL(req.url);

    const startDateParam = url.searchParams.get("startDate");
    const endDateParam = url.searchParams.get("endDate");

    if (!startDateParam || !endDateParam) {
      return NextResponse.json({ error: "startDate and endDate are required" }, { status: 400 });
    }

    const startDate = Timestamp.fromMillis(Number(startDateParam));
    const endDate = Timestamp.fromMillis(Number(endDateParam));

    const transactions: StockTransaction[] = [];

    // --- Step 1: Fetch all products to distinguish from services ---
    const productsSnapshot = await getDocs(collection(firestore, 'products'));
    const productIds = new Set(productsSnapshot.docs.map(doc => doc.id));


    // --- Step 2: Fetch Sales from Invoices ---
    const invoicesQuery = query(
      collection(firestore, 'invoices'),
      where('date', '>=', startDate),
      where('date', '<=', endDate)
    );
    const invoicesSnapshot = await getDocs(invoicesQuery);
    
    invoicesSnapshot.forEach(doc => {
      const invoice = doc.data() as Invoice;
      invoice.items.forEach(item => {
        // Only log transactions for items that are actual products
        if (productIds.has(item.itemId)) {
          transactions.push({
            date: toMillis(invoice.date),
            productName: item.name,
            type: 'Sale',
            quantityChange: -item.quantity,
            reason: null,
            reference: invoice.invoiceNumber,
          });
        }
      });
    });


    // --- Step 3: Fetch Manual Adjustments, Additions, and Deletions ---
    const adjustmentsQuery = query(
      collection(firestore, 'stock_adjustment_logs'),
      where('date', '>=', startDate),
      where('date', '<=', endDate)
    );
    const adjustmentsSnapshot = await getDocs(adjustmentsQuery);
    adjustmentsSnapshot.forEach(doc => {
      const log = doc.data();
      let type: StockTransaction['type'];
      let quantityChange: number;

      switch(log.action) {
        case 'add':
          type = 'Stock Addition';
          quantityChange = log.quantity;
          break;
        case 'decrement':
          type = 'Manual Adjustment';
          quantityChange = -log.quantity;
          break;
        case 'delete':
          type = 'Deletion';
          quantityChange = 0; // The quantity is effectively nullified
          break;
        default:
          return; // Skip unknown actions
      }

      transactions.push({
        date: toMillis(log.date),
        productName: log.productName,
        type,
        quantityChange,
        reason: log.reason,
        reference: log.action === 'add' ? 'Stock Added' : 'Manual Action',
      });
    });

    // --- Step 4: Sort all transactions by date (most recent first) ---
    transactions.sort((a, b) => b.date - a.date);

    return NextResponse.json(transactions, { status: 200 });

  } catch (err: any) {
    console.error("GET /api/reports/stock error:", err);
    return NextResponse.json({ error: err.message || "Failed to generate stock report" }, { status: 500 });
  }
}
