
// app/inventory/page.tsx
'use client';

import { useState, useMemo, useCallback, useEffect } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Plus, Search, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Product as ProductType, Service as ServiceType } from "@/lib/data";
import InventoryTable from "@/components/inventory/InventoryTable";
import { AddItemDialog } from "@/components/inventory/AddItemDialog";
import { AddStockDialog } from "@/components/inventory/AddStockDialog";
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

type WithId<T> = T & { id: string };

const ProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  sku: z.string(),
  description: z.string().optional().nullable(),
  stock: z.number(),
  stockThreshold: z.number(),
  actualPrice: z.number(),
  sellingPrice: z.number(),
});
const ProductsSchema = z.array(ProductSchema);

const ServiceSchema = z.object({
    id: z.string(),
    name: z.string(),
    price: z.number(),
    description: z.string().optional().nullable(),
    vehicleCategory: z.enum(["Bike", "Car", "Van", "Jeep", "Lorry"]).optional().nullable(),
});
const ServicesSchema = z.array(ServiceSchema);


export default function InventoryPage() {
  const { toast } = useToast();

  const [products, setProducts] = useState<WithId<ProductType>[]>([]);
  const [services, setServices] = useState<WithId<ServiceType>[]>([]);
  const [initialLoad, setInitialLoad] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (signal: AbortSignal, isRefresh = false) => {
    try {
      if (!isRefresh) {
        setInitialLoad(true);
      } else {
        setRefreshing(true);
      }
      const [productsRes, servicesRes] = await Promise.all([
        fetch('/api/products', { signal }),
        fetch('/api/services', { signal }),
      ]);

      if (!productsRes.ok) throw new Error('Failed to fetch products');
      if (!servicesRes.ok) throw new Error('Failed to fetch services');
      
      const productsJson = await productsRes.json();
      const servicesJson = await servicesRes.json();

      const validatedProducts = ProductsSchema.safeParse(productsJson);
      const validatedServices = ServicesSchema.safeParse(servicesJson);

      if (!validatedProducts.success) {
        console.error("Product validation error:", validatedProducts.error);
        throw new Error('Invalid product data received from server.');
      }
      if (!validatedServices.success) {
        console.error("Service validation error:", validatedServices.error);
        throw new Error('Invalid service data received from server.');
      }

      setProducts(validatedProducts.data as WithId<ProductType>[]);
      setServices(validatedServices.data as WithId<ServiceType>[]);

    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log("Fetch aborted");
        return;
      }
      console.error(err);
      const message = err instanceof Error ? err.message : 'Could not fetch inventory data.';
      toast({ variant: 'destructive', title: 'Error', description: message });
    } finally {
      if (!isRefresh) {
        setInitialLoad(false);
      }
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    
    return () => {
      controller.abort();
    };
  }, [fetchData]);

  const [searchQuery, setSearchQuery] = useState("");
  const [isAddStockDialogOpen, setAddStockDialogOpen] = useState(false);

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (!searchQuery) return products;
    const q = searchQuery.toLowerCase();
    return products.filter(p => (p.name || "").toLowerCase().includes(q) || (p.sku || "").toLowerCase().includes(q));
  }, [products, searchQuery]);

  const filteredServices = useMemo(() => {
    if (!services) return [];
    if (!searchQuery) return services;
    const q = searchQuery.toLowerCase();
    return services.filter(s => (s.name || "").toLowerCase().includes(q));
  }, [services, searchQuery]);

  const [itemToEdit, setItemToEdit] = useState<WithId<ProductType> | WithId<ServiceType> | null>(null);
  const [isAddItemDialogOpen, setAddItemDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{id: string, type: 'product' | 'service'} | null>(null);

  const handleUpsertItem = useCallback(
    async (item: Omit<ProductType, 'id'> | Omit<ServiceType, 'id'>, type: 'product' | 'service', id?: string): Promise<boolean> => {
      try {
        const endpoint = type === 'product' ? "/api/products" : "/api/services";
        const method = id ? "PUT" : "POST";
        const body = JSON.stringify(id ? { id, ...item } : item);

        const res = await fetch(endpoint, {
          method,
          headers: { "Content-Type": "application/json" },
          body,
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Failed to save item.');
        }
        
        toast({ title: id ? "Updated" : "Created", description: "Item saved successfully." });
        
        const refreshController = new AbortController();
        fetchData(refreshController.signal, true);
        return true;

      } catch (err: any) {
        if (err.name === 'AbortError') return false;
        console.error("Upsert error:", err);
        const message = err instanceof Error ? err.message : 'Unknown error occurred while saving the item.';
        toast({ variant: 'destructive', title: 'Error', description: message });
        return false;
      } finally {
        setItemToEdit(null);
        setAddItemDialogOpen(false);
      }
    },
    [fetchData, toast]
  );
  
  const handleAddStock = useCallback(async (productId: string, quantity: number): Promise<void> => {
    try {
      const res = await fetch("/api/products/add-stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to update stock");
      }

      toast({ title: "Stock Updated", description: `Added ${quantity} to stock.` });
      const updatedProduct = await res.json();
      setProducts(prev => prev.map(p => p.id === productId ? updatedProduct : p));

    } catch (err: any) {
      console.error("Add stock error:", err);
      const message = err instanceof Error ? err.message : 'An unknown error occurred while adding stock.';
      toast({ variant: 'destructive', title: 'Error', description: message });
      const refreshController = new AbortController();
      fetchData(refreshController.signal, true); // Re-fetch on error to ensure data consistency
      throw err; // Re-throw to allow dialog to handle submitting state
    }
  }, [fetchData, toast]);


  const confirmDelete = useCallback(async () => {
    if (!itemToDelete) return;
    const { id, type } = itemToDelete;
    
    if (type === 'product') setProducts(prev => prev.filter(p => p.id !== id));
    else setServices(prev => prev.filter(s => s.id !== id));
    
    try {
      const endpoint = type === 'product' ? "/api/products" : "/api/services";
      const res = await fetch(`${endpoint}?id=${encodeURIComponent(id)}`, { method: "DELETE" });

      if (!res.ok) {
        throw new Error("Delete failed on the server.");
      }

      toast({ title: "Deleted", description: "Item successfully deleted." });
    } catch (err) {
      console.error("Delete error:", err);
      const message = err instanceof Error ? err.message : 'An unknown error occurred while deleting the item.';
      toast({ variant: 'destructive', title: 'Error', description: message });
      const refreshController = new AbortController();
      fetchData(refreshController.signal, true);
    } finally {
      setItemToDelete(null);
    }
  }, [itemToDelete, fetchData, toast]);

  const handleEdit = useCallback((item: WithId<ProductType> | WithId<ServiceType>) => {
    setItemToEdit(item);
    setAddItemDialogOpen(true);
  }, []);

  const handleDeleteRequest = useCallback((id: string, type: 'product' | 'service') => {
    setItemToDelete({ id, type });
  }, []);

  const onDialogClose = useCallback((isOpen: boolean) => {
    if (!isOpen) setItemToEdit(null);
    setAddItemDialogOpen(isOpen);
  }, []);

  return (
    <div className="relative z-10 w-full max-w-7xl mx-auto px-12 pt-8 pb-12">
      <div className="flex justify-between items-start mb-16 gap-8">
        <div>
          <h1 className="text-5xl font-light tracking-tighter mb-2">INVENTORY</h1>
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">Manage Stock & Services</p>
        </div>

        <div className="flex items-end gap-8 w-auto">
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
              isLoading={initialLoad}
              onEdit={handleEdit}
              onDelete={handleDeleteRequest}
            />
          </TabsContent>
          <TabsContent value="services" className="mt-0 focus-visible:outline-none">
            <InventoryTable
              data={filteredServices}
              type="service"
              isLoading={initialLoad}
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
