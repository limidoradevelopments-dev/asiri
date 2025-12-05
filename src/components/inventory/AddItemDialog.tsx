
'use client';

import { useState } from 'react';
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
import type { Product, Service } from '@/lib/data';

const productSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  sku: z.string().min(1, 'SKU is required'),
  category: z.string().min(1, 'Category is required'),
  stockThreshold: z.coerce.number().int().min(0, 'Re-order level cannot be negative'),
  actualPrice: z.coerce.number().min(0, 'Price cannot be negative'),
  sellingPrice: z.coerce.number().min(0, 'Price cannot be negative'),
});

const serviceSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  price: z.coerce.number().min(0, 'Price cannot be negative'),
});

type AddItemDialogProps = {
  children: React.ReactNode;
  onAddItem: (item: Product | Service, type: 'product' | 'service') => void;
};

export function AddItemDialog({ children, onAddItem }: AddItemDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  
  const productForm = useForm<z.infer<typeof productSchema>>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      sku: '',
      category: '',
      stockThreshold: 0,
      actualPrice: 0,
      sellingPrice: 0,
    },
  });

  const serviceForm = useForm<z.infer<typeof serviceSchema>>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: '',
      description: '',
      price: 0,
    },
  });

  const onProductSubmit = (values: z.infer<typeof productSchema>) => {
    const newProduct: Product = {
      id: `PROD-${Date.now()}`,
      stock: 0, // Initialize stock at 0
      ...values,
    };
    onAddItem(newProduct, 'product');
    toast({ title: 'Product Added', description: `${values.name} has been added.` });
    productForm.reset();
    setOpen(false);
  };

  const onServiceSubmit = (values: z.infer<typeof serviceSchema>) => {
    const newService: Service = {
      id: `SERV-${Date.now()}`,
      ...values,
    };
    onAddItem(newService, 'service');
    toast({ title: 'Service Added', description: `${values.name} has been added.` });
    serviceForm.reset();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Item</DialogTitle>
          <DialogDescription>
            Add a new product or service to your inventory.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="product" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="product">Product</TabsTrigger>
            <TabsTrigger value="service">Service</TabsTrigger>
          </TabsList>
          <TabsContent value="product">
            <Form {...productForm}>
              <form onSubmit={productForm.handleSubmit(onProductSubmit)} className="space-y-4 py-4">
                <FormField
                  control={productForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Synthetic Oil 5L" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={productForm.control}
                  name="sku"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SKU</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., OIL-SYN-5L" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={productForm.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Engine Oils" {...field} />
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
                        <FormLabel>Actual Price (Rs.)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} />
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
                          <Input type="number" step="0.01" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <FormField
                    control={productForm.control}
                    name="stockThreshold"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Re-order Level</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <DialogFooter className="mt-6">
                  <DialogClose asChild>
                    <Button type="submit">Add Product</Button>
                  </DialogClose>
                </DialogFooter>
              </form>
            </Form>
          </TabsContent>
          <TabsContent value="service">
            <Form {...serviceForm}>
              <form onSubmit={serviceForm.handleSubmit(onServiceSubmit)} className="space-y-4 py-4">
                <FormField
                  control={serviceForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Service Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Full Service Package" {...field} />
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
                        <Input placeholder="e.g., Comprehensive vehicle maintenance" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={serviceForm.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price (Rs.)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter className="mt-6">
                  <DialogClose asChild>
                    <Button type="submit">Add Service</Button>
                  </DialogClose>
                </DialogFooter>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
