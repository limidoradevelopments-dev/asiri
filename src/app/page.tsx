
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
    <main className="flex-1 overflow-y-auto p-2 sm:p-4">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
        {statsData.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3 lg:grid-rows-1">
        <div className="lg:col-span-2 h-full">
          <RevenueChart data={revenueData} />
        </div>
        <div className="h-full">
          <LowStockItems data={lowStockItemsData} />
        </div>
      </div>
      <div className="mt-4">
        <RecentInvoices data={recentInvoicesData} />
      </div>
    </main>
  );
}
