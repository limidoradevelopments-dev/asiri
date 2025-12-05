
'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, Plus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { productsData as initialProducts, servicesData as initialServices, categoriesData as initialCategories, Product, Service } from "@/lib/data";
import InventoryTable from "@/components/inventory/InventoryTable";
import { AddItemDialog } from "@/components/inventory/AddItemDialog";

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [services, setServices] = useState<Service[]>(initialServices);
  const [categories, setCategories] = useState<string[]>(initialCategories);

  const handleAddItem = (item: Product | Service, type: 'product' | 'service') => {
    if (type === 'product') {
      const newProduct = item as Product;
      setProducts(prev => [...prev, newProduct]);
      // Add new category to the list if it doesn't exist
      if (!categories.includes(newProduct.category)) {
        setCategories(prev => [...prev, newProduct.category]);
      }
    } else {
      setServices(prev => [...prev, item as Service]);
    }
  };

  return (
    <>
      <div className="flex sm:flex-row justify-between items-start sm:items-center mb-4">
        <div className="flex items-center gap-4">
          <AddItemDialog onAddItem={handleAddItem} categories={categories} setCategories={setCategories}>
            <Button>
              <PlusCircle />
              Add Item
            </Button>
          </AddItemDialog>
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
    </>
  );
}
