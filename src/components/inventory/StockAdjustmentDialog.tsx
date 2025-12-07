
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Product } from '@/lib/data';
import { WithId } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '../ui/scroll-area';

type StockAdjustmentDialogProps = {
  children: React.ReactNode;
  products: WithId<Product>[];
  onSuccess: () => void;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

const adjustmentSchema = z.object({
  productId: z.string().min(1, 'Product is required.'),
  action: z.enum(['decrement', 'delete'], {
    required_error: 'You must select an action.',
  }),
  quantity: z.coerce.number().int().optional(),
  reason: z.string().min(10, 'Reason must be at least 10 characters.'),
}).refine(data => {
    if (data.action === 'decrement') {
        return data.quantity !== undefined && data.quantity > 0;
    }
    return true;
}, {
    message: 'Quantity must be a positive number for decrement.',
    path: ['quantity'],
});

export function StockAdjustmentDialog({
  children,
  products,
  onSuccess,
  isOpen,
  onOpenChange,
}: StockAdjustmentDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<z.infer<typeof adjustmentSchema>>({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: {
      productId: '',
      action: undefined,
      quantity: '' as any,
      reason: '',
    },
  });
  
  const selectedAction = form.watch('action');
  const selectedProductId = form.watch('productId');

  const selectedProduct = useMemo(() => {
    return products.find(p => p.id === selectedProductId);
  }, [selectedProductId, products]);


  useEffect(() => {
    if (!isOpen) {
      form.reset();
      setIsSubmitting(false);
    }
  }, [isOpen, form]);

  const onSubmit = async (values: z.infer<typeof adjustmentSchema>) => {
    setIsSubmitting(true);
    
    if (values.action === 'decrement' && selectedProduct && values.quantity! > selectedProduct.stock) {
        form.setError('quantity', {
            type: 'manual',
            message: `Cannot decrement more than the current stock (${selectedProduct.stock}).`
        });
        setIsSubmitting(false);
        return;
    }

    try {
        const res = await fetch('/api/products/adjust-stock', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(values),
        });

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || 'Failed to perform stock adjustment.');
        }

        toast({
            title: 'Success',
            description: `Stock adjustment for ${selectedProduct?.name} completed successfully.`,
        });
        onSuccess();
        onOpenChange(false);
    } catch (err: any) {
        toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const commonInputStyles = "rounded-none h-11 text-base";
  const commonButtonStyles = "rounded-none uppercase tracking-widest text-xs h-11";

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg rounded-none border-zinc-200">
        <DialogHeader>
          <DialogTitle className="font-light tracking-tight text-2xl">Stock Adjustment</DialogTitle>
          <DialogDescription className="text-zinc-500">
            Decrement stock count or delete a product with a mandatory reason for auditing.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
                <FormField
                    control={form.control}
                    name="productId"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                            <FormLabel>Product</FormLabel>
                            <ProductSelector
                                products={products}
                                selectedId={field.value}
                                onSelect={(id) => form.setValue('productId', id, { shouldValidate: true })}
                            />
                            <FormMessage />
                        </FormItem>
                    )}
                />
            
            <FormField
              control={form.control}
              name="action"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Action</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex space-x-4"
                    >
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="decrement" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Decrement Stock
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="delete" />
                        </FormControl>
                        <FormLabel className="font-normal text-red-600">
                          Delete Product
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedAction === 'decrement' && (
                <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Quantity to Decrement</FormLabel>
                            <FormControl>
                                <Input type="number" placeholder="e.g., 5" {...field} className={commonInputStyles}/>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            )}
            
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason for Adjustment</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., Damaged during transit, stock count correction, product expired..."
                      className="resize-none rounded-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4 gap-2">
              <Button type="button" variant="outline" className={commonButtonStyles} onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" className={commonButtonStyles} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Adjustment
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}


// --- Product Selector Sub-component ---
function ProductSelector({ products, selectedId, onSelect }: {
  products: WithId<Product>[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const selectedProduct = useMemo(() => products.find(p => p.id === selectedId), [products, selectedId]);

  const filteredProducts = useMemo(() => {
    if (!searchQuery) return products;
    const lowercasedQuery = searchQuery.toLowerCase();
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(lowercasedQuery) ||
        product.sku.toLowerCase().includes(lowercasedQuery)
    );
  }, [products, searchQuery]);

  const handleSelect = (id: string) => {
    onSelect(id);
    setIsOpen(false);
    setSearchQuery('');
  }

  return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className={cn(
              "justify-start font-normal rounded-none h-11 text-base w-full",
              !selectedId && "text-muted-foreground"
            )}
          >
            {selectedProduct ? selectedProduct.name : "Select product"}
          </Button>
        </SheetTrigger>
        <SheetContent className="w-[400px] sm:w-[540px] p-0 flex flex-col">
            <SheetHeader className="p-6 pb-4">
                <SheetTitle>Select a Product</SheetTitle>
                <SheetDescription>Search for and choose the product to adjust.</SheetDescription>
            </SheetHeader>
            <div className="relative px-6 mb-4">
              <Search className="absolute left-9 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <Input
                  placeholder="Search by name or SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={cn("rounded-md h-11 text-base pl-10")}
              />
            </div>
            <ScrollArea className="flex-1 px-6">
               <div className="pb-6">
                 {filteredProducts.length > 0 ? (
                    filteredProducts.map((product) => (
                    <button
                        key={product.id}
                        onClick={() => handleSelect(product.id)}
                        className={cn(
                            "w-full text-left p-2.5 my-1 rounded-md transition-colors text-sm flex justify-between items-center",
                            selectedId === product.id
                                ? "bg-black text-white"
                                : "hover:bg-zinc-100"
                        )}
                    >
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className={cn("text-xs", selectedId === product.id ? 'text-zinc-300' : 'text-zinc-400')}>{product.sku}</p>
                      </div>
                       <p className={cn("text-xs font-mono", selectedId === product.id ? 'text-zinc-300' : 'text-zinc-400')}>
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
        </SheetContent>
      </Sheet>
  )
}
