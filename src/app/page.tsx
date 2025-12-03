import {
  SidebarProvider,
  Sidebar,
  SidebarInset,
} from "@/components/ui/sidebar";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
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
    <SidebarProvider>
      <div className="flex min-h-screen">
        <DashboardSidebar />
        <SidebarInset className="flex flex-1 flex-col">
          <DashboardHeader />
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              {statsData.map((stat) => (
                <StatCard key={stat.title} {...stat} />
              ))}
            </div>
            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <RevenueChart data={revenueData} />
              </div>
              <div>
                <LowStockItems data={lowStockItemsData} />
              </div>
            </div>
            <div className="mt-6">
              <RecentInvoices data={recentInvoicesData} />
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
