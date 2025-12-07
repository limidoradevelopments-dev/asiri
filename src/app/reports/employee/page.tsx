
'use client';

import { useState, useEffect, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Calendar as CalendarIcon, Loader2, User, Wrench, Hash } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { InvoiceDetailsDialog } from '@/components/invoices/InvoiceDetailsDialog';
import type { EnrichedInvoice } from '@/app/invoices/page';

// --- Types ---
type EmployeeJob = {
    invoiceId: string;
    invoiceNumber: string;
};

type EmployeeReportData = {
    employeeId: string;
    employeeName: string;
    jobCount: number;
    jobs: EmployeeJob[];
};

type FullReportResponse = {
    report: EmployeeReportData[];
    fullInvoices: Record<string, EnrichedInvoice>;
}

export default function EmployeeReportPage() {
  const { toast } = useToast();

  const [date, setDate] = useState<Date | undefined>(new Date());
  const [reportData, setReportData] = useState<EmployeeReportData[] | null>(null);
  const [fullInvoices, setFullInvoices] = useState<Record<string, EnrichedInvoice>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<EnrichedInvoice | null>(null);

  const fetchReportData = useCallback(async (signal: AbortSignal, reportDate: Date) => {
    setIsLoading(true);
    setReportData(null);
    try {
      const dateString = reportDate.toISOString().split('T')[0];
      const res = await fetch(`/api/reports/employee?date=${dateString}`, { signal });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to generate report');
      }
      
      const data: FullReportResponse = await res.json();
      setReportData(data.report);
      setFullInvoices(data.fullInvoices);

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
  
  const handleInvoiceClick = (invoiceId: string) => {
    const invoiceDetails = fullInvoices[invoiceId];
    if (invoiceDetails) {
      setSelectedInvoice(invoiceDetails);
    } else {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not find invoice details.' });
    }
  };

  const renderSkeletons = () => (
    Array.from({ length: 4 }).map((_, i) => (
      <Card key={i} className="rounded-none border-zinc-200 shadow-sm">
        <CardHeader>
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-4 w-1/4" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </CardContent>
      </Card>
    ))
  );

  return (
    <div className="relative z-10 w-full max-w-7xl mx-auto px-6 lg:px-12 pt-8 pb-12">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start mb-12 gap-6">
        <div>
          <h1 className="text-4xl lg:text-5xl font-light tracking-tighter mb-3 text-zinc-900">EMPLOYEE REPORT</h1>
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 font-medium">Daily Job Performance</p>
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
        </div>
      </div>
      
       {/* Report Content */}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ? (
                renderSkeletons()
            ) : reportData && reportData.length > 0 ? (
                reportData.map((emp) => (
                    <Card key={emp.employeeId} className="rounded-none border-zinc-200 shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-3">
                                <User className="w-5 h-5 text-zinc-400"/>
                                <span className="text-lg font-medium">{emp.employeeName}</span>
                            </CardTitle>
                            <CardDescription className="flex items-center gap-2 pt-1">
                                <Wrench className="w-3 h-3 text-zinc-400" />
                                <span>Completed <strong>{emp.jobCount}</strong> job(s)</span>
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {emp.jobCount > 0 ? (
                                <div className="space-y-1">
                                    <h4 className="text-xs uppercase tracking-widest text-zinc-500 font-semibold mb-2">Invoice Numbers</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {emp.jobs.map(job => (
                                            <Button 
                                                key={job.invoiceId} 
                                                variant="outline"
                                                size="sm"
                                                className="font-mono text-xs h-7 rounded-md"
                                                onClick={() => handleInvoiceClick(job.invoiceId)}
                                            >
                                                {job.invoiceNumber}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-zinc-500 text-center py-4">No jobs recorded for this day.</p>
                            )}
                        </CardContent>
                    </Card>
                ))
            ) : (
                <div className="col-span-full min-h-[400px] flex items-center justify-center bg-zinc-50 border border-dashed border-zinc-200">
                    <p className="text-zinc-400 uppercase text-sm tracking-widest">No employee activity found for this date.</p>
                </div>
            )}
       </div>

        <InvoiceDetailsDialog
            invoice={selectedInvoice}
            isOpen={!!selectedInvoice}
            onOpenChange={(isOpen) => !isOpen && setSelectedInvoice(null)}
        />
    </div>
  );
}
