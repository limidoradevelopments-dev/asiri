'use client';

import { useState, useMemo } from 'react';
import { collection } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import type { Invoice, Product } from '@/lib/data';
import { DateRange } from 'react-day-picker';
import { addDays, format, startOfDay, endOfDay } from 'date-fns';

import StatCard from '@/components/dashboard/StatCard';
import { DollarSign, TrendingUp, TrendingDown, Download, ArrowUpDown, Percent } from 'lucide-react';
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

// --- Types ---
type ProfitLossItem = {
  id: string; // Unique key for list rendering
  invoiceNumber: string;
  date: number;
  productName: string;
  quantity: number;
  costOfGoods: number;
  revenue: number;
  profit: number;
  marginPercent: number;
};

type SortConfig = {
  key: keyof ProfitLossItem;
  direction: 'asc' | 'desc';
} | null;

// --- Utility: Safe Currency Math ---
// Prevents floating point errors (e.g. 0.1 + 0.2 = 0.300000004)
const safeRound = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100;

export default function ProfitLossPage() {
  const firestore = useFirestore();

  // 1. State
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfDay(addDays(new Date(), -30)),
    to: new Date(),
  });

  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'date', direction: 'desc' });

  // 2. Data Fetching
  const invoicesCollection = useMemoFirebase(() => collection(firestore, 'invoices'), [firestore]);
  const productsCollection = useMemoFirebase(() => collection(firestore, 'products'), [firestore]);

  const { data: invoices, isLoading: invoicesLoading } = useCollection<Invoice>(invoicesCollection);
  const { data: products, isLoading: productsLoading } = useCollection<Product>(productsCollection);

  // 3. Calculation & Logic
  const processedData = useMemo(() => {
    const loading = invoicesLoading || productsLoading;
    if (loading || !invoices || !products || !dateRange?.from) {
      return { 
        items: [], 
        summary: { totalRevenue: 0, totalCost: 0, totalProfit: 0, netMargin: 0 }, 
        isLoading: true 
      };
    }

    const productMap = new Map(products.map(p => [p.id, p]));
    let data: ProfitLossItem[] = [];

    const fromDate = startOfDay(dateRange.from).getTime();
    const toDate = (dateRange.to ? endOfDay(dateRange.to) : endOfDay(new Date())).getTime();

    for (const invoice of invoices) {
      // Date Filter
      if (invoice.date < fromDate || invoice.date > toDate) continue;

      for (const item of invoice.items) {
        const product = productMap.get(item.itemId);
        
        // Cost Calculation Logic
        // CRITICAL: Ideal scenario is invoice item has a 'buyPrice' snapshot. 
        // If not, we fall back to current product actualPrice.
        // We use (item as any).buyPrice to check if your historical data has this field.
        const historicalCost = (item as any).buyPrice ?? product?.actualPrice;

        if (historicalCost !== undefined) {
          const quantity = item.quantity;
          const costOfGoods = safeRound(quantity * historicalCost);
          
          // Revenue: Handle discounts if they exist at item level, otherwise total
          const revenue = safeRound(item.total); 
          const profit = safeRound(revenue - costOfGoods);
          
          // Avoid division by zero
          const marginPercent = revenue !== 0 ? safeRound((profit / revenue) * 100) : 0;

          data.push({
            id: `${invoice.id}-${item.itemId}`, // Unique ID
            invoiceNumber: invoice.invoiceNumber,
            date: invoice.date,
            productName: item.name,
            quantity,
            costOfGoods,
            revenue,
            profit,
            marginPercent
          });
        }
      }
    }

    // Sort Data
    if (sortConfig) {
      data.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    // Calculate Totals
    const summary = data.reduce((acc, item) => {
        acc.totalRevenue += item.revenue;
        acc.totalCost += item.costOfGoods;
        acc.totalProfit += item.profit;
        return acc;
    }, { totalRevenue: 0, totalCost: 0, totalProfit: 0 });

    // Final Math Safety on Totals
    const finalSummary = {
        totalRevenue: safeRound(summary.totalRevenue),
        totalCost: safeRound(summary.totalCost),
        totalProfit: safeRound(summary.totalProfit),
        netMargin: summary.totalRevenue > 0 
          ? safeRound((summary.totalProfit / summary.totalRevenue) * 100) 
          : 0
    };

    return { summary: finalSummary, items: data, isLoading: false };
  }, [invoices, products, dateRange, invoicesLoading, productsLoading, sortConfig]);

  // 4. Handlers
  const handleSort = (key: keyof ProfitLossItem) => {
    setSortConfig(current => ({
      key,
      direction: current?.key === key && current.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

  const handleExportCSV = () => {
    if (processedData.items.length === 0) return;
    
    const headers = ['Date', 'Invoice', 'Product', 'Quantity', 'Cost', 'Revenue', 'Profit', 'Margin %'];
    const rows = processedData.items.map(item => [
      format(item.date, 'yyyy-MM-dd'),
      item.invoiceNumber,
      `"${item.productName.replace(/"/g, '""')}"`, // Escape quotes
      item.quantity,
      item.costOfGoods.toFixed(2),
      item.revenue.toFixed(2),
      item.profit.toFixed(2),
      `${item.marginPercent}%`
    ]);

    const csvContent = [
      headers.join(','), 
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `profit_loss_${format(new Date(), 'yyyyMMdd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatCurrency = (amount: number) => {
     return `Rs. ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  // 5. Render Helpers
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
                <h1 className="text-4xl lg:text-5xl font-light tracking-tighter mb-3 text-zinc-900">PROFIT & LOSS</h1>
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 font-medium">Financial Performance Report</p>
            </div>
            <div className="flex items-center gap-3">
                <DateRangePicker dateRange={dateRange} onDateChange={setDateRange} />
                <Button variant="outline" size="icon" onClick={handleExportCSV} disabled={processedData.items.length === 0} title="Export CSV">
                    <Download className="h-4 w-4 text-zinc-600" />
                </Button>
            </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-zinc-200 border border-zinc-200 mb-8 rounded-sm overflow-hidden">
            {processedData.isLoading ? renderStatSkeletons() : (
              <>
                <StatCard title="Total Revenue" value={formatCurrency(processedData.summary.totalRevenue)} icon={DollarSign} />
                <StatCard title="Total Cost (COGS)" value={formatCurrency(processedData.summary.totalCost)} icon={TrendingDown} />
                <StatCard 
                  title="Net Profit" 
                  value={formatCurrency(processedData.summary.totalProfit)} 
                  icon={TrendingUp}
                  className={cn("bg-zinc-50 shadow-md border-zinc-200", processedData.summary.totalProfit >= 0 ? "text-green-700" : "text-red-600")}
                />
              </>
            )}
        </div>
        
        {/* Detail Table */}
        <div className="border border-zinc-200 bg-white shadow-sm rounded-sm">
             <div className="p-4 bg-zinc-50/50 border-b border-zinc-200 flex justify-between items-center">
                 <h3 className="text-xs uppercase tracking-widest font-semibold text-zinc-500">Transaction Details</h3>
                 <span className="text-xs text-zinc-400 font-mono">
                    {processedData.items.length} records found
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
                   {processedData.isLoading ? (
                     // Skeleton Rows
                     Array.from({ length: 8 }).map((_, i) => (
                        <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                     ))
                   ) : processedData.items.length === 0 ? (
                     <TableRow>
                        <TableCell colSpan={6} className="h-64 text-center text-zinc-400">
                            <div className="flex flex-col items-center gap-2">
                                <TrendingUp className="h-8 w-8 opacity-20" />
                                <p className="text-sm uppercase tracking-widest">No Sales in this period</p>
                            </div>
                        </TableCell>
                     </TableRow>
                   ) : (
                     processedData.items.map((item) => (
                       <TableRow key={item.id} className="group hover:bg-zinc-50/80 transition-colors border-zinc-100">
                         <TableCell className="font-mono text-xs text-zinc-500">
                            {format(item.date, "yyyy-MM-dd")}
                            <div className="text-[10px] text-zinc-300">{item.invoiceNumber}</div>
                         </TableCell>
                         <TableCell className="font-medium text-zinc-700 text-sm">{item.productName}</TableCell>
                         <TableCell className="text-center font-mono text-xs text-zinc-500">{item.quantity}</TableCell>
                         <TableCell className="text-right font-mono text-xs text-zinc-500">{formatCurrency(item.costOfGoods)}</TableCell>
                         <TableCell className="text-right font-mono text-xs text-zinc-600">{formatCurrency(item.revenue)}</TableCell>
                         <TableCell className="text-right">
                           <div className={cn(
                               "font-mono text-sm font-semibold inline-flex flex-col items-end",
                               item.profit > 0 ? "text-emerald-700" : "text-rose-600"
                           )}>
                             {formatCurrency(item.profit)}
                             {/* Show margin percentage specifically on hover or always if meaningful */}
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
