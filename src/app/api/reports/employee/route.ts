// src/app/api/reports/employee/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import type { Invoice, Employee } from "@/lib/data";
import { startOfDay, endOfDay, parseISO } from 'date-fns';
import { toZonedTime } from "date-fns-tz";
import { WithId } from "@/firebase";

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

    const reportDate = parseISO(dateParam);
    if (isNaN(reportDate.getTime())) {
        return NextResponse.json({ error: "Invalid date parameter format. Use YYYY-MM-DD." }, { status: 400 });
    }
    
    // We need to compare against dates stored in UTC, so we define the day's boundaries in UTC.
    const dayStart = startOfDay(reportDate);
    const dayEnd = endOfDay(reportDate);

    // Fetch all employees and all invoices
    const [allEmployees, allInvoices] = await Promise.all([
      db.getAll("employees") as Promise<WithId<Employee>[]>,
      db.getAll("invoices") as Promise<WithId<Invoice>[]>,
    ]);

    // Filter invoices for the selected day
    const dailyInvoices = allInvoices
      .map(inv => ({...inv, date: toMillis(inv.date)}))
      .filter(inv => inv.date >= dayStart.getTime() && inv.date <= dayEnd.getTime());
      
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
