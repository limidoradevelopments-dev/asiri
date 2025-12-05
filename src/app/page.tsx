
import StatCard from "@/components/dashboard/StatCard";
import RevenueChart from "@/components/dashboard/RevenueChart";
import LowStockItems from "@/components/dashboard/LowStockItems";
import RecentInvoices from "@/components/dashboard/RecentInvoices";
import {
  statsData,
  revenueData,
  lowStockItemsData,
  recentInvoicesData,
} from "@/lib/data";

export default function DashboardPage() {
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
        {statsData.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>
      
      {/* --- CHARTS & LISTS --- */}
      <div className="grid grid-cols-3 gap-px mt-px bg-zinc-200 border-l border-r border-b border-zinc-200">
        <div className="col-span-2 bg-background p-8">
          <RevenueChart data={revenueData} />
        </div>
        <div className="bg-background p-8">
          <LowStockItems data={lowStockItemsData} />
        </div>
      </div>
      <div className="mt-px">
        <RecentInvoices data={recentInvoicesData} />
      </div>
    </div>
  );
}
