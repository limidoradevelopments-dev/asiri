
'use client';

import { useState, useMemo, useCallback, useEffect } from "react";
import { collection, doc, increment, updateDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Plus, Search } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Product, Service } from "@/lib/data";
import InventoryTable from "@/components/inventory/InventoryTable";
import { AddItemDialog } from "@/components/inventory/AddItemDialog";
import { AddStockDialog } from "@/components/inventory/AddStockDialog";
import { useFirestore, WithId } from "@/firebase";
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
import { useToast } from "@/hooks/use-toast";

export default function InventoryPage() {
  const firestore = useFirestore(); // Keep for mutations for now
  const { toast } = useToast();

  const [products, setProducts] = useState<WithId<Product>[]>([]);
  const [services, setServices] = useState<WithId<Service>[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [servicesLoading, setServicesLoading] = useState(true);
  
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setProductsLoading(true);
        const response = await fetch('/api/products');
        if (!response.ok) throw new Error('Failed to fetch products');
        const data = await response.json();
        setProducts(data);
      } catch (error) {
        console.error(error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch products.' });
      } finally {
        setProductsLoading(false);
      }
    };

    const fetchServices = async () => {
      try {
        setServicesLoading(true);
        const response = await fetch('/api/services');
        if (!response.ok) throw new Error('Failed to fetch services');
        const data = await response.json();
        setServices(data);
      } catch (error) {
        console.error(error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch services.' });
      } finally {
        setServicesLoading(false);
      }
    };

    fetchProducts();
    fetchServices();
  }, [toast]);

  const [searchQuery, setSearchQuery] = useState("");
  const [isAddStockDialogOpen, setAddStockDialogOpen] = useState(false);

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (!searchQuery) return products;

    const lowercasedQuery = searchQuery.toLowerCase();
    return products.filter(product =>
      product.name.toLowerCase().includes(lowercasedQuery) ||
      (product.sku && product.sku.toLowerCase().includes(lowercasedQuery))
    );
  }, [products, searchQuery]);

  const filteredServices = useMemo(() => {
    if (!services) return [];
    if (!searchQuery) return services;
    
    const lowercasedQuery = searchQuery.toLowerCase();
    return services.filter(service =>
      service.name.toLowerCase().includes(lowercasedQuery)
    );
  }, [services, searchQuery]);

  const [itemToEdit, setItemToEdit] = useState<WithId<Product> | WithId<Service> | null>(null);
  const [isAddItemDialogOpen, setAddItemDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{id: string, type: 'product' | 'service'} | null>(null);

  const handleUpsertItem = useCallback((item: Omit<Product, 'id'> | Omit<Service, 'id'>, type: 'product' | 'service', id?: string) => {
    const productsCollection = collection(firestore, 'products');
    const servicesCollection = collection(firestore, 'services');

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
    }
     // For now, we will rely on a full refresh, but a better way would be to update local state
     window.location.reload();
  }, [firestore]);

  const handleAddStock = useCallback(async (productId: string, quantity: number) => {
    const productRef = doc(firestore, 'products', productId);
    try {
      await updateDoc(productRef, {
        stock: increment(quantity)
      });
      toast({
        title: "Stock Updated",
        description: `Added ${quantity} to the stock.`,
      });
      // Refresh data
      const response = await fetch('/api/products');
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error("Error updating stock: ", error);
       toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update stock.",
      });
    }
  }, [firestore, toast]);

  const handleEdit = useCallback((item: WithId<Product> | WithId<Service>) => {
    setItemToEdit(item);
    setAddItemDialogOpen(true);
  }, []);
  
  const handleDeleteRequest = useCallback((id: string, type: 'product' | 'service') => {
    setItemToDelete({ id, type });
  }, []);

  const confirmDelete = useCallback(() => {
    if (!itemToDelete) return;

    const docRef = doc(firestore, itemToDelete.type === 'product' ? 'products' : 'services', itemToDelete.id);
    deleteDocumentNonBlocking(docRef);
    
    // For now, we will rely on a full refresh, but a better way would be to update local state
    setItemToDelete(null);
    window.location.reload();
  }, [itemToDelete, firestore]);


  const onDialogClose = useCallback((isOpen: boolean) => {
    if (!isOpen) {
      setItemToEdit(null);
    }
    setAddItemDialogOpen(isOpen);
  }, []);

  return (
    <div className="relative z-10 w-full max-w-7xl mx-auto px-12 pt-8 pb-12">
        
        {/* --- HEADER --- */}
        <div className="flex justify-between items-start mb-16 gap-8">
            <div>
                <h1 className="text-5xl font-light tracking-tighter mb-2">INVENTORY</h1>
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">Manage Stock & Services</p>
            </div>

            <div className="flex items-end gap-8 w-auto">
                {/* Minimal Line Search */}
                <div className="relative group w-80">
                    <Search className="absolute left-0 bottom-3 h-4 w-4 text-zinc-400 group-focus-within:text-black transition-colors" />
                    <input
                        type="search"
                        placeholder="SEARCH ITEM OR SKU..."
                        className="w-full bg-transparent border-b border-zinc-200 py-2.5 pl-8 text-sm outline-none placeholder:text-zinc-300 placeholder:uppercase placeholder:tracking-widest uppercase tracking-wide focus:border-black transition-colors"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-4">
                     <AddStockDialog 
                        products={products ?? []} 
                        onAddStock={handleAddStock}
                        isOpen={isAddStockDialogOpen}
                        onOpenChange={setAddStockDialogOpen}
                     >
                        <Button 
                            onClick={() => setAddStockDialogOpen(true)}
                            variant="outline" 
                            className="h-10 px-6 rounded-none border-zinc-200 text-xs uppercase tracking-[0.15em] hover:bg-zinc-50 hover:text-black hover:border-black transition-all"
                        >
                            <Plus className="mr-2 h-3 w-3" />
                            Stock
                        </Button>
                    </AddStockDialog>

                    <AddItemDialog 
                        onUpsertItem={handleUpsertItem} 
                        itemToEdit={itemToEdit}
                        isOpen={isAddItemDialogOpen}
                        onOpenChange={onDialogClose}
                    >
                        <Button 
                            onClick={() => setAddItemDialogOpen(true)}
                            className="h-10 px-6 rounded-none bg-black text-white text-xs uppercase tracking-[0.15em] hover:bg-zinc-800 transition-all shadow-none"
                        >
                            <Plus className="mr-2 h-3 w-3" />
                            New Item
                        </Button>
                    </AddItemDialog>
                </div>
            </div>
        </div>

        {/* --- TABS & TABLE --- */}
        <Tabs defaultValue="products" className="w-full">
             <TabsList className="bg-zinc-100 justify-start p-1 mb-8 w-full rounded-none">
                <TabsTrigger 
                    value="products"
                    className="relative h-10 px-6 rounded-none text-sm font-medium uppercase tracking-widest text-zinc-400 data-[state=active]:text-white data-[state=active]:bg-black data-[state=active]:shadow-none hover:bg-zinc-200 transition-colors"
                >
                    Products
                </TabsTrigger>
                <TabsTrigger 
                    value="services"
                    className="relative h-10 px-6 rounded-none text-sm font-medium uppercase tracking-widest text-zinc-400 data-[state=active]:text-white data-[state=active]:bg-black data-[state=active]:shadow-none hover:bg-zinc-200 transition-colors"
                >
                    Services
                </TabsTrigger>
            </TabsList>

            <div className="min-h-[400px]">
                <TabsContent value="products" className="mt-0 focus-visible:outline-none">
                    <InventoryTable 
                        data={filteredProducts} 
                        type="product" 
                        isLoading={productsLoading} 
                        onEdit={handleEdit}
                        onDelete={handleDeleteRequest}
                    />
                </TabsContent>
                <TabsContent value="services" className="mt-0 focus-visible:outline-none">
                    <InventoryTable 
                        data={filteredServices} 
                        type="service" 
                        isLoading={servicesLoading}
                        onEdit={handleEdit}
                        onDelete={handleDeleteRequest}
                    />
                </TabsContent>
            </div>
        </Tabs>

      <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent className="rounded-none border-zinc-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-light tracking-tight text-xl">Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-500">
              This action cannot be undone. This will permanently remove the item from your inventory.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 mt-4">
            <AlertDialogCancel 
                onClick={() => setItemToDelete(null)}
                className="rounded-none border-zinc-200 uppercase tracking-widest text-xs"
            >
                Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
                onClick={confirmDelete} 
                className="bg-red-600 hover:bg-red-700 text-white rounded-none uppercase tracking-widest text-xs"
            >
                Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
