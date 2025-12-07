
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { DateRange } from 'react-day-picker';
import { addDays, format, startOfDay, endOfDay } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Download, Search, AlertTriangle, ArrowDown, ArrowUp, ShoppingCart, Wrench, Trash2, Plus, GripVertical } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { StockTransaction } from '@/app/api/reports/stock/route';

const typeStyles: Record<StockTransaction['type'], { badge: string; icon: React.ElementType }> = {
  'Sale': { badge: "bg-blue-100 text-blue-800", icon: ShoppingCart },
  'Stock Addition': { badge: "bg-green-100 text-green-800", icon: Plus },
  'Manual Adjustment': { badge: "bg-yellow-100 text-yellow-800", icon: Wrench },
  'Deletion': { badge: "bg-red-100 text-red-800", icon: Trash2 },
};

type FilterType = 'all' | 'Sale' | 'Stock Addition' | 'manual';

export default function StockReportPage() {
  const { toast } = useToast();

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfDay(addDays(new Date(), -30)),
    to: endOfDay(new Date()),
  });

  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const fetchReportData = useCallback(async (signal: AbortSignal) => {
    if (!dateRange?.from || !dateRange?.to) return;
    
    setIsLoading(true);
    try {
        const params = new URLSearchParams({
            startDate: startOfDay(dateRange.from).getTime().toString(),
            endDate: endOfDay(dateRange.to).getTime().toString(),
        });

        const res = await fetch(`/api/reports/stock?${params.toString()}`, { signal });
        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || 'Failed to generate report');
        }
        
        setTransactions(await res.json());

    } catch (err: any) {
        if (err.name === 'AbortError') return;
        toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
        setIsLoading(false);
    }
  }, [dateRange, toast]);

  useEffect(() => {
    const controller = new AbortController();
    fetchReportData(controller.signal);
    return () => controller.abort();
  }, [fetchReportData]);

  const filteredTransactions = useMemo(() => {
      let items = transactions;

      if (activeFilter !== 'all') {
          if (activeFilter === 'manual') {
              items = items.filter(t => t.type === 'Manual Adjustment' || t.type === 'Deletion');
          } else {
              items = items.filter(t => t.type === activeFilter);
          }
      }

      if (!searchQuery) return items;
      
      const lowercasedQuery = searchQuery.toLowerCase();
      return items.filter(t => 
        t.productName.toLowerCase().includes(lowercasedQuery) ||
        t.reference.toLowerCase().includes(lowercasedQuery) ||
        t.reason?.toLowerCase().includes(lowercasedQuery)
      );
  }, [transactions, searchQuery, activeFilter]);

  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) return;
    
    const headers = ['Date', 'Product', 'Type', 'Quantity Change', 'Reference', 'Reason'];
    const rows = filteredTransactions.map(item => [
      format(item.date, 'yyyy-MM-dd HH:mm'),
      `"${item.productName.replace(/"/g, '""')}"`,
      item.type,
      item.quantityChange,
      `"${item.reference.replace(/"/g, '""')}"`,
      `"${(item.reason || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `stock_report_${format(new Date(), 'yyyyMMdd')}.csv`;
    link.click();
  };

  const renderSkeleton = () => (
    Array.from({ length: 15 }).map((_, i) => (
       <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
    ))
  );

  const filterButtons: { label: string; value: FilterType }[] = [
    { label: 'All Transactions', value: 'all' },
    { label: 'Sales', value: 'Sale' },
    { label: 'Stock Additions', value: 'Stock Addition' },
    { label: 'Manual Adjustments', value: 'manual' },
  ];

  return (
    <div className="relative z-10 w-full max-w-7xl mx-auto px-6 lg:px-12 pt-8 pb-12">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start mb-8 gap-6">
            <div>
                <h1 className="text-4xl lg:text-5xl font-light tracking-tighter mb-3 text-zinc-900">STOCK REPORT</h1>
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 font-medium">A complete product stock transaction history</p>
            </div>
            <div className="flex items-center gap-3 w-full lg:w-auto flex-wrap">
                 <div className="relative group flex-1 lg:flex-none">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                    <Input
                        type="search"
                        placeholder="SEARCH REPORT..."
                        className="w-full lg:w-56 bg-white border-zinc-200 py-2.5 pl-10 text-sm outline-none placeholder:text-zinc-400 focus:border-black transition-colors h-11 rounded-md"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <DateRangePicker dateRange={dateRange} onDateChange={setDateRange} />
                <Button variant="outline" size="icon" onClick={handleExportCSV} disabled={filteredTransactions.length === 0} title="Export CSV">
                    <Download className="h-4 w-4 text-zinc-600" />
                </Button>
            </div>
        </div>

        {/* Filters */}
        <div className="flex items-end gap-2 bg-zinc-100 p-1 mb-8 rounded-md">
          {filterButtons.map(({ label, value }) => (
            <Button
              key={value}
              onClick={() => setActiveFilter(value)}
              variant="ghost"
              className={cn(
                "h-10 px-6 rounded-md text-sm font-medium uppercase tracking-widest text-zinc-500 hover:bg-zinc-200 transition-colors",
                activeFilter === value && "bg-black text-white hover:bg-black hover:text-white"
              )}
            >
              {label}
            </Button>
          ))}
        </div>

        {/* Report Table */}
        <div className="border border-zinc-200 bg-white shadow-sm rounded-sm">
             <div className="p-4 bg-zinc-50/50 border-b border-zinc-200 flex justify-between items-center">
                 <h3 className="text-xs uppercase tracking-widest font-semibold text-zinc-500">Transaction Log</h3>
             </div>
             <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent border-b-zinc-200">
                            <TableHead className="w-40">Date</TableHead>
                            <TableHead>Product</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead className="text-center">Quantity</TableHead>
                            <TableHead>Reference</TableHead>
                            <TableHead>Reason</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? renderSkeleton() : filteredTransactions.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-64 text-center text-zinc-400">
                                    <div className="flex flex-col items-center gap-2">
                                        <AlertTriangle className="h-8 w-8 opacity-20" />
                                        <p className="text-sm uppercase tracking-widest">No transactions found</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredTransactions.map((item, index) => {
                                const { badge, icon: Icon } = typeStyles[item.type];
                                return (
                                    <TableRow key={index} className="border-b-zinc-100">
                                        <TableCell className="font-mono text-xs">{format(item.date, 'MMM d, hh:mm a')}</TableCell>
                                        <TableCell className="font-medium">{item.productName}</TableCell>
                                        <TableCell>
                                            <Badge className={cn("capitalize text-xs font-semibold rounded-md border", badge)}>
                                                <Icon className="h-3 w-3 mr-1.5" />
                                                {item.type}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span className={cn("font-mono font-semibold", item.quantityChange >= 0 ? 'text-green-600' : 'text-red-600')}>
                                                {item.quantityChange >= 0 ? `+${item.quantityChange}` : item.quantityChange}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-zinc-500 font-mono text-xs">{item.reference}</TableCell>
                                        <TableCell className="text-zinc-500 text-xs italic">{item.reason}</TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
             </div>
        </div>
    </div>
  );
}
