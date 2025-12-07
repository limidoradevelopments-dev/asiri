
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from '@/components/ui/textarea';
import { ChevronsUpDown, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Product } from '@/lib/data';
import { WithId } from '@/firebase';
import { useToast } from '@/hooks/use-toast';

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
  const [productPopoverOpen, setProductPopoverOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<z.infer<typeof adjustmentSchema>>({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: {
      productId: '',
      action: undefined,
      quantity: undefined,
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
                        <Popover
                          modal={false}
                          open={productPopoverOpen}
                          onOpenChange={setProductPopoverOpen}
                        >
                            <PopoverTrigger asChild>
                            <FormControl>
                                <Button
                                variant="outline"
                                role="combobox"
                                className={cn("justify-between font-normal", commonInputStyles, !field.value && "text-muted-foreground")}
                                >
                                {field.value ? products.find(p => p.id === field.value)?.name : "Select product"}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0 rounded-none">
                            <Command>
                                <CommandInput placeholder="Search product..." />
                                <CommandList>
                                <CommandEmpty>No product found.</CommandEmpty>
                                <CommandGroup>
                                    {products.map(product => (
                                    <CommandItem
                                        value={product.name}
                                        key={product.id}
                                        onSelect={() => {
                                        form.setValue("productId", product.id);
                                        setProductPopoverOpen(false);
                                        }}
                                    >
                                        <Check className={cn("mr-2 h-4 w-4", product.id === field.value ? "opacity-100" : "opacity-0")} />
                                        <div>
                                            <p>{product.name}</p>
                                            <p className="text-xs text-muted-foreground">Stock: {product.stock}</p>
                                        </div>
                                    </CommandItem>
                                    ))}
                                </CommandGroup>
                                </CommandList>
                            </Command>
                            </PopoverContent>
                        </Popover>
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
