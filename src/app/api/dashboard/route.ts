// src/app/api/dashboard/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import type { Invoice, Product, Customer, Vehicle } from "@/lib/data";
import { toZonedTime, formatInTimeZone } from 'date-fns-tz';
import { startOfDay, endOfDay, subDays } from 'date-fns';

const SL_TZ = "Asia/Colombo";

const formatCurrency = (amount: number) => {
     if (typeof amount !== 'number') return 'Rs. 0.00';
     return `Rs. ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Helper to safely convert Firestore Timestamp to a JS Date object
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

/**
 * GET /api/dashboard
 * Returns all processed data required for the main dashboard.
 */
export async function GET() {
  try {
    const [invoicesData, productsData, customersData, vehiclesData] = await Promise.all([
      db.getAll("invoices"),
      db.getAll("products"),
      db.getAll("customers"),
      db.getAll("vehicles")
    ]);

    const invoices = invoicesData as (Invoice & { id: string })[];
    const products = productsData as (Product & { id: string })[];
    const customers = customersData as (Customer & { id: string })[];
    const vehicles = vehiclesData as (Vehicle & { id: string })[];
    
    // --- Calculations ---
    const now = new Date(); // Current time is UTC on the server
    
    // Convert Firestore timestamps to JS Date objects for all invoices
    const processedInvoices = invoices.map(inv => {
        const invoiceDate = toDate(inv.date);
        return {
            ...inv,
            date: invoiceDate, // Now a Date object
            dateMillis: invoiceDate?.getTime() || 0 // Keep millis for sorting if needed
        };
    }).filter(inv => inv.date !== null); // Filter out any invoices with invalid dates
    
    const totalRevenue = processedInvoices.reduce((acc, inv) => acc + inv.amountPaid, 0);
    
    // To calculate "Today's Revenue", we need to define "today" in SL time
    const todayStartInSL = startOfDay(toZonedTime(now, SL_TZ));
    const todayEndInSL = endOfDay(toZonedTime(now, SL_TZ));

    const todaysRevenue = processedInvoices
      .filter(inv => {
        // Convert the invoice's UTC date to SL time for comparison
        const invoiceDateInSL = toZonedTime(inv.date!, SL_TZ);
        return invoiceDateInSL >= todayStartInSL && invoiceDateInSL <= todayEndInSL;
      })
      .reduce((acc, inv) => acc + inv.amountPaid, 0);

    const lowStockItems = products.filter(p => p.stock <= p.stockThreshold);
    
    const totalCustomers = new Set(vehicles.map(v => v.customerId)).size;

    const stats = [
      { title: "Total Revenue", value: formatCurrency(totalRevenue), icon: "DollarSign" },
      { title: "Today's Revenue", value: formatCurrency(todaysRevenue), icon: "DollarSign" },
      { title: "Low Stock Items", value: lowStockItems.length.toString(), icon: "Archive" },
      { title: "Total Customers", value: totalCustomers.toString(), icon: "Users" },
    ];

    const revenueByDay = Array.from({ length: 7 }, (_, i) => {
        const dateInUTC = subDays(now, i);
        
        // Define start and end of day in SL time for each of the last 7 days
        const dayStartInSL = startOfDay(toZonedTime(dateInUTC, SL_TZ));
        const dayEndInSL = endOfDay(toZonedTime(dateInUTC, SL_TZ));

        const dailyRevenue = processedInvoices
            .filter(inv => {
              // Convert each invoice's UTC date to SL time for comparison
              const invoiceDateInSL = toZonedTime(inv.date!, SL_TZ);
              return invoiceDateInSL >= dayStartInSL && invoiceDateInSL <= dayEndInSL;
            })
            .reduce((sum, inv) => sum + inv.total, 0);
        
        return {
            date: formatInTimeZone(dayStartInSL, SL_TZ, "MMM d"), // Format the date based on SL timezone
            revenue: dailyRevenue
        };
    }).reverse();

    const customerMap = new Map(customers.map(c => [c.id, c]));
    
    const recentInvoices = processedInvoices
      .sort((a, b) => b.dateMillis - a.dateMillis)
      .slice(0, 5)
      .map(inv => {
        const customer = customerMap.get(inv.customerId);
        return {
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          customerName: customer?.name || 'Unknown Customer',
          date: inv.dateMillis, // Pass the UTC timestamp to the client
          total: inv.total,
          paymentStatus: inv.paymentStatus,
        };
      });

    const lowStockForComponent = lowStockItems.map(item => ({...item, threshold: item.stockThreshold }))


    const responsePayload = {
      stats,
      revenueData: revenueByDay,
      lowStockItems: lowStockForComponent,
      recentInvoices,
    };

    return NextResponse.json(responsePayload, { status: 200 });
  } catch (err) {
    console.error("GET /api/dashboard error:", err);
    const message = err instanceof Error ? err.message : "Failed to fetch dashboard data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
