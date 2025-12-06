
'use client';

import { useState, useMemo, useEffect } from 'react';
import { collection } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, WithId } from '@/firebase';
import type { Invoice, Product } from '@/lib/data';
import { DateRange } from 'react-day-picker';
import { addDays, format, startOfDay } from 'date-fns';

import StatCard from '@/components/dashboard/StatCard';
import { DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { DateRangePicker } from '@/components/ui/date-range-picker';
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

type ProfitLossItem = {
  invoiceId: string;
  invoiceNumber: string;
  date: number;
  productName: string;
  quantity: number;
  costOfGoods: number; // quantity * actualPrice
  revenue: number; // quantity * sellingPrice (from invoice)
  profit: number; // revenue - costOfGoods
};

export default function ProfitLossPage() {
  const firestore = useFirestore();

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfDay(addDays(new Date(), -30)),
    to: new Date(),
  });

  const invoicesCollection = useMemoFirebase(() => collection(firestore, 'invoices'), [firestore]);
  const productsCollection = useMemoFirebase(() => collection(firestore, 'products'), [firestore]);

  const { data: invoices, isLoading: invoicesLoading } = useCollection<Invoice>(invoicesCollection);
  const { data: products, isLoading: productsLoading } = useCollection<Product>(productsCollection);

  const { profitLossData, totalRevenue, totalCost, totalProfit, isLoading } = useMemo(() => {
    const loading = invoicesLoading || productsLoading;
    if (loading || !invoices || !products || !dateRange?.from) {
      return { profitLossData: [], totalRevenue: 0, totalCost: 0, totalProfit: 0, isLoading: true };
    }
    
    const productMap = new Map(products.map(p => [p.id, p]));
    const data: ProfitLossItem[] = [];

    const fromDate = startOfDay(dateRange.from);
    const toDate = dateRange.to ? new Date(dateRange.to).setHours(23, 59, 59, 999) : new Date().setHours(23, 59, 59, 999);

    for (const invoice of invoices) {
      if (invoice.date < fromDate.getTime() || invoice.date > toDate) {
        continue;
      }

      for (const item of invoice.items) {
        // Find product based on itemId, which should correspond to a product's ID
        const product = productMap.get(item.itemId);
        
        // We only care about products with a recorded actualPrice
        if (product && product.actualPrice !== undefined) {
          const costOfGoods = item.quantity * product.actualPrice;
          const revenue = item.total; // item.total is already (unitPrice - discount) * quantity
          const profit = revenue - costOfGoods;

          data.push({
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            date: invoice.date,
            productName: item.name,
            quantity: item.quantity,
            costOfGoods,
            revenue,
            profit,
          });
        }
      }
    }
    
    // Sort by most recent date
    data.sort((a, b) => b.date - a.date);
    
    const summary = data.reduce((acc, item) => {
        acc.totalRevenue += item.revenue;
        acc.totalCost += item.costOfGoods;
        acc.totalProfit += item.profit;
        return acc;
    }, { totalRevenue: 0, totalCost: 0, totalProfit: 0 });

    return { ...summary, profitLossData: data, isLoading: false };
  }, [invoices, products, dateRange, invoicesLoading, productsLoading]);
  
  const formatCurrency = (amount: number) => {
     if (typeof amount !== 'number') return 'Rs. 0.00';
     return `Rs. ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  
  const renderStatSkeletons = () => (
    Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="bg-white p-8 border border-zinc-200">
        <div className="flex flex-row items-center justify-between space-y-0 pb-4">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-5 w-5 rounded-sm" />
        </div>
        <div>
          <Skeleton className="h-8 w-1/2" />
        </div>
      </div>
    ))
  );

  const renderTableSkeletons = () => (
     Array.from({ length: 10 }).map((_, index) => (
      <TableRow key={index} className="border-zinc-100">
        <TableCell className="p-2 h-12"><Skeleton className="h-5 w-24" /></TableCell>
        <TableCell className="p-2 h-12"><Skeleton className="h-5 w-32" /></TableCell>
        <TableCell className="p-2 h-12 text-center"><Skeleton className="h-5 w-12 mx-auto" /></TableCell>
        <TableCell className="p-2 h-12 text-right"><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
        <TableCell className="p-2 h-12 text-right"><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
        <TableCell className="p-2 h-12 text-right"><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
      </TableRow>
    ))
  );


  return (
    <div className="relative z-10 w-full max-w-7xl mx-auto px-12 pt-8 pb-12">
        <div className="flex justify-between items-start mb-16 gap-8">
            <div>
                <h1 className="text-5xl font-light tracking-tighter mb-2">PROFIT & LOSS REPORT</h1>
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">Review your income and expenses from product sales.</p>
            </div>
            <DateRangePicker dateRange={dateRange} onDateChange={setDateRange} />
        </div>

        {/* --- STATS GRID --- */}
        <div className="grid grid-cols-3 gap-px bg-zinc-200 border border-zinc-200">
            {isLoading ? renderStatSkeletons() : (
              <>
                <StatCard title="Total Revenue" value={formatCurrency(totalRevenue)} icon={DollarSign} />
                <StatCard title="Total COGS" value={formatCurrency(totalCost)} icon={TrendingDown} />
                <StatCard 
                  title="Total Profit" 
                  value={formatCurrency(totalProfit)} 
                  icon={TrendingUp}
                  className="bg-zinc-50 shadow-sm border border-zinc-200"
                />
              </>
            )}
        </div>
        
        <div className="mt-8">
             <div className="overflow-hidden border border-zinc-200 bg-white">
                <div className="p-4 bg-zinc-50 border-b border-zinc-200">
                    <h3 className="text-sm uppercase tracking-widest font-medium text-zinc-500">Detailed Transactions</h3>
                </div>
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader className="bg-zinc-50 sticky top-0">
                      <TableRow className="border-zinc-200 hover:bg-transparent">
                        <TableHead className="p-2 h-11 text-xs font-medium text-zinc-500 uppercase tracking-wider">Date</TableHead>
                        <TableHead className="p-2 h-11 text-xs font-medium text-zinc-500 uppercase tracking-wider">Product</TableHead>
                        <TableHead className="p-2 h-11 text-center text-xs font-medium text-zinc-500 uppercase tracking-wider">Qty</TableHead>
                        <TableHead className="p-2 h-11 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">Total Cost</TableHead>
                        <TableHead className="p-2 h-11 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">Total Revenue</TableHead>
                        <TableHead className="p-2 h-11 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">Profit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? renderTableSkeletons() : profitLossData.map((item, index) => (
                        <TableRow key={`${item.invoiceId}-${index}`} className="border-zinc-100 text-sm">
                          <TableCell className="p-2 h-12 font-mono text-xs text-zinc-600">{format(new Date(item.date), "yyyy-MM-dd")}</TableCell>
                          <TableCell className="p-2 h-12 font-medium">{item.productName}</TableCell>
                          <TableCell className="p-2 h-12 text-center font-mono">{item.quantity}</TableCell>
                          <TableCell className="p-2 h-12 text-right font-mono">{formatCurrency(item.costOfGoods)}</TableCell>
                          <TableCell className="p-2 h-12 text-right font-mono">{formatCurrency(item.revenue)}</TableCell>
                          <TableCell 
                            className={cn(
                                "p-2 h-12 text-right font-mono font-semibold",
                                item.profit > 0 ? "text-green-600" : "text-red-600"
                            )}
                          >
                            {formatCurrency(item.profit)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {!isLoading && profitLossData.length === 0 && (
                    <div className="text-center py-20 text-zinc-400 text-sm uppercase tracking-widest">
                        No product sales found for the selected date range.
                    </div>
                  )}
                 </ScrollArea>
             </div>
        </div>
    </div>
  );
}
