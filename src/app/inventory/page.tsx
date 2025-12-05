import {
  SidebarProvider,
  SidebarInset,
} from "@/components/ui/sidebar";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { Button } from "@/components/ui/button";
import { PlusCircle, Plus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { productsData, servicesData } from "@/lib/data";
import InventoryTable from "@/components/inventory/InventoryTable";

export default function InventoryPage() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <DashboardSidebar />
        <SidebarInset className="flex flex-1 bg-background">
          <DashboardHeader />
          <main className="flex-1 overflow-y-auto p-2 sm:p-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
              <div className="flex items-center gap-4">
                {/* These buttons are ready for future functionality */}
                <Button>
                  <PlusCircle />
                  Add Item
                </Button>
                <Button variant="outline">
                  <Plus />
                  Add Stock
                </Button>
              </div>
            </div>

            <Tabs defaultValue="products">
              <TabsList className="grid w-full grid-cols-2 sm:w-[400px]">
                <TabsTrigger value="products">Products</TabsTrigger>
                <TabsTrigger value="services">Services</TabsTrigger>
              </TabsList>
              <TabsContent value="products">
                <InventoryTable data={productsData} type="product" />
              </TabsContent>
              <TabsContent value="services">
                <InventoryTable data={servicesData} type="service" />
              </TabsContent>
            </Tabs>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
