
'use client';

import { useState, useMemo } from "react";
import { collection, doc, increment, updateDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Plus, Search } from "lucide-react";
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
    const categories = products.map(p => p.description).filter((c): c is string => !!c);
    return [...new Set(categories)];
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
    if (!itemToDelete) return;

    const docRef = doc(firestore, itemToDelete.type === 'product' ? 'products' : 'services', itemToDelete.id);
    deleteDocumentNonBlocking(docRef);
    
    // Close the dialog immediately for optimistic UI update
    setItemToDelete(null);
  };


  const onDialogClose = (isOpen: boolean) => {
    if (!isOpen) {
      setItemToEdit(null);
    }
    setAddItemDialogOpen(isOpen);
  }

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
                    <AddStockDialog products={products ?? []} onAddStock={handleAddStock}>
                        <Button 
                            variant="outline" 
                            className="h-10 px-6 rounded-none border-zinc-200 text-xs uppercase tracking-[0.15em] hover:bg-zinc-50 hover:text-black hover:border-black transition-all"
                        >
                            <Plus className="mr-2 h-3 w-3" />
                            Stock
                        </Button>
                    </AddStockDialog>

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
