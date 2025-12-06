
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ChevronsUpDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Product } from '@/lib/data';
import { WithId } from '@/firebase';

type AddStockDialogProps = {
  children: React.ReactNode;
  products: WithId<Product>[];
  onAddStock: (productId: string, quantity: number) => void;
};

export function AddStockDialog({ children, products, onAddStock }: AddStockDialogProps) {
  const [open, setOpen] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<WithId<Product> | null>(null);
  const [quantity, setQuantity] = useState(1);

  // This useEffect resets the state when the dialog is closed.
  // This is important to ensure the form is clean every time it's opened.
  useEffect(() => {
    if (!open) {
      setSelectedProduct(null);
      setQuantity(1);
      setPopoverOpen(false); // Also ensure the popover is closed
    }
  }, [open]);

  const handleUpdateStock = () => {
    if (selectedProduct && quantity > 0) {
      onAddStock(selectedProduct.id, quantity);
      setOpen(false); // Close the dialog on success
    }
  };
  
  const commonInputStyles = "rounded-none h-11 text-base";
  const commonButtonStyles = "rounded-none uppercase tracking-widest text-xs h-11";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent className="sm:max-w-md rounded-none border-zinc-200">
        <DialogHeader>
          <DialogTitle className="font-light tracking-tight text-2xl">Add Stock</DialogTitle>
          <DialogDescription className="text-zinc-500">
            Select a product and enter the quantity to add to its stock.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Product</Label>
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={popoverOpen}
                  className={cn("w-full justify-between font-normal", commonInputStyles)}
                >
                  {selectedProduct ? selectedProduct.name : 'Select product...'}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>

              <PopoverContent 
                className="w-[--radix-popover-trigger-width] p-0 rounded-none border-zinc-200"
                align="start"
                // This prevents the dialog from trying to autofocus the first element in the popover,
                // which is part of the conflict.
                onOpenAutoFocus={(e) => e.preventDefault()}
              >
                <Command>
                  <CommandInput
                    placeholder="Search product..."
                    className="h-11 border-none focus-visible:ring-0"
                  />
                  <CommandList>
                    <CommandEmpty>No product found.</CommandEmpty>
                    <CommandGroup>
                      {products.map(product => (
                        <CommandItem
                          key={product.id}
                          value={product.name}
                          onSelect={() => {
                            setSelectedProduct(product);
                            setPopoverOpen(false);
                          }}
                          // THE CRITICAL FIX: This prevents the dialog's focus trap from
                          // intercepting the click before the Popover can handle it.
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedProduct?.id === product.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {product.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity to Add</Label>
            <Input
              id="quantity"
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
              className={commonInputStyles}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <DialogClose asChild>
            <Button variant="outline" className={commonButtonStyles}>Cancel</Button>
          </DialogClose>
          <Button
            type="button"
            onClick={handleUpdateStock}
            disabled={!selectedProduct || quantity <= 0}
            className={commonButtonStyles}
          >
            Update Stock
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
