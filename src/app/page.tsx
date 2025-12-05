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
    // 1. SidebarProvider wraps the whole layout to manage sidebar state
    <SidebarProvider>
      <div className="flex min-h-screen">
        {/* 2. DashboardSidebar component, hidden or minimized on small screens */}
        <DashboardSidebar />
        
        {/* 3. SidebarInset takes up the remaining space, adjusting its margin/position based on sidebar state */}
        <SidebarInset className="flex flex-1 flex-col bg-background">
          <DashboardHeader />
          
          {/* 4. Main Content Area: Padding adjusted for better mobile view */}
          <main className="flex-1 overflow-y-auto p-2 sm:p-4 md:p-6">
            
            {/* Stat Cards: Responsive grid layout */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {statsData.map((stat) => (
                <StatCard key={stat.title} {...stat} />
              ))}
            </div>
            
            {/* Charts/Low Stock: Responsive grid layout */}
            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <RevenueChart data={revenueData} />
              </div>
              <div>
                <LowStockItems data={lowStockItemsData} />
              </div>
            </div>
            
            {/* Recent Invoices: Full width, naturally responsive. */}
            <div className="mt-4">
              <RecentInvoices data={recentInvoicesData} />
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
