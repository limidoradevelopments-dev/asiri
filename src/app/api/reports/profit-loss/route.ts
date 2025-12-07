// src/app/api/reports/profit-loss/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import type { Invoice, Product } from "@/lib/data";
import { toZonedTime } from 'date-fns-tz';
import { startOfDay, endOfDay, parseISO } from 'date-fns';

const SL_TZ = "Asia/Colombo";

const safeRound = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100;

const toDate = (timestamp: any): Date | null => {
  if (!timestamp) return null;
  if (timestamp instanceof Date) return timestamp;
  if (typeof timestamp.toDate === 'function') return timestamp.toDate();
  if (typeof timestamp === 'number') return new Date(timestamp);
  return null;
};

interface ExtendedInvoiceItem {
  itemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
  buyPrice?: number;
  discount: number;
}

interface ExtendedInvoice extends Omit<Invoice, 'items'> {
  items: ExtendedInvoiceItem[];
  status?: string;
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const startDateParam = url.searchParams.get("startDate");
    const endDateParam = url.searchParams.get("endDate");
    const productId = url.searchParams.get("productId");

    if (!startDateParam || !endDateParam) {
      return NextResponse.json({ error: "startDate and endDate are required" }, { status: 400 });
    }

    const [allProducts, allInvoices] = await Promise.all([
        db.getAll("products") as Promise<(Product & { id: string })[]>,
        db.getAll("invoices") as Promise<(ExtendedInvoice & { id: string })[]>
    ]);

    const startDate = parseISO(startDateParam);
    const endDate = parseISO(endDateParam);
    
    // Define the date range in the correct timezone
    const rangeStart = startOfDay(toZonedTime(startDate, SL_TZ));
    const rangeEnd = endOfDay(toZonedTime(endDate, SL_TZ));

    const processedInvoices = allInvoices.map(inv => ({
        ...inv,
        date: toDate(inv.date)
    })).filter(inv => {
        if (!inv.date) return false;
        const invoiceDateInSL = toZonedTime(inv.date, SL_TZ);
        return invoiceDateInSL >= rangeStart && invoiceDateInSL <= rangeEnd;
    });

    const productMap = new Map(allProducts.map(p => [p.id, p]));
    let processedItems: any[] = [];

    for (const invoice of processedInvoices) {
      if (invoice.status === 'cancelled' || invoice.status === 'refunded') continue;

      for (const item of invoice.items) {
        if (productId && item.itemId !== productId) continue;
        
        const product = productMap.get(item.itemId);
        if (!product) continue;

        let costPerUnit = item.buyPrice ?? product.actualPrice ?? 0;
        const isEstimate = item.buyPrice === undefined;
        
        const quantity = item.quantity || 0;
        const costOfGoods = safeRound(quantity * costPerUnit);
        const revenue = safeRound(item.total);
        const profit = safeRound(revenue - costOfGoods);
        const marginPercent = revenue !== 0 ? safeRound((profit / revenue) * 100) : 0;
        
        processedItems.push({
          id: `${invoice.id}-${item.itemId}`,
          invoiceNumber: invoice.invoiceNumber,
          date: invoice.date!.getTime(),
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

    return NextResponse.json({ items: processedItems, summary: finalSummary }, { status: 200 });

  } catch (err: any) {
    console.error("GET /api/reports/profit-loss error:", err);
    return NextResponse.json({ error: err.message || "Failed to generate report" }, { status: 500 });
  }
}
