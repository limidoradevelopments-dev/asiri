
'use client';

import { useState, useMemo } from "react";
import { collection, addDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { PlusCircle, Plus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Product, Service } from "@/lib/data";
import InventoryTable from "@/components/inventory/InventoryTable";
import { AddItemDialog } from "@/components/inventory/AddItemDialog";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { addDocumentNonBlocking } from "@/firebase/non-blocking-updates";

export default function InventoryPage() {
  const firestore = useFirestore();

  const productsCollection = useMemoFirebase(() => collection(firestore, 'products'), [firestore]);
  const servicesCollection = useMemoFirebase(() => collection(firestore, 'services'), [firestore]);

  const { data: products, isLoading: productsLoading } = useCollection<Product>(productsCollection);
  const { data: services, isLoading: servicesLoading } = useCollection<Service>(servicesCollection);

  const categories = useMemo(() => {
    if (!products) return [];
    return [...new Set(products.map(p => p.category))];
  }, [products]);

  const [localCategories, setLocalCategories] = useState<string[]>([]);

  const allCategories = useMemo(() => {
    return [...new Set([...categories, ...localCategories])];
  }, [categories, localCategories]);

  const handleAddItem = (item: Omit<Product, 'id'> | Omit<Service, 'id'>, type: 'product' | 'service') => {
    if (type === 'product') {
      addDocumentNonBlocking(productsCollection, item);
      const newCategory = (item as Product).category;
      if (!allCategories.includes(newCategory)) {
        setLocalCategories(prev => [...prev, newCategory]);
      }
    } else {
      addDocumentNonBlocking(servicesCollection, item as Service);
    }
  };

  return (
    <>
      <div className="flex sm:flex-row justify-between items-start sm:items-center mb-4">
        <div className="flex items-center gap-4">
          <AddItemDialog onAddItem={handleAddItem} categories={allCategories} setCategories={setLocalCategories}>
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
          <InventoryTable data={products || []} type="product" isLoading={productsLoading} />
        </TabsContent>
        <TabsContent value="services">
          <InventoryTable data={services || []} type="service" isLoading={servicesLoading} />
        </TabsContent>
      </Tabs>
    </>
  );
}
