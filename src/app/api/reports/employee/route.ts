// src/app/api/reports/employee/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import type { Invoice, Employee } from "@/lib/data";
import { startOfDay, endOfDay } from 'date-fns';
import { toZonedTime, formatInTimeZone } from "date-fns-tz";
import { WithId } from "@/firebase";

const SL_TIME_ZONE = "Asia/Colombo";

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
    const dateParam = url.searchParams.get("date"); // Expects YYYY-MM-DD

    if (!dateParam || !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      return NextResponse.json({ error: "Date parameter in YYYY-MM-DD format is required" }, { status: 400 });
    }

    const reportDateStr = dateParam;

    // Fetch all employees and all invoices
    const [allEmployees, allInvoices] = await Promise.all([
      db.getAll("employees") as Promise<WithId<Employee>[]>,
      db.getAll("invoices") as Promise<WithId<Invoice>[]>,
    ]);

    // Filter invoices for the selected day in SL timezone
    const dailyInvoices = allInvoices
      .filter(inv => {
        const invoiceDate = toMillis(inv.date);
        if (!invoiceDate) return false;
        // Convert invoice's UTC timestamp into a "YYYY-MM-DD" string in SL time
        const invoiceDateStr = formatInTimeZone(invoiceDate, SL_TIME_ZONE, 'yyyy-MM-dd');
        // Compare the generated string with the selected date string
        return invoiceDateStr === reportDateStr;
      })
      .map(inv => ({...inv, date: toMillis(inv.date)}));
      
    // Enrich invoices with customer and vehicle details for the preview dialog
    const enrichedDailyInvoices = await db.enrichInvoices(dailyInvoices);
    const invoiceMap = new Map(enrichedDailyInvoices.map(inv => [inv.id, inv]));


    // Group invoices by employee
    const jobsByEmployee = dailyInvoices.reduce((acc, invoice) => {
      const employeeId = invoice.employeeId;
      if (!acc[employeeId]) {
        acc[employeeId] = [];
      }
      acc[employeeId].push({
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
      });
      return acc;
    }, {} as Record<string, { invoiceId: string; invoiceNumber: string }[]>);

    // Format the final report
    const report = allEmployees.map(employee => {
      const jobs = jobsByEmployee[employee.id] || [];
      return {
        employeeId: employee.id,
        employeeName: employee.name,
        jobCount: jobs.length,
        jobs: jobs,
      };
    }).sort((a,b) => b.jobCount - a.jobCount); // Sort by most jobs first

    return NextResponse.json({ report, fullInvoices: Object.fromEntries(invoiceMap) }, { status: 200 });

  } catch (err: any) {
    console.error("GET /api/reports/employee error:", err);
    return NextResponse.json({ error: err.message || "Failed to generate employee report" }, { status: 500 });
  }
}
