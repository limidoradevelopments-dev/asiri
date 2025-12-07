
'use client';

import { useState, useEffect, useCallback } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import type { Product, Service, VehicleCategory } from '@/lib/data';
import { WithId } from '@/firebase';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Car, Truck, Bike } from 'lucide-react';
import { VanIcon } from '../icons/VanIcon';
import { JeepIcon } from '../icons/JeepIcon';

// --- Schemas ---

const productSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  sku: z.string().min(1, 'SKU is required'),
  description: z.string().optional(),
  stockThreshold: z.coerce.number().int().min(0, 'Re-order level cannot be negative'),
  actualPrice: z.coerce.number().min(0, 'Price cannot be negative'),
  sellingPrice: z.coerce.number().min(0, 'Price cannot be negative'),
}).refine((data) => data.sellingPrice >= data.actualPrice, {
  message: 'Selling price must be higher than actual price',
  path: ['sellingPrice'],
});

const serviceSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  price: z.coerce.number().min(0, 'Price cannot be negative'),
  vehicleCategory: z.enum(["Bike", "Car", "Van", "Jeep", "Lorry"]).optional(),
});

// --- Types ---

type AddItemDialogProps = {
  children: React.ReactNode;
  onUpsertItem: (item: Omit<Product, 'id'> | Omit<Service, 'id'>, type: 'product' | 'service', id?: string) => void;
  itemToEdit?: WithId<Product> | WithId<Service> | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

// --- Component ---

export function AddItemDialog({
  children,
  onUpsertItem,
  itemToEdit,
  isOpen,
  onOpenChange
}: AddItemDialogProps) {
  
  const { toast } = useToast();
  
  const isEditMode = !!itemToEdit;
  const itemType = itemToEdit ? ('sku' in itemToEdit ? 'product' : 'service') : 'product';

  const productForm = useForm<z.infer<typeof productSchema>>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '', sku: '', description: '', stockThreshold: 0, actualPrice: 0, sellingPrice: 0,
    },
  });

  const serviceForm = useForm<z.infer<typeof serviceSchema>>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: '', description: '', price: 0, vehicleCategory: undefined,
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (isEditMode && itemToEdit) {
        if ('sku' in itemToEdit) {
          productForm.reset({ ...(itemToEdit as WithId<Product>), description: (itemToEdit as WithId<Product>).description || "" });
        } else {
          serviceForm.reset(itemToEdit as WithId<Service>);
        }
      } else {
        productForm.reset({
          name: '', sku: '', description: '', stockThreshold: 5, actualPrice: 0, sellingPrice: 0,
        });
        serviceForm.reset({
          name: '', description: '', price: 0, vehicleCategory: undefined
        });
      }
    }
  }, [itemToEdit, isEditMode, productForm, serviceForm, isOpen]);

  const onProductSubmit = (values: z.infer<typeof productSchema>) => {
    const productData: Omit<Product, 'id'> = {
      ...values,
      stock: isEditMode && itemToEdit && 'stock' in itemToEdit ? itemToEdit.stock : 0,
    };
    onUpsertItem(productData, 'product', itemToEdit?.id);
    toast({ 
      title: isEditMode ? 'Product Updated' : 'Product Added', 
      description: `${values.name} has been saved successfully.` 
    });
    onOpenChange(false);
  };

  const onServiceSubmit = (values: z.infer<typeof serviceSchema>) => {
    onUpsertItem(values, 'service', itemToEdit?.id);
    toast({ 
      title: isEditMode ? 'Service Updated' : 'Service Added', 
      description: `${values.name} has been saved successfully.` 
    });
    onOpenChange(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Prevents form submission on pressing Enter in an input field
    if (e.key === 'Enter' && e.target instanceof HTMLInputElement && e.target.type !== 'submit') {
      e.preventDefault();
    }
  };

  const commonInputStyles = "rounded-none h-11 text-base";
  const commonButtonStyles = "rounded-none uppercase tracking-widest text-xs h-11";

  const categoryIcons: Record<VehicleCategory, React.ElementType> = {
    "Bike": Bike,
    "Car": Car,
    "Van": VanIcon,
    "Jeep": JeepIcon,
    "Lorry": Truck,
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className="sm:max-w-lg rounded-none border-zinc-200">
          <DialogHeader>
            <DialogTitle className="font-light tracking-tight text-2xl">
              {isEditMode ? 'Edit Item' : 'Add New Item'}
            </DialogTitle>
            <DialogDescription className="text-zinc-500">
              {isEditMode ? 'Update the details of the selected item.' : 'Add a new product or service to your inventory.'}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue={itemType} className="mt-4">
            <TabsList className="grid w-full grid-cols-2 bg-zinc-100 rounded-none h-11">
              <TabsTrigger 
                value="product" 
                disabled={isEditMode && itemType === 'service'} 
                className="rounded-none data-[state=active]:bg-white data-[state=active]:shadow-none h-full uppercase text-xs tracking-widest"
              >
                Product
              </TabsTrigger>
              <TabsTrigger 
                value="service" 
                disabled={isEditMode && itemType === 'product'} 
                className="rounded-none data-[state=active]:bg-white data-[state=active]:shadow-none h-full uppercase text-xs tracking-widest"
              >
                Service
              </TabsTrigger>
            </TabsList>

            <TabsContent value="product">
              <Form {...productForm}>
                <form onSubmit={productForm.handleSubmit(onProductSubmit)} onKeyDown={handleKeyDown} className="space-y-4 py-4">
                  <FormField
                    control={productForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Synthetic Oil 5L" {...field} className={commonInputStyles} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={productForm.control}
                      name="sku"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SKU</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., OIL-SYN-5L" {...field} className={commonInputStyles} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={productForm.control}
                      name="stockThreshold"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Re-order Alert Level</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} className={commonInputStyles} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                      control={productForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description (Optional)</FormLabel>
                          <FormControl>
                            <Textarea placeholder="e.g., High-performance synthetic oil for modern engines." {...field} className="rounded-none text-base" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={productForm.control}
                      name="actualPrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cost Price (Rs.)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} className={commonInputStyles}/>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={productForm.control}
                      name="sellingPrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Selling Price (Rs.)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} className={commonInputStyles}/>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <DialogFooter className="mt-6 gap-2">
                    <DialogClose asChild>
                      <Button type="button" variant="outline" className={commonButtonStyles}>Cancel</Button>
                    </DialogClose>
                    <Button type="submit" className={commonButtonStyles}>
                        {isEditMode ? 'Save Changes' : 'Add Product'}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="service">
              <Form {...serviceForm}>
                <form onSubmit={serviceForm.handleSubmit(onServiceSubmit)} onKeyDown={handleKeyDown} className="space-y-4 py-4">
                  <FormField
                    control={serviceForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Service Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Full Service Package" {...field} className={commonInputStyles}/>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={serviceForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="e.g., Comprehensive vehicle maintenance including oil change, filter replacement..." {...field} className="rounded-none text-base" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                     <FormField
                        control={serviceForm.control}
                        name="price"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Service Price (Rs.)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" {...field} className={commonInputStyles} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={serviceForm.control}
                        name="vehicleCategory"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Vehicle Category (Optional)</FormLabel>
                             <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className={commonInputStyles}>
                                    <SelectValue placeholder="Select a category" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="rounded-none border-zinc-200">
                                   {(["Bike", "Car", "Van", "Jeep", "Lorry"] as VehicleCategory[]).map(cat => {
                                      const Icon = categoryIcons[cat];
                                      return (
                                        <SelectItem key={cat} value={cat}>
                                          <div className="flex items-center gap-2">
                                            <Icon className="w-4 h-4 text-zinc-500" />
                                            <span>{cat}</span>
                                          </div>
                                        </SelectItem>
                                      )
                                   })}
                                </SelectContent>
                              </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                  </div>
                  <DialogFooter className="mt-6 gap-2">
                    <DialogClose asChild>
                      <Button type="button" variant="outline" className={commonButtonStyles}>Cancel</Button>
                    </DialogClose>
                    <Button type="submit" className={commonButtonStyles}>
                        {isEditMode ? 'Save Changes' : 'Add Service'}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}
    
