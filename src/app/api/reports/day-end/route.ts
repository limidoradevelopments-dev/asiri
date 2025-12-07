
// src/app/api/reports/day-end/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import type { Invoice, Payment, Product } from "@/lib/data";
import { startOfDay, endOfDay } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

const safeRound = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100;

// Helper to safely convert Firestore Timestamp to JS Date object
const toDate = (timestamp: any): Date | null => {
  if (!timestamp) return null;
  if (timestamp instanceof Date) return timestamp;
  if (typeof timestamp.toDate === 'function') { // Firestore Timestamp object
    return timestamp.toDate();
  }
  if (typeof timestamp === 'number') { // Millisecond timestamp
    return new Date(timestamp);
  }
  return null;
};


export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const dateParam = url.searchParams.get("date");
    const TIME_ZONE = 'Asia/Colombo';

    if (!dateParam) {
      return NextResponse.json({ error: "Date parameter is required" }, { status: 400 });
    }

    const reportDate = fromZonedTime(dateParam, TIME_ZONE);
    
    if (isNaN(reportDate.getTime())) {
        return NextResponse.json({ error: "Invalid date parameter format. Use YYYY-MM-DD." }, { status: 400 });
    }
    
    const dayStartInSL = startOfDay(reportDate);
    const dayEndInSL = endOfDay(reportDate);

    // Fetch all data needed
    const [allInvoicesData, allProducts] = await Promise.all([
      db.getAll("invoices") as Promise<(Invoice & {id: string})[]>,
      db.getAll("products") as Promise<(Product & {id: string})[]>,
    ]);

    const productMap = new Map(allProducts.map(p => [p.id, p]));

    // Correctly filter invoices by comparing their dates within the Sri Lankan timezone
    const dailyInvoices = allInvoicesData
      .map(inv => ({...inv, date: toDate(inv.date)})) // Convert Firestore Timestamps to JS Dates
      .filter(inv => {
          if (!inv.date) return false;
          // Convert each invoice's UTC date to a SL date for comparison
          const invoiceDateInSL = toZonedTime(inv.date, TIME_ZONE);
          return invoiceDateInSL >= dayStartInSL && invoiceDateInSL <= dayEndInSL;
      });

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

    const paymentSummary: Record<string, number> = { Cash: 0, Card: 0, Cheque: 0 };
    for (const invoice of dailyInvoices) {
      for (const payment of invoice.payments) {
        paymentSummary[payment.method] = safeRound((paymentSummary[payment.method] || 0) + payment.amount);
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
