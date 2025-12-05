
'use client';

import { useState, useMemo } from "react";
import { collection, doc, increment, updateDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { PlusCircle, Plus, Search } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Product, Service } from "@/lib/data";
import InventoryTable from "@/components/inventory/InventoryTable";
import { AddItemDialog } from "@/components/inventory/AddItemDialog";
import { AddStockDialog } from "@/components/inventory/AddStockDialog";
import { useFirestore, useCollection, useMemoFirebase, WithId } from "@/firebase";
import { addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";


export default function InventoryPage() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const productsCollection = useMemoFirebase(() => collection(firestore, 'products'), [firestore]);
  const servicesCollection = useMemoFirebase(() => collection(firestore, 'services'), [firestore]);

  const { data: products, isLoading: productsLoading } = useCollection<Product>(productsCollection);
  const { data: services, isLoading: servicesLoading } = useCollection<Service>(servicesCollection);

  const [searchQuery, setSearchQuery] = useState("");

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (!searchQuery) return products;

    return products.filter(product =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.sku && product.sku.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [products, searchQuery]);

  const filteredServices = useMemo(() => {
    if (!services) return [];
    if (!searchQuery) return services;
    
    return services.filter(service =>
      service.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [services, searchQuery]);


  const productCategories = useMemo(() => {
    if (!products) return [];
    return [...new Set(products.map(p => p.category))];
  }, [products]);

  const vehicleCategories = useMemo(() => {
    if (!services) return [];
    return [...new Set(services.map(s => s.vehicleCategory))];
  }, [services]);

  const [localProductCategories, setLocalProductCategories] = useState<string[]>([]);
  const [localVehicleCategories, setLocalVehicleCategories] = useState<string[]>([]);
  const [itemToEdit, setItemToEdit] = useState<WithId<Product> | WithId<Service> | null>(null);
  const [isAddItemDialogOpen, setAddItemDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{id: string, type: 'product' | 'service'} | null>(null);

  const allProductCategories = useMemo(() => {
    return [...new Set([...productCategories, ...localProductCategories])];
  }, [productCategories, localProductCategories]);

  const allVehicleCategories = useMemo(() => {
    return [...new Set([...vehicleCategories, ...localVehicleCategories])];
  }, [vehicleCategories, localVehicleCategories]);

  const handleUpsertItem = (item: Omit<Product, 'id'> | Omit<Service, 'id'>, type: 'product' | 'service', id?: string) => {
    if (id) {
      // Update existing item
      const docRef = doc(firestore, type === 'product' ? 'products' : 'services', id);
      updateDocumentNonBlocking(docRef, { ...item });
    } else {
      // Add new item
      const collectionRef = type === 'product' ? productsCollection : servicesCollection;
      if (collectionRef) {
          addDocumentNonBlocking(collectionRef, item);
      }
      if (type === 'product') {
        const newCategory = (item as Product).category;
        if (!allProductCategories.includes(newCategory)) {
          setLocalProductCategories(prev => [...prev, newCategory]);
        }
      }
      if (type === 'service') {
        const newCategory = (item as Service).vehicleCategory;
        if (!allVehicleCategories.includes(newCategory)) {
          setLocalVehicleCategories(prev => [...prev, newCategory]);
        }
      }
    }
  };

  const handleAddStock = async (productId: string, quantity: number) => {
    const productRef = doc(firestore, 'products', productId);
    try {
      await updateDoc(productRef, {
        stock: increment(quantity)
      });
      toast({
        title: "Stock Updated",
        description: `Added ${quantity} to the stock.`,
      });
    } catch (error) {
      console.error("Error updating stock: ", error);
       toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update stock.",
      });
    }
  };

  const handleEdit = (item: WithId<Product> | WithId<Service>) => {
    setItemToEdit(item);
    setAddItemDialogOpen(true);
  };
  
  const handleDeleteRequest = (id: string, type: 'product' | 'service') => {
    setItemToDelete({ id, type });
  };

  const confirmDelete = () => {
    if (itemToDelete) {
      const docRef = doc(firestore, itemToDelete.type === 'product' ? 'products' : 'services', itemToDelete.id);
      deleteDocumentNonBlocking(docRef);
      setItemToDelete(null);
    }
  };

  const onDialogClose = (isOpen: boolean) => {
    if (!isOpen) {
      setItemToEdit(null);
    }
    setAddItemDialogOpen(isOpen);
  }

  return (
    <>
      <Card className="mb-4 rounded-3xl bg-white/65 backdrop-blur-md border-white/40 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by name or SKU..."
                className="pl-8 w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-4">
              <AddItemDialog 
                onUpsertItem={handleUpsertItem} 
                productCategories={allProductCategories} 
                setProductCategories={setLocalProductCategories}
                vehicleCategories={allVehicleCategories}
                setVehicleCategories={setLocalVehicleCategories}
                itemToEdit={itemToEdit}
                isOpen={isAddItemDialogOpen}
                onOpenChange={onDialogClose}
              >
                <Button>
                  <PlusCircle />
                  Add Item
                </Button>
              </AddItemDialog>
               <AddStockDialog products={products ?? []} onAddStock={handleAddStock}>
                 <Button variant="outline">
                   <Plus />
                   Add Stock
                 </Button>
               </AddStockDialog>
            </div>
          </div>
        </CardContent>
      </Card>


      <Tabs defaultValue="products">
        <TabsList className="grid w-full grid-cols-2 sm:w-[400px]">
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
        </TabsList>
        <TabsContent value="products">
          <InventoryTable 
            data={filteredProducts} 
            type="product" 
            isLoading={productsLoading} 
            onEdit={handleEdit}
            onDelete={handleDeleteRequest}
          />
        </TabsContent>
        <TabsContent value="services">
          <InventoryTable 
            data={filteredServices} 
            type="service" 
            isLoading={servicesLoading}
            onEdit={handleEdit}
            onDelete={handleDeleteRequest}
          />
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the item.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
