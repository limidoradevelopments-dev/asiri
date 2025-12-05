
'use client';

import { useState, useMemo } from "react";
import { collection, doc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { PlusCircle, Plus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Product, Service } from "@/lib/data";
import InventoryTable from "@/components/inventory/InventoryTable";
import { AddItemDialog } from "@/components/inventory/AddItemDialog";
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
  const [itemToEdit, setItemToEdit] = useState<WithId<Product> | WithId<Service> | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{id: string, type: 'product' | 'service'} | null>(null);

  const allCategories = useMemo(() => {
    return [...new Set([...categories, ...localCategories])];
  }, [categories, localCategories]);

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
        if (!allCategories.includes(newCategory)) {
          setLocalCategories(prev => [...prev, newCategory]);
        }
      }
    }
  };

  const handleEdit = (item: WithId<Product> | WithId<Service>) => {
    setItemToEdit(item);
    setIsDialogOpen(true);
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
    setIsDialogOpen(isOpen);
  }

  return (
    <>
      <div className="flex sm:flex-row justify-between items-start sm:items-center mb-4">
        <div className="flex items-center gap-4">
          <AddItemDialog 
            onUpsertItem={handleUpsertItem} 
            categories={allCategories} 
            setCategories={setLocalCategories}
            itemToEdit={itemToEdit}
            isOpen={isDialogOpen}
            onOpenChange={onDialogClose}
          >
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
          <InventoryTable 
            data={products || []} 
            type="product" 
            isLoading={productsLoading} 
            onEdit={handleEdit}
            onDelete={handleDeleteRequest}
          />
        </TabsContent>
        <TabsContent value="services">
          <InventoryTable 
            data={services || []} 
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
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
