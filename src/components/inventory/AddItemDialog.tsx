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
  SelectSeparator,
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

// --- Schemas ---

const productSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  sku: z.string().min(1, 'SKU is required'),
  category: z.string().min(1, 'Category is required'),
  stock: z.coerce.number().int().min(0, 'Stock cannot be negative'), // Added Stock field
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
  vehicleCategory: z.string().min(1, 'Vehicle Category is required'),
});

// --- Types ---

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

// --- Component ---

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
  // State for nested dialogs
  const [showNewProductCategoryDialog, setShowNewProductCategoryDialog] = useState(false);
  const [newProductCategory, setNewProductCategory] = useState('');
  
  const [showNewVehicleCategoryDialog, setShowNewVehicleCategoryDialog] = useState(false);
  const [newVehicleCategory, setNewVehicleCategory] = useState('');
  
  const { toast } = useToast();
  
  const isEditMode = !!itemToEdit;
  // Determine initial tab based on the item being edited
  const itemType = itemToEdit ? ('sku' in itemToEdit ? 'product' : 'service') : 'product';
  const [activeTab, setActiveTab] = useState(itemType);

  const productForm = useForm<z.infer<typeof productSchema>>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '', sku: '', category: '', stock: 0, stockThreshold: 0, actualPrice: 0, sellingPrice: 0,
    },
  });

  const serviceForm = useForm<z.infer<typeof serviceSchema>>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: '', description: '', price: 0, vehicleCategory: '',
    },
  });

  // Reset forms when dialog opens/closes or itemToEdit changes
  useEffect(() => {
    if (isOpen) {
      const newActiveTab = itemToEdit ? ('sku' in itemToEdit ? 'product' : 'service') : 'product';
      setActiveTab(newActiveTab);
      if (isEditMode && itemToEdit) {
        if ('sku' in itemToEdit) {
          // Editing Product
          productForm.reset({
            ...itemToEdit,
            stock: itemToEdit.stock || 0, // Ensure stock is mapped
          });
        } else {
          // Editing Service
          serviceForm.reset(itemToEdit);
        }
      } else {
        // Adding New - Reset to clean state
        productForm.reset({
          name: '', sku: '', category: '', stock: 0, stockThreshold: 5, actualPrice: 0, sellingPrice: 0,
        });
        serviceForm.reset({
          name: '', description: '', price: 0, vehicleCategory: ''
        });
      }
    }
  }, [itemToEdit, isEditMode, productForm, serviceForm, isOpen]);


  const onProductSubmit = (values: z.infer<typeof productSchema>) => {
    // If editing, we generally preserve existing stock via the logic, 
    // but here we allow editing stock directly if needed, or pass the form value.
    onUpsertItem(values, 'product', itemToEdit?.id);
    
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

  // --- Handlers for Adding Categories ---

  const handleAddNewProductCategory = () => {
    if (newProductCategory.trim() && !productCategories.includes(newProductCategory)) {
      setProductCategories((prev) => [...prev, newProductCategory]);
      // UX Improvement: Auto select the new category
      productForm.setValue('category', newProductCategory); 
      productForm.clearErrors('category');
    }
    setShowNewProductCategoryDialog(false);
    setNewProductCategory('');
  };

  const handleAddNewVehicleCategory = () => {
    if (newVehicleCategory.trim() && !vehicleCategories.includes(newVehicleCategory)) {
      setVehicleCategories((prev) => [...prev, newVehicleCategory]);
      // UX Improvement: Auto select the new category
      serviceForm.setValue('vehicleCategory', newVehicleCategory);
      serviceForm.clearErrors('vehicleCategory');
    }
    setShowNewVehicleCategoryDialog(false);
    setNewVehicleCategory('');
  };

  // Prevent form submission on "Enter" key in text fields
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.target instanceof HTMLInputElement && e.target.type !== 'submit') {
      e.preventDefault();
    }
  };

  const commonInputStyles = "rounded-none h-11 text-base";
  const commonButtonStyles = "rounded-none uppercase tracking-widest text-xs h-11";

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent 
          className="sm:max-w-lg rounded-none border-zinc-200"
          // Prevent closing when interacting with outside elements while nested dialogs are active
          onPointerDownOutside={(e) => {
            if (showNewProductCategoryDialog || showNewVehicleCategoryDialog) {
              e.preventDefault();
            }
          }}
        >
          <DialogHeader>
            <DialogTitle className="font-light tracking-tight text-2xl">
              {isEditMode ? 'Edit Item' : 'Add New Item'}
            </DialogTitle>
            <DialogDescription className="text-zinc-500">
              {isEditMode ? 'Update the details of the selected item.' : 'Add a new product or service to your inventory.'}
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
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

            {/* --- Product Form --- */}
            <TabsContent value="product">
              <Form {...productForm}>
                <form 
                  onSubmit={productForm.handleSubmit(onProductSubmit)} 
                  onKeyDown={handleKeyDown}
                  className="space-y-4 py-4"
                >
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
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
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
                              <SelectSeparator />
                              <SelectItem 
                                value="add-new-trigger"
                                onSelect={(e) => {
                                  e.preventDefault();
                                  setShowNewProductCategoryDialog(true);
                                }}
                                className="font-medium text-blue-600 focus:text-blue-700 focus:bg-blue-50"
                              >
                                <div className="flex items-center">
                                    <PlusCircle className="mr-2 h-4 w-4" /> Add New Category
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

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
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={productForm.control}
                        name="stock"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{isEditMode ? 'Current Stock' : 'Initial Stock'}</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} className={commonInputStyles} />
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

            {/* --- Service Form --- */}
            <TabsContent value="service">
              <Form {...serviceForm}>
                <form 
                    onSubmit={serviceForm.handleSubmit(onServiceSubmit)} 
                    onKeyDown={handleKeyDown}
                    className="space-y-4 py-4"
                >
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
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className={commonInputStyles}>
                              <SelectValue placeholder="Select a vehicle category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-none border-zinc-200">
                            {vehicleCategories.map(category => (
                              <SelectItem key={category} value={category}>{category}</SelectItem>
                            ))}
                            <SelectSeparator />
                            <SelectItem 
                                value="add-new-trigger"
                                onSelect={(e) => {
                                  e.preventDefault();
                                  setShowNewVehicleCategoryDialog(true);
                                }}
                                className="font-medium text-blue-600 focus:text-blue-700 focus:bg-blue-50"
                            >
                                <div className="flex items-center">
                                    <PlusCircle className="mr-2 h-4 w-4" /> Add New Category
                                </div>
                            </SelectItem>
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
                        <FormLabel>Service Price (Rs.)</FormLabel>
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

      {/* --- Nested Alert Dialogs (Siblings to Main Dialog) --- */}
      
      <AlertDialog open={showNewProductCategoryDialog} onOpenChange={setShowNewProductCategoryDialog}>
        <AlertDialogContent className="rounded-none border-zinc-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-light tracking-tight text-xl">Add New Product Category</AlertDialogTitle>
            <AlertDialogDescription>
              Create a new category for your products.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            autoFocus
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
            <AlertDialogCancel type="button" onClick={() => setShowNewProductCategoryDialog(false)} className={commonButtonStyles}>Cancel</AlertDialogCancel>
            <AlertDialogAction type="button" onClick={handleAddNewProductCategory} className={commonButtonStyles}>Add Category</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showNewVehicleCategoryDialog} onOpenChange={setShowNewVehicleCategoryDialog}>
        <AlertDialogContent className="rounded-none border-zinc-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-light tracking-tight text-xl">Add New Vehicle Category</AlertDialogTitle>
            <AlertDialogDescription>
              Create a new category for vehicle types.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            autoFocus
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
            <AlertDialogCancel type="button" onClick={() => setShowNewVehicleCategoryDialog(false)} className={commonButtonStyles}>Cancel</AlertDialogCancel>
            <AlertDialogAction type="button" onClick={handleAddNewVehicleCategory} className={commonButtonStyles}>Add Category</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
