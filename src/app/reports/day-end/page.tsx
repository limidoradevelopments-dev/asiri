'use client';

import { useState, useEffect, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

import StatCard from '@/components/dashboard/StatCard';
import { DollarSign, TrendingUp, Hash, Printer, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// --- Types ---

type ReportData = {
  date: string;
  summary: {
    totalRevenue: number;
    netProfit: number;
    totalInvoices: number;
    totalCogs: number;
  };
  breakdowns: {
    products: { name: string; quantity: number; revenue: number }[];
    services: { name: string; quantity: number; revenue: number }[];
    payments: Record<string, number>;
  };
};

// --- Utility: Currency Formatting ---
const formatCurrency = (amount: number) => {
     if (typeof amount !== 'number') return 'Rs. 0.00';
     return `Rs. ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function DayEndPage() {
  const { toast } = useToast();

  // --- State Management ---
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // --- Data Fetching ---
  const fetchReportData = useCallback(async (signal: AbortSignal, reportDate: Date) => {
    setIsLoading(true);
    setReportData(null);
    try {
      const dateString = reportDate.toISOString().split('T')[0];
      const res = await fetch(`/api/reports/day-end?date=${dateString}`, { signal });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to generate report');
      }
      
      const data = await res.json();
      setReportData(data);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setReportData(null);
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (date) {
      const controller = new AbortController();
      fetchReportData(controller.signal, date);
      return () => controller.abort();
    }
  }, [date, fetchReportData]);

  // --- Handlers ---
  const handlePrint = () => {
    window.print();
  };

  // --- Render Helpers ---
  const renderStatSkeletons = () => (
    Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="bg-white p-8 border border-zinc-200">
        <div className="flex justify-between pb-4"><Skeleton className="h-4 w-1/2" /><Skeleton className="h-5 w-5" /></div>
        <Skeleton className="h-8 w-3/4" />
      </div>
    ))
  );

  return (
    <div className="relative z-10 w-full max-w-7xl mx-auto px-6 lg:px-12 pt-8 pb-12" id="report-content">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-12 gap-6 print:hidden">
        <div>
          <h1 className="text-4xl lg:text-5xl font-light tracking-tighter mb-3 text-zinc-900">DAY END REPORT</h1>
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 font-medium">Summary of Daily Operations</p>
        </div>
        <div className="flex items-center gap-3">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-[280px] justify-start text-left font-normal rounded-none h-11 border-zinc-200 text-base",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 rounded-none">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          <Button variant="outline" size="icon" onClick={handlePrint} title="Print Report">
            <Printer className="h-4 w-4 text-zinc-600" />
          </Button>
        </div>
      </div>

       {/* Loading State */}
       {isLoading && (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-zinc-200 border border-zinc-200 mb-8 rounded-sm overflow-hidden">
                {renderStatSkeletons()}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Skeleton className="h-96" />
                <Skeleton className="h-96" />
            </div>
        </div>
       )}

      {/* Report Content */}
      {!isLoading && reportData && (
        <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-zinc-200 border border-zinc-200 mb-8 rounded-sm overflow-hidden">
                <StatCard title="Total Revenue" value={formatCurrency(reportData.summary.totalRevenue)} icon={DollarSign} />
                <StatCard title="Net Profit" value={formatCurrency(reportData.summary.netProfit)} icon={TrendingUp} className={reportData.summary.netProfit >= 0 ? 'text-green-700' : 'text-red-600'} />
                <StatCard title="Total Invoices" value={reportData.summary.totalInvoices.toString()} icon={Hash} />
            </div>

            {/* Breakdowns */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <BreakdownCard title="Products Sold">
                    <BreakdownTable data={reportData.breakdowns.products} headers={["Product", "Qty", "Revenue"]} />
                </BreakdownCard>
                <BreakdownCard title="Services Rendered">
                    <BreakdownTable data={reportData.breakdowns.services} headers={["Service", "Qty", "Revenue"]} />
                </BreakdownCard>
            </div>
            
            {/* Payments */}
            <Card className="rounded-none border-zinc-200 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-sm uppercase tracking-widest font-semibold text-zinc-500">Payment Methods Summary</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-center">
                        {Object.entries(reportData.breakdowns.payments).map(([method, amount]) => (
                            <div key={method} className="bg-zinc-50 p-4">
                                <p className="text-xs text-zinc-500 uppercase tracking-wider">{method}</p>
                                <p className="text-xl font-semibold font-mono tracking-tight">{formatCurrency(amount)}</p>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
      )}
      
       {!isLoading && !reportData && (
         <div className="min-h-[400px] flex items-center justify-center bg-zinc-50 border border-dashed border-zinc-200">
            <p className="text-zinc-400 uppercase text-sm tracking-widest">No data available for this date.</p>
        </div>
       )}

        <style jsx global>{`
          @media print {
            body * {
              visibility: hidden;
            }
            .print-visible, .print-visible * {
              visibility: visible;
            }
            #report-content {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              height: auto;
              padding: 2rem;
              border: none;
              box-shadow: none;
              margin: 0;
            }
            .print-hidden {
              display: none;
            }
          }
        `}</style>
    </div>
  );
}

// --- Sub-components for the report ---

const BreakdownCard = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <Card className="rounded-none border-zinc-200 shadow-sm flex flex-col">
        <CardHeader>
            <CardTitle className="text-sm uppercase tracking-widest font-semibold text-zinc-500">{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex-1">
            {children}
        </CardContent>
    </Card>
);

const BreakdownTable = ({ data, headers }: { data: { name: string, quantity: number, revenue: number }[], headers: string[] }) => {
    if (data.length === 0) {
        return <p className="text-center text-sm text-zinc-400 py-10">No items.</p>;
    }
    return (
        <Table>
            <TableHeader>
                <TableRow className="border-zinc-200 hover:bg-transparent">
                    <TableHead>{headers[0]}</TableHead>
                    <TableHead className="text-center w-20">{headers[1]}</TableHead>
                    <TableHead className="text-right">{headers[2]}</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {data.map((item, index) => (
                    <TableRow key={index} className="border-zinc-100">
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="text-center font-mono">{item.quantity}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(item.revenue)}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
};
