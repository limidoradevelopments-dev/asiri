
'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, Plus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { productsData as initialProducts, servicesData as initialServices, Product, Service } from "@/lib/data";
import InventoryTable from "@/components/inventory/InventoryTable";
import { AddItemSheet } from "@/components/inventory/AddItemSheet";

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [services, setServices] = useState<Service[]>(initialServices);

  const handleAddItem = (item: Product | Service, type: 'product' | 'service') => {
    if (type === 'product') {
      setProducts(prev => [...prev, item as Product]);
    } else {
      setServices(prev => [...prev, item as Service]);
    }
  };

  return (
    <main className="flex-1 overflow-y-auto p-2 sm:p-4 w-full">
      <div className="flex sm:flex-row justify-between items-start sm:items-center mb-4">
        <div className="flex items-center gap-4">
          <AddItemSheet onAddItem={handleAddItem}>
            <Button>
              <PlusCircle />
              Add Item
            </Button>
          </AddItemSheet>
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
          <InventoryTable data={products} type="product" />
        </TabsContent>
        <TabsContent value="services">
          <InventoryTable data={services} type="service" />
        </TabsContent>
      </Tabs>
    </main>
  );
}
