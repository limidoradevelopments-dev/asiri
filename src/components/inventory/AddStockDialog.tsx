
'use client';

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Product } from '@/lib/data';
import { WithId } from '@/firebase';

type AddStockDialogProps = {
  children: React.ReactNode;
  products: WithId<Product>[];
  onAddStock: (productId: string, quantity: number) => Promise<void>;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

export function AddStockDialog({ 
  children, 
  products, 
  onAddStock,
  isOpen,
  onOpenChange
}: AddStockDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<WithId<Product> | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset state when the dialog is closed.
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSelectedProduct(null);
      setQuantity(1);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const filteredProducts = useMemo(() => {
    if (!searchQuery) return products;
    const lowercasedQuery = searchQuery.toLowerCase();
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(lowercasedQuery) ||
        product.sku.toLowerCase().includes(lowercasedQuery)
    );
  }, [products, searchQuery]);

  const handleUpdateStock = async () => {
    if (!selectedProduct || quantity <= 0) return;
    
    setIsSubmitting(true);
    try {
      await onAddStock(selectedProduct.id, quantity);
      onOpenChange(false); // Close the dialog on success
    } catch (error) {
      // Error is handled by the parent component's toast.
      // The `finally` block will still run to re-enable the button.
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const commonInputStyles = "rounded-none h-11 text-base";
  const commonButtonStyles = "rounded-none uppercase tracking-widest text-xs h-11";

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent className="sm:max-w-xl rounded-none border-zinc-200">
        <DialogHeader>
          <DialogTitle className="font-light tracking-tight text-2xl">Add Stock</DialogTitle>
          <DialogDescription className="text-zinc-500">
            Select a product and enter the quantity to add to its stock.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-6 py-4">
            {/* Left side: Product Selection */}
            <div className="w-1/2 flex flex-col">
                <div className="relative group mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                    <Input
                        placeholder="Search products..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={cn(commonInputStyles, "pl-10")}
                    />
                </div>
                <ScrollArea className="flex-grow border rounded-none border-zinc-200 h-64">
                   <div className="p-2">
                     {filteredProducts.length > 0 ? (
                        filteredProducts.map((product) => (
                        <button
                            key={product.id}
                            onClick={() => setSelectedProduct(product)}
                            className={cn(
                                "w-full text-left p-2.5 rounded-sm transition-colors text-sm flex justify-between items-center",
                                selectedProduct?.id === product.id
                                    ? "bg-black text-white"
                                    : "hover:bg-zinc-100"
                            )}
                        >
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <p className={cn("text-xs", selectedProduct?.id === product.id ? 'text-zinc-300' : 'text-zinc-400')}>{product.sku}</p>
                          </div>
                           <p className={cn("text-xs font-mono", selectedProduct?.id === product.id ? 'text-zinc-300' : 'text-zinc-400')}>
                                Stock: {product.stock}
                            </p>
                        </button>
                        ))
                     ) : (
                        <div className="text-center p-8 text-xs text-zinc-400 uppercase tracking-widest">
                            No products found
                        </div>
                     )}
                   </div>
                </ScrollArea>
            </div>

            {/* Right side: Quantity Input */}
            <div className="w-1/2 flex flex-col justify-center items-center bg-zinc-50 p-6 rounded-sm">
                {selectedProduct ? (
                    <div className="w-full space-y-4 text-center">
                        <p className="text-lg font-medium">{selectedProduct.name}</p>
                        <div className="space-y-2">
                            <Label htmlFor="quantity" className="text-xs uppercase tracking-widest text-zinc-500">
                                Quantity to Add
                            </Label>
                            <Input
                                id="quantity"
                                type="number"
                                min={1}
                                value={quantity}
                                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                                className={cn(commonInputStyles, "text-center text-2xl h-14")}
                                autoFocus
                            />
                        </div>
                    </div>
                ) : (
                    <div className="text-center text-sm text-zinc-400">
                        <p>Select a product from the list to continue.</p>
                    </div>
                )}
            </div>
        </div>

        <DialogFooter className="gap-2">
          <DialogClose asChild>
            <Button variant="outline" className={commonButtonStyles}>Cancel</Button>
          </DialogClose>
          <Button
            type="button"
            onClick={handleUpdateStock}
            disabled={!selectedProduct || quantity <= 0 || isSubmitting}
            className={commonButtonStyles}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? 'Updating...' : 'Update Stock'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
