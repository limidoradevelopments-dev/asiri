'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { Product } from '@/lib/data';
import { DateRange } from 'react-day-picker';
import { format, startOfDay, endOfDay } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

import StatCard from '@/components/dashboard/StatCard';
import { DollarSign, TrendingUp, TrendingDown, Download, ArrowUpDown, Check, ChevronsUpDown, Loader2 } from 'lucide-react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { WithId } from '@/firebase';

// --- Types ---

type ProfitLossItem = {
  id: string;
  invoiceNumber: string;
  date: number;
  productName: string;
  quantity: number;
  costOfGoods: number;
  revenue: number;
  profit: number;
  marginPercent: number;
  isEstimateCost: boolean;
};

type SummaryStats = {
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
    totalLoss: number;
    netMargin: number;
}

type SortConfig = {
  key: keyof ProfitLossItem;
  direction: 'asc' | 'desc';
} | null;

// --- Utility: Currency Formatting ---
const formatCurrency = (amount: number) => {
     if (typeof amount !== 'number') return 'Rs. 0.00';
     return `Rs. ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function ProfitLossPage() {
  const { toast } = useToast();

  // --- State Management ---
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfDay(new Date(new Date().setDate(new Date().getDate() - 30))),
    to: endOfDay(new Date()),
  });

  const [products, setProducts] = useState<WithId<Product>[]>([]);
  const [reportItems, setReportItems] = useState<ProfitLossItem[]>([]);
  const [summary, setSummary] = useState<SummaryStats>({ totalRevenue: 0, totalCost: 0, totalProfit: 0, totalLoss: 0, netMargin: 0 });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isProductListLoading, setIsProductListLoading] = useState(true);
  
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'date', direction: 'desc' });
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [productPopoverOpen, setProductPopoverOpen] = useState(false);

  // --- Data Fetching ---

  const fetchProducts = useCallback(async (signal: AbortSignal) => {
    setIsProductListLoading(true);
    try {
        const res = await fetch('/api/products', { signal });
        if (!res.ok) throw new Error('Failed to fetch product list');
        setProducts(await res.json());
    } catch (err: any) {
        if (err.name === 'AbortError') return;
        toast({ variant: 'destructive', title: 'Error', description: 'Could not load product filter.' });
    } finally {
        setIsProductListLoading(false);
    }
  }, [toast]);

  const fetchReportData = useCallback(async (signal: AbortSignal) => {
    if (!dateRange?.from || !dateRange?.to) return;
    
    setIsLoading(true);
    try {
        const params = new URLSearchParams({
            startDate: format(dateRange.from, 'yyyy-MM-dd'),
            endDate: format(dateRange.to, 'yyyy-MM-dd'),
        });
        if (selectedProductId) {
            params.append('productId', selectedProductId);
        }

        const res = await fetch(`/api/reports/profit-loss?${params.toString()}`, { signal });
        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || 'Failed to generate report');
        }
        
        const { items, summary } = await res.json();
        setReportItems(items);
        setSummary(summary);

    } catch (err: any) {
        if (err.name === 'AbortError') return;
        toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
        setIsLoading(false);
    }
  }, [dateRange, selectedProductId, toast]);


  useEffect(() => {
    const controller = new AbortController();
    fetchProducts(controller.signal);
    return () => controller.abort();
  }, [fetchProducts]);

  useEffect(() => {
    const controller = new AbortController();
    fetchReportData(controller.signal);
    return () => controller.abort();
  }, [fetchReportData]);

  // --- Sorting Logic ---
  const sortedItems = useMemo(() => {
    if (!sortConfig) return reportItems;

    return [...reportItems].sort((a, b) => {
        const valA = a[sortConfig.key];
        const valB = b[sortConfig.key];
        
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });
  }, [reportItems, sortConfig]);

  // --- Handlers ---
  const handleSort = (key: keyof ProfitLossItem) => {
    setSortConfig(current => ({
      key,
      direction: current?.key === key && current.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

  const handleExportCSV = () => {
    if (sortedItems.length === 0) return;
    
    const headers = ['Date', 'Invoice', 'Product', 'Quantity', 'Cost (COGS)', 'Revenue', 'Profit', 'Margin %', 'Cost Source'];
    const rows = sortedItems.map(item => [
      format(item.date, 'yyyy-MM-dd'),
      item.invoiceNumber,
      `"${item.productName.replace(/"/g, '""')}"`,
      item.quantity,
      item.costOfGoods.toFixed(2),
      item.revenue.toFixed(2),
      item.profit.toFixed(2),
      `${item.marginPercent}%`,
      item.isEstimateCost ? 'Current Price (Est)' : 'Historical Price'
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `profit_loss_${format(new Date(), 'yyyyMMdd')}.csv`;
    link.click();
  };
  
  const selectedProductName = useMemo(() => {
    if (!selectedProductId || !products) return 'All Products';
    return products.find(p => p.id === selectedProductId)?.name || 'All Products';
  }, [selectedProductId, products]);

  // --- Render Helpers ---
  const renderStatSkeletons = () => (
    Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="bg-white p-8 border border-zinc-200">
        <div className="flex justify-between pb-4"><Skeleton className="h-4 w-1/2" /><Skeleton className="h-5 w-5" /></div>
        <Skeleton className="h-8 w-3/4" />
      </div>
    ))
  );

  const SortIcon = ({ column }: { column: keyof ProfitLossItem }) => {
    if (sortConfig?.key !== column) return <ArrowUpDown className="ml-2 h-3 w-3 opacity-30" />;
    return <ArrowUpDown className={cn("ml-2 h-3 w-3", sortConfig.direction === 'desc' ? "text-zinc-900" : "text-zinc-500")} />;
  };

  return (
    <div className="relative z-10 w-full max-w-7xl mx-auto px-6 lg:px-12 pt-8 pb-12">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-12 gap-6">
            <div>
                <h1 className="text-4xl lg:text-5xl font-light tracking-tighter mb-3 text-zinc-900">PROFIT &amp; LOSS</h1>
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 font-medium">Financial Performance Report</p>
            </div>
            <div className="flex items-center gap-3">
                <Popover open={productPopoverOpen} onOpenChange={setProductPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={productPopoverOpen}
                      className="w-[250px] justify-between rounded-none h-11 border-zinc-200 text-base"
                      disabled={isProductListLoading}
                    >
                      <span className="truncate">{isProductListLoading ? 'Loading...' : selectedProductName}</span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[250px] p-0 rounded-none">
                    <Command>
                      <CommandInput placeholder="Search product..." />
                      <CommandList>
                        <CommandEmpty>No product found.</CommandEmpty>
                        <CommandGroup>
                           <CommandItem
                             key="all"
                             value="all"
                             onSelect={() => {
                               setSelectedProductId(null);
                               setProductPopoverOpen(false);
                             }}
                           >
                             <Check className={cn("mr-2 h-4 w-4", !selectedProductId ? "opacity-100" : "opacity-0")} />
                             All Products
                           </CommandItem>
                          {products?.map((product) => (
                            <CommandItem
                              key={product.id}
                              value={product.name}
                              onSelect={() => {
                                setSelectedProductId(product.id);
                                setProductPopoverOpen(false);
                              }}
                            >
                              <Check className={cn("mr-2 h-4 w-4", selectedProductId === product.id ? "opacity-100" : "opacity-0")} />
                              {product.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                <DateRangePicker dateRange={dateRange} onDateChange={setDateRange} />
                <Button variant="outline" size="icon" onClick={handleExportCSV} disabled={sortedItems.length === 0} title="Export CSV">
                    <Download className="h-4 w-4 text-zinc-600" />
                </Button>
            </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-zinc-200 border border-zinc-200 mb-8 rounded-sm overflow-hidden">
            {isLoading ? renderStatSkeletons() : (
              <>
                <StatCard title="Total Revenue" value={formatCurrency(summary.totalRevenue)} icon={DollarSign} />
                <StatCard title="Total Cost (COGS)" value={formatCurrency(summary.totalCost)} icon={TrendingDown} />
                <StatCard 
                  title="Total Loss (Negative Items)" 
                  value={formatCurrency(summary.totalLoss)} 
                  icon={TrendingDown}
                  className="text-red-600"
                />
                <StatCard 
                  title="Net Profit" 
                  value={formatCurrency(summary.totalProfit)} 
                  icon={TrendingUp}
                  className={cn(
                      "relative bg-no-repeat bg-right bg-cover shadow-md hover:shadow-xl hover:scale-[1.01] transition-all duration-300", 
                      summary.totalProfit >= 0 ? "text-green-700" : "text-red-600"
                  )}
                  style={{ backgroundImage: "url('/stat-card-decoration.svg')" }}
                />
              </>
            )}
        </div>
        
        {/* Detail Table */}
        <div className="border border-zinc-200 bg-white shadow-sm rounded-sm">
             <div className="p-4 bg-zinc-50/50 border-b border-zinc-200 flex justify-between items-center">
                 <h3 className="text-xs uppercase tracking-widest font-semibold text-zinc-500">Transaction Details</h3>
                 <span className="text-xs text-zinc-400 font-mono">
                    {isLoading 
                      ? <Loader2 className="h-3 w-3 animate-spin"/> 
                      : `${sortedItems.length} records found`
                    }
                 </span>
             </div>
             
             <ScrollArea className="h-[600px]">
               <Table>
                 <TableHeader className="bg-white sticky top-0 z-10 shadow-sm">
                   <TableRow className="hover:bg-transparent">
                     <TableHead className="w-[120px] cursor-pointer hover:bg-zinc-50" onClick={() => handleSort('date')}>
                        <div className="flex items-center">Date <SortIcon column="date" /></div>
                     </TableHead>
                     <TableHead className="cursor-pointer hover:bg-zinc-50" onClick={() => handleSort('productName')}>
                        <div className="flex items-center">Product <SortIcon column="productName" /></div>
                     </TableHead>
                     <TableHead className="text-center w-[80px]">Qty</TableHead>
                     <TableHead className="text-right cursor-pointer hover:bg-zinc-50" onClick={() => handleSort('costOfGoods')}>
                        <div className="flex items-center justify-end">Cost <SortIcon column="costOfGoods" /></div>
                     </TableHead>
                     <TableHead className="text-right cursor-pointer hover:bg-zinc-50" onClick={() => handleSort('revenue')}>
                        <div className="flex items-center justify-end">Revenue <SortIcon column="revenue" /></div>
                     </TableHead>
                     <TableHead className="text-right cursor-pointer hover:bg-zinc-50" onClick={() => handleSort('profit')}>
                        <div className="flex items-center justify-end">Profit <SortIcon column="profit" /></div>
                     </TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {isLoading ? (
                     Array.from({ length: 15 }).map((_, i) => (
                        <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
                     ))
                   ) : sortedItems.length === 0 ? (
                     <TableRow>
                        <TableCell colSpan={6} className="h-64 text-center text-zinc-400">
                            <div className="flex flex-col items-center gap-2">
                                <TrendingUp className="h-8 w-8 opacity-20" />
                                <p className="text-sm uppercase tracking-widest">No Sales in this period</p>
                            </div>
                        </TableCell>
                     </TableRow>
                   ) : (
                     sortedItems.map((item) => (
                       <TableRow key={item.id} className="group hover:bg-zinc-50/80 transition-colors border-zinc-100">
                         <TableCell className="font-mono text-xs text-zinc-500">
                            {format(new Date(item.date), "yyyy-MM-dd")}
                            <div className="text-[10px] text-zinc-300">{item.invoiceNumber}</div>
                         </TableCell>
                         <TableCell className="font-medium text-zinc-700 text-sm">
                            {item.productName}
                            {item.isEstimateCost && (
                                <span title="Historical Cost missing. Calculated using current Product Price." className="ml-2 text-[10px] text-amber-500 border border-amber-200 px-1 rounded">Est.</span>
                            )}
                         </TableCell>
                         <TableCell className="text-center font-mono text-xs text-zinc-500">{item.quantity}</TableCell>
                         <TableCell className="text-right font-mono text-xs text-zinc-500">{formatCurrency(item.costOfGoods)}</TableCell>
                         <TableCell className="text-right font-mono text-xs text-zinc-600">{formatCurrency(item.revenue)}</TableCell>
                         <TableCell className="text-right">
                           <div className={cn(
                               "font-mono text-sm font-semibold inline-flex flex-col items-end",
                               item.profit >= 0 ? "text-emerald-700" : "text-rose-600"
                           )}>
                             {formatCurrency(item.profit)}
                             <span className={cn("text-[10px] font-normal opacity-50")}>
                                {item.marginPercent}%
                             </span>
                           </div>
                         </TableCell>
                       </TableRow>
                     ))
                   )}
                 </TableBody>
               </Table>
             </ScrollArea>
        </div>
    </div>
  );
}
