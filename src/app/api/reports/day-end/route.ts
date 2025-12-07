
// src/app/api/reports/day-end/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import type { Invoice, Payment, Product } from "@/lib/data";
import { startOfDay, endOfDay, parseISO } from 'date-fns';

const safeRound = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100;

// Helper to safely convert Firestore Timestamp to number
const toMillis = (timestamp: any): number => {
  if (typeof timestamp === 'number') return timestamp;
  if (timestamp && typeof timestamp.toMillis === 'function') {
    return timestamp.toMillis();
  }
  return 0;
};


export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const dateParam = url.searchParams.get("date");

    if (!dateParam) {
      return NextResponse.json({ error: "Date parameter is required" }, { status: 400 });
    }

    // Use parseISO to correctly interpret the 'YYYY-MM-DD' string
    // This is more robust than relying on new Date(dateParam)
    const reportDate = parseISO(dateParam);
    if (isNaN(reportDate.getTime())) {
        return NextResponse.json({ error: "Invalid date parameter format. Use YYYY-MM-DD." }, { status: 400 });
    }
    
    const dayStart = startOfDay(reportDate);
    const dayEnd = endOfDay(reportDate);

    // Fetch all data needed
    const [allInvoices, allProducts] = await Promise.all([
      db.getAll("invoices") as Promise<(Invoice & {id: string})[]>,
      db.getAll("products") as Promise<(Product & {id: string})[]>,
    ]);

    const productMap = new Map(allProducts.map(p => [p.id, p]));

    const dailyInvoices = allInvoices
      .map(inv => ({...inv, date: toMillis(inv.date)}))
      .filter(inv => inv.date >= dayStart.getTime() && inv.date <= dayEnd.getTime());

    // --- Calculations ---

    const totalRevenue = dailyInvoices.reduce((acc, inv) => acc + inv.total, 0);
    const totalInvoices = dailyInvoices.length;
    const totalCashReceived = dailyInvoices.reduce((acc, inv) => acc + inv.amountPaid, 0);
    const totalOutstanding = dailyInvoices.reduce((acc, inv) => acc + inv.balanceDue, 0);

    let totalCogs = 0;
    const productsSold: Record<string, { name: string, quantity: number, revenue: number }> = {};
    const servicesRendered: Record<string, { name: string, quantity: number, revenue: number }> = {};

    for (const invoice of dailyInvoices) {
      for (const item of invoice.items) {
        const product = productMap.get(item.itemId);
        
        if (product) { // It's a product
          totalCogs += (product.actualPrice || 0) * item.quantity;
          if (!productsSold[item.itemId]) {
            productsSold[item.itemId] = { name: item.name, quantity: 0, revenue: 0 };
          }
          productsSold[item.itemId].quantity += item.quantity;
          productsSold[item.itemId].revenue += item.total;
        } else { // It's a service or custom item
          if (!servicesRendered[item.itemId]) {
            servicesRendered[item.itemId] = { name: item.name, quantity: 0, revenue: 0 };
          }
          servicesRendered[item.itemId].quantity += item.quantity;
          servicesRendered[item.itemId].revenue += item.total;
        }
      }
    }

    const netProfit = safeRound(totalRevenue - totalCogs);

    const paymentSummary: Record<string, number> = { Cash: 0, Card: 0, Check: 0 };
    for (const invoice of dailyInvoices) {
      for (const payment of invoice.payments) {
        paymentSummary[payment.method] = safeRound(paymentSummary[payment.method] + payment.amount);
      }
    }

    const responsePayload = {
      date: reportDate.toISOString(),
      summary: {
        totalRevenue: safeRound(totalRevenue),
        netProfit,
        totalInvoices,
        totalCogs: safeRound(totalCogs),
        totalCashReceived: safeRound(totalCashReceived),
        totalOutstanding: safeRound(totalOutstanding),
      },
      breakdowns: {
        products: Object.values(productsSold).sort((a,b) => b.revenue - a.revenue),
        services: Object.values(servicesRendered).sort((a,b) => b.revenue - a.revenue),
        payments: paymentSummary
      }
    };

    return NextResponse.json(responsePayload, { status: 200 });

  } catch (err: any) {
    console.error("GET /api/reports/day-end error:", err);
    return NextResponse.json({ error: err.message || "Failed to generate day-end report" }, { status: 500 });
  }
}
