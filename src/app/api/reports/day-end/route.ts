
// src/app/api/reports/day-end/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import type { Invoice, Payment, Product } from "@/lib/data";
import { startOfDay, endOfDay } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const SL_TIME_ZONE = 'Asia/Colombo';

const safeRound = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100;

// Helper to safely convert Firestore Timestamp/number to a JS Date object
const toDate = (timestamp: any): Date | null => {
  if (!timestamp) return null;
  if (timestamp instanceof Date) return timestamp;
  if (typeof timestamp.toDate === 'function') { // Firestore Timestamp object
    return timestamp.toDate();
  }
  if (typeof timestamp === 'number') { // Millisecond timestamp
    return new Date(timestamp);
  }
  return null; // Return null for invalid or missing timestamps
};


export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const dateParam = url.searchParams.get("date");

    if (!dateParam) {
      return NextResponse.json({ error: "Date parameter is required" }, { status: 400 });
    }
    
    // The date string from the frontend (e.g., "2024-12-08")
    const reportDateStr = dateParam;
    
    // Create a date object representing the start of that day in the target timezone
    // IMPORTANT: new Date("YYYY-MM-DD") creates a UTC date. We need to treat it as local.
    const zonedDateForReport = toZonedTime(new Date(reportDateStr), SL_TIME_ZONE);

    // Get the start and end of that day IN THE TARGET TIMEZONE
    const dayStart = startOfDay(zonedDateForReport);
    const dayEnd = endOfDay(zonedDateForReport);

    // Fetch all data needed
    const [allInvoicesData, allProducts] = await Promise.all([
      db.getAll("invoices") as Promise<(Invoice & {id: string})[]>,
      db.getAll("products") as Promise<(Product & {id: string})[]>,
    ]);

    const productMap = new Map(allProducts.map(p => [p.id, p]));

    // Filter invoices by checking if their UTC timestamp falls within the SL day's boundaries
    const dailyInvoices = allInvoicesData
      .map(inv => ({...inv, date: toDate(inv.date)})) // Convert Firestore Timestamps to JS Date objects
      .filter(inv => {
          if (!inv.date) return false;
          // The invoice date is in UTC.
          // We check if this UTC time falls between the start and end of the day in SL time.
          return inv.date >= dayStart && inv.date <= dayEnd;
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
      date: dayStart.toISOString(), // Send back a consistent UTC date for the report
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
