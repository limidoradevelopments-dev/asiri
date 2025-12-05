
'use client';

import { useState, useEffect } from 'react';
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
import { WithId } from '@/firebase';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PlusCircle } from 'lucide-react';
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
  vehicleCategory: z.string().min(1, 'Vehicle Category is required'),
});

type AddItemDialogProps = {
  children: React.ReactNode;
  onUpsertItem: (item: Omit<Product, 'id'> | Omit<Service, 'id'>, type: 'product' | 'service', id?: string) => void;
  productCategories: string[];
  setProductCategories: React.Dispatch<React.SetStateAction<string[]>>;
  vehicleCategories: string[];
  setVehicleCategories: React.Dispatch<React.SetStateAction<string[]>>;
  itemToEdit?: WithId<Product> | WithId<Service> | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

export function AddItemDialog({ 
  children, 
  onUpsertItem, 
  productCategories, 
  setProductCategories,
  vehicleCategories,
  setVehicleCategories,
  itemToEdit, 
  isOpen, 
  onOpenChange 
}: AddItemDialogProps) {
  const [showNewProductCategoryDialog, setShowNewProductCategoryDialog] = useState(false);
  const [newProductCategory, setNewProductCategory] = useState('');
  const [showNewVehicleCategoryDialog, setShowNewVehicleCategoryDialog] = useState(false);
  const [newVehicleCategory, setNewVehicleCategory] = useState('');
  const { toast } = useToast();
  
  const isEditMode = !!itemToEdit;
  const itemType = itemToEdit ? ('sku' in itemToEdit ? 'product' : 'service') : 'product';
  
  const productForm = useForm<z.infer<typeof productSchema>>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '', sku: '', category: '', stockThreshold: 0, actualPrice: 0, sellingPrice: 0,
    },
  });

  const serviceForm = useForm<z.infer<typeof serviceSchema>>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: '', description: '', price: 0, vehicleCategory: '',
    },
  });

  useEffect(() => {
    if (isEditMode && itemToEdit) {
      if ('sku' in itemToEdit) { // It's a Product
        productForm.reset(itemToEdit);
      } else { // It's a Service
        serviceForm.reset(itemToEdit);
      }
    } else {
      productForm.reset({
        name: '', sku: '', category: '', stockThreshold: 0, actualPrice: 0, sellingPrice: 0,
      });
      serviceForm.reset({
        name: '', description: '', price: 0, vehicleCategory: ''
      });
    }
  }, [itemToEdit, isEditMode, productForm, serviceForm, isOpen]);


  const onProductSubmit = (values: z.infer<typeof productSchema>) => {
    const stockValue = (isEditMode && itemToEdit && 'stock' in itemToEdit) ? itemToEdit.stock : 0;
    const productData: Omit<Product, 'id'> = {
      ...values,
      stock: stockValue,
    };
    onUpsertItem(productData, 'product', itemToEdit?.id);
    toast({ title: isEditMode ? 'Product Updated' : 'Product Added', description: `${values.name} has been saved.` });
    onOpenChange(false);
  };

  const onServiceSubmit = (values: z.infer<typeof serviceSchema>) => {
    onUpsertItem(values, 'service', itemToEdit?.id);
    toast({ title: isEditMode ? 'Service Updated' : 'Service Added', description: `${values.name} has been saved.` });
    onOpenChange(false);
  };

  const handleAddNewProductCategory = () => {
    if (newProductCategory && !productCategories.includes(newProductCategory)) {
      setProductCategories((prev) => [...prev, newProductCategory]);
      productForm.setValue('category', newProductCategory);
    }
    setShowNewProductCategoryDialog(false);
    setNewProductCategory('');
  };

  const handleAddNewVehicleCategory = () => {
    if (newVehicleCategory && !vehicleCategories.includes(newVehicleCategory)) {
      setVehicleCategories((prev) => [...prev, newVehicleCategory]);
      serviceForm.setValue('vehicleCategory', newVehicleCategory);
    }
    setShowNewVehicleCategoryDialog(false);
    setNewVehicleCategory('');
  };

  const commonInputStyles = "rounded-none h-11 text-base";
  const commonButtonStyles = "rounded-none uppercase tracking-widest text-xs h-11";

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className="sm:max-w-lg rounded-none border-zinc-200">
          <DialogHeader>
            <DialogTitle className="font-light tracking-tight text-2xl">{isEditMode ? 'Edit Item' : 'Add New Item'}</DialogTitle>
            <DialogDescription className="text-zinc-500">
              {isEditMode ? 'Update the details of the item.' : 'Add a new product or service to your inventory.'}
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue={itemType} className="mt-4">
            <TabsList className="grid w-full grid-cols-2 bg-zinc-100 rounded-none h-11">
              <TabsTrigger value="product" disabled={isEditMode && itemType === 'service'} className="rounded-none data-[state=active]:bg-white data-[state=active]:shadow-none h-full uppercase text-xs tracking-widest">Product</TabsTrigger>
              <TabsTrigger value="service" disabled={isEditMode && itemType === 'product'} className="rounded-none data-[state=active]:bg-white data-[state=active]:shadow-none h-full uppercase text-xs tracking-widest">Service</TabsTrigger>
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
                          <Input placeholder="e.g., Synthetic Oil 5L" {...field} className={commonInputStyles} />
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
                          <Input placeholder="e.g., OIL-SYN-5L" {...field} className={commonInputStyles} />
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
                        <Select
                          onValueChange={(value) => {
                            if (value === 'add-new') {
                              setShowNewProductCategoryDialog(true);
                            } else {
                              field.onChange(value);
                            }
                          }}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className={commonInputStyles}>
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-none border-zinc-200">
                            {productCategories.map((category) => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                             <button
                              type="button"
                              className="relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none"
                              onClick={(e) => {
                                e.preventDefault();
                                setShowNewProductCategoryDialog(true);
                              }}
                            >
                              <PlusCircle className="mr-2 h-4 w-4" /> Add New Category
                            </button>
                          </SelectContent>
                        </Select>
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
                  <FormField
                      control={productForm.control}
                      name="stockThreshold"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Re-order Level</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} className={commonInputStyles} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  <DialogFooter className="mt-6 gap-2">
                    <DialogClose asChild>
                      <Button type="button" variant="outline" className={commonButtonStyles}>Cancel</Button>
                    </DialogClose>
                    <Button type="submit" className={commonButtonStyles}>{isEditMode ? 'Save Changes' : 'Add Product'}</Button>
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
                          <Input placeholder="e.g., Full Service Package" {...field} className={commonInputStyles}/>
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
                        <FormLabel>Vehicle Category</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            if (value === 'add-new') {
                              setShowNewVehicleCategoryDialog(true);
                            } else {
                              field.onChange(value);
                            }
                          }} 
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className={commonInputStyles}>
                              <SelectValue placeholder="Select a vehicle category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-none border-zinc-200">
                            {vehicleCategories.map(category => (
                              <SelectItem key={category} value={category}>{category}</SelectItem>
                            ))}
                            <button
                              type="button"
                              className="relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none"
                              onClick={(e) => {
                                e.preventDefault();
                                setShowNewVehicleCategoryDialog(true);
                              }}
                            >
                              <PlusCircle className="mr-2 h-4 w-4" /> Add New Category
                            </button>
                          </SelectContent>
                        </Select>
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
                          <Input placeholder="e.g., Comprehensive vehicle maintenance" {...field} className={commonInputStyles}/>
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
                          <Input type="number" step="0.01" {...field} className={commonInputStyles} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter className="mt-6 gap-2">
                    <DialogClose asChild>
                      <Button type="button" variant="outline" className={commonButtonStyles}>Cancel</Button>
                    </DialogClose>
                    <Button type="submit" className={commonButtonStyles}>{isEditMode ? 'Save Changes' : 'Add Service'}</Button>
                  </DialogFooter>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
      <AlertDialog open={showNewProductCategoryDialog} onOpenChange={setShowNewProductCategoryDialog}>
        <AlertDialogContent className="rounded-none border-zinc-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-light tracking-tight text-xl">Add a new category</AlertDialogTitle>
            <AlertDialogDescription>
              Enter the name for the new product category you want to create.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            placeholder="e.g., Brakes"
            value={newProductCategory}
            onChange={(e) => setNewProductCategory(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddNewProductCategory();
              }
            }}
            className={commonInputStyles}
          />
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel className={commonButtonStyles}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleAddNewProductCategory} className={commonButtonStyles}>Add</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={showNewVehicleCategoryDialog} onOpenChange={setShowNewVehicleCategoryDialog}>
        <AlertDialogContent className="rounded-none border-zinc-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-light tracking-tight text-xl">Add a new vehicle category</AlertDialogTitle>
            <AlertDialogDescription>
              Enter the name for the new vehicle category you want to create.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            placeholder="e.g., Truck"
            value={newVehicleCategory}
            onChange={(e) => setNewVehicleCategory(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddNewVehicleCategory();
              }
            }}
             className={commonInputStyles}
          />
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel className={commonButtonStyles}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleAddNewVehicleCategory} className={commonButtonStyles}>Add</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

    