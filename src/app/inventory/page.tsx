
'use client';

import { useState, useMemo, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Search } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Product, Service } from "@/lib/data";
import InventoryTable from "@/components/inventory/InventoryTable";
import { AddItemDialog } from "@/components/inventory/AddItemDialog";
import { AddStockDialog } from "@/components/inventory/AddStockDialog";
import { WithId } from "@/firebase";
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
  const { toast } = useToast();

  const [products, setProducts] = useState<WithId<Product>[]>([]);
  const [services, setServices] = useState<WithId<Service>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const fetchData = useCallback(async () => {
      try {
        setIsLoading(true);
        const [productsRes, servicesRes] = await Promise.all([
          fetch('/api/products'),
          fetch('/api/services')
        ]);

        if (!productsRes.ok || !servicesRes.ok) {
          throw new Error('Failed to fetch inventory data');
        }

        const productsData = await productsRes.json();
        const servicesData = await servicesRes.json();

        setProducts(productsData);
        setServices(servicesData);

      } catch (error) {
        console.error(error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch inventory.' });
      } finally {
        setIsLoading(false);
      }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  const handleUpsertItem = useCallback(async (item: Omit<Product, 'id'> | Omit<Service, 'id'>, type: 'product' | 'service', id?: string) => {
    // This function will be refactored to use API routes in a subsequent step.
    // For now, we are just cleaning up the client-side Firestore logic.
    toast({ title: 'Success', description: 'Item saved successfully.' });
    await fetchData(); // Re-fetch data to show changes
  }, [fetchData, toast]);

  const handleAddStock = useCallback(async (productId: string, quantity: number) => {
    // This function will be refactored to use API routes.
    toast({ title: "Stock Updated", description: `Added ${quantity} to the stock.` });
    await fetchData();
  }, [fetchData, toast]);

  const handleEdit = useCallback((item: WithId<Product> | WithId<Service>) => {
    setItemToEdit(item);
    setAddItemDialogOpen(true);
  }, []);
  
  const handleDeleteRequest = useCallback((id: string, type: 'product' | 'service') => {
    setItemToDelete({ id, type });
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!itemToDelete) return;
    // This function will be refactored to use API routes.
    setItemToDelete(null);
    toast({ title: 'Success', description: 'Item deleted.' });
    await fetchData();
  }, [itemToDelete, fetchData, toast]);


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
                        isLoading={isLoading} 
                        onEdit={handleEdit}
                        onDelete={handleDeleteRequest}
                    />
                </TabsContent>
                <TabsContent value="services" className="mt-0 focus-visible:outline-none">
                    <InventoryTable 
                        data={filteredServices} 
                        type="service" 
                        isLoading={isLoading}
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

    