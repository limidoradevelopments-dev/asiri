
'use client';

import { useMemo } from 'react';
import { collection } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, WithId } from '@/firebase';
import type { Invoice, Product, Customer } from '@/lib/data';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';

import StatCard from "@/components/dashboard/StatCard";
import RevenueChart from "@/components/dashboard/RevenueChart";
import LowStockItems from "@/components/dashboard/LowStockItems";
import RecentInvoices from "@/components/dashboard/RecentInvoices";
import { DollarSign, Archive, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardPage() {
  const firestore = useFirestore();

  const invoicesCollection = useMemoFirebase(() => collection(firestore, 'invoices'), [firestore]);
  const productsCollection = useMemoFirebase(() => collection(firestore, 'products'), [firestore]);
  const customersCollection = useMemoFirebase(() => collection(firestore, 'customers'), [firestore]);

  const { data: invoices, isLoading: invoicesLoading } = useCollection<Invoice>(invoicesCollection);
  const { data: products, isLoading: productsLoading } = useCollection<Product>(productsCollection);
  const { data: customers, isLoading: customersLoading } = useCollection<Customer>(customersCollection);

  const formatCurrency = (amount: number) => {
     if (typeof amount !== 'number') return 'Rs. 0.00';
     return `Rs. ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  const dashboardData = useMemo(() => {
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    const totalRevenue = invoices?.reduce((acc, inv) => acc + inv.amountPaid, 0) ?? 0;
    
    const todaysRevenue = invoices
      ?.filter(inv => inv.date >= todayStart.getTime() && inv.date <= todayEnd.getTime())
      .reduce((acc, inv) => acc + inv.amountPaid, 0) ?? 0;

    const lowStockItems = products?.filter(p => p.stock <= p.stockThreshold) ?? [];
    
    const totalCustomers = customers?.length ?? 0;

    const stats = [
      { title: "Total Revenue", value: formatCurrency(totalRevenue), icon: DollarSign },
      { title: "Today's Revenue", value: formatCurrency(todaysRevenue), icon: DollarSign },
      { title: "Low Stock Items", value: lowStockItems.length.toString(), icon: Archive },
      { title: "Total Customers", value: totalCustomers.toString(), icon: Users },
    ];

    const revenueByDay = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(new Date(), i);
        const dayStart = startOfDay(date);
        const dayEnd = endOfDay(date);

        const dailyRevenue = invoices
            ?.filter(inv => inv.date >= dayStart.getTime() && inv.date <= dayEnd.getTime())
            .reduce((sum, inv) => sum + inv.total, 0) ?? 0;
        
        return {
            date: format(date, "MMM d"),
            revenue: dailyRevenue
        };
    }).reverse();

    const recentInvoices = invoices
        ?.sort((a, b) => b.date - a.date)
        .slice(0, 5)
        .map(inv => {
            const customer = customers?.find(c => c.id === inv.customerId);
            return {
                ...inv,
                id: inv.id,
                customer: customer?.name || 'Unknown',
                amount: inv.total
            }
        }) ?? [];
    
    return {
      stats,
      revenueData: revenueByDay,
      lowStockItems,
      recentInvoices,
    };
  }, [invoices, products, customers]);

  const isLoading = invoicesLoading || productsLoading || customersLoading;

  const renderStatSkeletons = () => (
    Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="bg-background p-8">
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

  return (
    <div className="relative z-10 w-full max-w-7xl mx-auto px-12 pt-8 pb-12">
        
      {/* --- HEADER --- */}
      <div className="flex justify-between items-start mb-16 gap-8">
        <div>
          <h1 className="text-5xl font-light tracking-tighter mb-2">DASHBOARD</h1>
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">Today's snapshot & vital metrics</p>
        </div>
      </div>
      
      {/* --- STATS GRID --- */}
      <div className="grid grid-cols-4 gap-px bg-zinc-200 border border-zinc-200">
        {isLoading ? renderStatSkeletons() : dashboardData.stats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>
      
      {/* --- CHARTS & LISTS --- */}
      <div className="grid grid-cols-3 gap-px mt-px bg-zinc-200 border-l border-r border-b border-zinc-200">
        <div className="col-span-2 bg-background p-8">
          {isLoading ? <Skeleton className="h-[250px] w-full" /> : <RevenueChart data={dashboardData.revenueData} />}
        </div>
        <div className="bg-background p-8">
          {isLoading ? <Skeleton className="h-[250px] w-full" /> : <LowStockItems data={dashboardData.lowStockItems} />}
        </div>
      </div>
      <div className="mt-px">
        {isLoading ? <Skeleton className="h-[300px] w-full mt-8" /> : <RecentInvoices data={dashboardData.recentInvoices} />}
      </div>
    </div>
  );
}
