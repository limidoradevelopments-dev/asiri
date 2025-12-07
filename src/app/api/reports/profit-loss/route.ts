
// src/app/api/reports/profit-loss/route.ts
import { NextRequest, NextResponse } from "next/server";
import { initializeFirebase } from "@/firebase/server-init";
import { collection, getDocs, query, where, Timestamp } from "firebase/firestore";
import type { Invoice, Product } from "@/lib/data";

// Helper for safe rounding to avoid floating point issues
const safeRound = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100;

interface ExtendedInvoiceItem {
  itemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
  buyPrice?: number; // Historical cost if available
  discount: number;
}

interface ExtendedInvoice extends Omit<Invoice, 'items'> {
  items: ExtendedInvoiceItem[];
  status?: string; // e.g., 'paid', 'pending', 'cancelled'
}


export async function GET(req: NextRequest) {
  try {
    const { firestore } = initializeFirebase();
    const url = new URL(req.url);

    // --- 1. Get Query Parameters ---
    const startDateParam = url.searchParams.get("startDate");
    const endDateParam = url.searchParams.get("endDate");
    const productId = url.searchParams.get("productId");

    if (!startDateParam || !endDateParam) {
      return NextResponse.json({ error: "startDate and endDate are required" }, { status: 400 });
    }

    const startDate = Timestamp.fromMillis(Number(startDateParam));
    const endDate = Timestamp.fromMillis(Number(endDateParam));

    // --- 2. Fetch Data from Firestore ---
    const productsCollection = collection(firestore, 'products');
    const invoicesCollection = collection(firestore, 'invoices');

    const invoicesQuery = query(
      invoicesCollection,
      where('date', '>=', startDate),
      where('date', '<=', endDate)
    );

    const [productsSnapshot, invoicesSnapshot] = await Promise.all([
      getDocs(productsCollection),
      getDocs(invoicesQuery)
    ]);

    const products = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as (Product & { id: string })[];
    const rawInvoices = invoicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as (ExtendedInvoice & { id: string })[];


    // --- 3. Process Data ---
    const productMap = new Map(products.map(p => [p.id, p]));
    let processedItems: any[] = [];

    for (const invoice of rawInvoices) {
      // Ignore cancelled/refunded invoices
      if (invoice.status === 'cancelled' || invoice.status === 'refunded') continue;

      for (const item of invoice.items) {
        // Filter by specific product if selected
        if (productId && item.itemId !== productId) continue;
        
        const product = productMap.get(item.itemId);
        
        // This item is a service or custom job, not a product, so it has no COGS
        if (!product) continue;

        // Determine Cost Basis (historical > current > 0)
        let costPerUnit = item.buyPrice;
        let isEstimate = false;
        if (costPerUnit === undefined || costPerUnit === null) {
          costPerUnit = product.actualPrice ?? 0;
          isEstimate = true; // Flag that we used current cost
        }

        const quantity = item.quantity || 0;
        const costOfGoods = safeRound(quantity * costPerUnit);
        
        // Revenue for this line item already accounts for item-specific discounts
        const revenue = safeRound(item.total);
        const profit = safeRound(revenue - costOfGoods);
        
        // Margin Calculation
        const marginPercent = revenue !== 0 ? safeRound((profit / revenue) * 100) : 0;
        
        let invoiceDate = invoice.date;
        if (invoiceDate && typeof invoiceDate === 'object' && '_seconds' in invoiceDate) {
             invoiceDate = (invoiceDate as any)._seconds * 1000;
        }


        processedItems.push({
          id: `${invoice.id}-${item.itemId}`,
          invoiceNumber: invoice.invoiceNumber,
          date: invoiceDate,
          productName: item.name || product.name || 'Unknown Product',
          quantity,
          costOfGoods,
          revenue,
          profit,
          marginPercent,
          isEstimateCost: isEstimate
        });
      }
    }

    // --- 4. Calculate Summary ---
    const summary = processedItems.reduce((acc, item) => {
        acc.totalRevenue = safeRound(acc.totalRevenue + item.revenue);
        acc.totalCost = safeRound(acc.totalCost + item.costOfGoods);
        acc.totalProfit = safeRound(acc.totalProfit + item.profit);
        
        if (item.profit < 0) {
            acc.totalLoss = safeRound(acc.totalLoss + Math.abs(item.profit));
        }
        return acc;
    }, { totalRevenue: 0, totalCost: 0, totalProfit: 0, totalLoss: 0 });

    const finalSummary = {
        ...summary,
        netMargin: summary.totalRevenue > 0 
          ? safeRound((summary.totalProfit / summary.totalRevenue) * 100) 
          : 0
    };

    // --- 5. Return Response ---
    return NextResponse.json({ items: processedItems, summary: finalSummary }, { status: 200 });

  } catch (err: any) {
    console.error("GET /api/reports/profit-loss error:", err);
    return NextResponse.json({ error: err.message || "Failed to generate report" }, { status: 500 });
  }
}
