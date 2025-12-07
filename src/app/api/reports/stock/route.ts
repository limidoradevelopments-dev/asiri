// src/app/api/reports/stock/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import type { Invoice, Product, StockAdjustmentLog } from "@/lib/data";
import { startOfDay, endOfDay, parseISO } from 'date-fns';
import { toZonedTime } from "date-fns-tz";

const SL_TIME_ZONE = "Asia/Colombo";

const toDate = (timestamp: any): Date | null => {
  if (!timestamp) return null;
  if (timestamp instanceof Date) return timestamp;
  if (typeof timestamp.toDate === 'function') return timestamp.toDate();
  if (typeof timestamp === 'number') return new Date(timestamp);
  return null;
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
    const url = new URL(req.url);
    const startDateParam = url.searchParams.get("startDate");
    const endDateParam = url.searchParams.get("endDate");

    if (!startDateParam || !endDateParam) {
      return NextResponse.json({ error: "startDate and endDate are required" }, { status: 400 });
    }
    
    // Correctly parse dates from frontend
    const startDate = parseISO(startDateParam);
    const endDate = parseISO(endDateParam);

    // Define the date range in the correct timezone
    const rangeStart = startOfDay(toZonedTime(startDate, SL_TIME_ZONE));
    const rangeEnd = endOfDay(toZonedTime(endDate, SL_TIME_ZONE));

    const transactions: StockTransaction[] = [];

    // --- Step 1: Fetch all products, invoices, and logs ---
    const [productsSnapshot, invoicesSnapshot, adjustmentsSnapshot] = await Promise.all([
        db.getAll("products"),
        db.getAll("invoices"),
        db.getAll("stock_adjustment_logs"),
    ]);

    const productIds = new Set(productsSnapshot.map(doc => doc.id));

    // --- Step 2: Process Sales from Invoices ---
    invoicesSnapshot.forEach(doc => {
      const invoice = doc as Invoice;
      const invoiceDate = toDate(invoice.date);
      if (!invoiceDate) return;

      const invoiceDateInSL = toZonedTime(invoiceDate, SL_TIME_ZONE);

      if (invoiceDateInSL >= rangeStart && invoiceDateInSL <= rangeEnd) {
          invoice.items.forEach(item => {
            if (productIds.has(item.itemId)) {
              transactions.push({
                date: invoiceDate.getTime(),
                productName: item.name,
                type: 'Sale',
                quantityChange: -item.quantity,
                reason: null,
                reference: invoice.invoiceNumber,
              });
            }
          });
      }
    });

    // --- Step 3: Process Manual Adjustments ---
    adjustmentsSnapshot.forEach(doc => {
      const log = doc as StockAdjustmentLog;
      const logDate = toDate(log.date);
       if (!logDate) return;

      const logDateInSL = toZonedTime(logDate, SL_TIME_ZONE);

      if (logDateInSL >= rangeStart && logDateInSL <= rangeEnd) {
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
              quantityChange = 0;
              break;
            default:
              return;
          }

          transactions.push({
            date: logDate.getTime(),
            productName: log.productName,
            type,
            quantityChange,
            reason: log.reason,
            reference: log.action === 'add' ? 'Stock Added' : 'Manual Action',
          });
      }
    });

    // --- Step 4: Sort all transactions by date (most recent first) ---
    transactions.sort((a, b) => b.date - a.date);

    return NextResponse.json(transactions, { status: 200 });

  } catch (err: any) {
    console.error("GET /api/reports/stock error:", err);
    return NextResponse.json({ error: err.message || "Failed to generate stock report" }, { status: 500 });
  }
}
