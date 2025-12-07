
'use client';

import { useEffect } from 'react';
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import type { Customer, Vehicle } from '@/lib/data';
import { WithId } from '@/firebase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const customerSchema = z.object({
  name: z.string().min(1, 'Full Name is required'),
  phone: z.string().min(1, 'Phone Number is required'),
  address: z.string().optional(),
  nic: z.string().optional(),
});

const vehicleSchema = z.object({
  numberPlate: z.string().min(1, 'Vehicle Number is required'),
  make: z.string().min(1, 'Make is required'),
  model: z.string().min(1, 'Model is required'),
  year: z.coerce.number().int().min(1900, 'Invalid year').max(new Date().getFullYear() + 1, 'Invalid year'),
  mileage: z.coerce.number().int().min(0, "Mileage must be a positive number.").optional().or(z.literal('')),
  fuelType: z.enum(['Petrol', 'Diesel', 'Hybrid', 'EV']).optional(),
  transmission: z.enum(['Auto', 'Manual']).optional(),
});

const combinedSchema = customerSchema.merge(vehicleSchema);

type CustomerWithVehicle = {
  customer: WithId<Customer>;
  vehicle: WithId<Vehicle>;
};

type AddCustomerVehicleDialogProps = {
  children: React.ReactNode;
  onUpsert: (customer: Omit<Customer, 'id'>, vehicle: Partial<Omit<Vehicle, 'id' | 'customerId'>>, customerId?: string, vehicleId?: string) => void;
  itemToEdit?: CustomerWithVehicle | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

export function AddCustomerVehicleDialog({ 
  children, 
  onUpsert, 
  itemToEdit, 
  isOpen, 
  onOpenChange 
}: AddCustomerVehicleDialogProps) {
  const { toast } = useToast();
  
  const isEditMode = !!itemToEdit;
  
  const form = useForm<z.infer<typeof combinedSchema>>({
    resolver: zodResolver(combinedSchema),
    defaultValues: {
      name: '', phone: '', address: '', nic: '',
      numberPlate: '', make: '', model: '', year: new Date().getFullYear(),
      mileage: '', fuelType: undefined, transmission: undefined
    },
  });

  useEffect(() => {
    if (isEditMode && itemToEdit) {
      form.reset({
        ...itemToEdit.customer,
        ...itemToEdit.vehicle,
        numberPlate: itemToEdit.vehicle.numberPlate.toLowerCase(),
      });
    } else {
      form.reset({
        name: '', phone: '', address: '', nic: '',
        numberPlate: '', make: '', model: '', year: new Date().getFullYear(),
        mileage: '', fuelType: undefined, transmission: undefined
      });
    }
  }, [itemToEdit, isEditMode, form, isOpen]);


  const onSubmit = async (values: z.infer<typeof combinedSchema>) => {
    // Client-side check before hitting the API for creating new vehicles
    if (!isEditMode) {
      try {
        const res = await fetch(`/api/vehicles/search?query=${encodeURIComponent(values.numberPlate)}`);
        const existingVehicles = await res.json();
        if (existingVehicles.length > 0) {
          form.setError('numberPlate', {
              type: 'manual',
              message: 'A vehicle with this number plate already exists.',
          });
          return;
        }
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not verify vehicle uniqueness.' });
        return;
      }
    }
    
    const { name, phone, address, nic, ...vehicleData } = values;
    const customerData = { name, phone, address, nic };
    
    const finalVehicleData: Partial<Omit<Vehicle, 'id' | 'customerId'>> = {
        ...vehicleData,
        numberPlate: vehicleData.numberPlate.toLowerCase(), // Store as lowercase
    };

    if (vehicleData.mileage) {
        finalVehicleData.mileage = Number(vehicleData.mileage);
    } else {
        delete (finalVehicleData as Partial<Vehicle>).mileage;
    }


    onUpsert(customerData, finalVehicleData, itemToEdit?.customer.id, itemToEdit?.vehicle.id);
    toast({ title: isEditMode ? 'Entry Updated' : 'Entry Added', description: `${customerData.name}'s vehicle has been saved.` });
    onOpenChange(false);
  };

  const commonInputStyles = "rounded-none h-11 text-base";
  const commonButtonStyles = "rounded-none uppercase tracking-widest text-xs h-11";

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-4xl rounded-none border-zinc-200">
        <DialogHeader>
          <DialogTitle className="font-light tracking-tight text-2xl">{isEditMode ? 'Edit Customer & Vehicle' : 'Add New Customer & Vehicle'}</DialogTitle>
          <DialogDescription className="text-zinc-500">
            {isEditMode ? "Update the customer and vehicle details." : 'Add a new customer and their vehicle to your records.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
                <h3 className="text-lg font-medium tracking-tight border-b pb-2 mb-4">Vehicle Details</h3>
                 <div className="grid grid-cols-3 gap-4">
                     <FormField control={form.control} name="numberPlate" render={({ field }) => (
                      <FormItem><FormLabel>Vehicle Number Plate</FormLabel><FormControl><Input placeholder="e.g., abc-1234" {...field} className={commonInputStyles} onChange={(e) => field.onChange(e.target.value.toLowerCase())} /></FormControl><FormMessage /></FormItem>
                    )} />
                      <FormField control={form.control} name="make" render={({ field }) => (
                      <FormItem><FormLabel>Make (Brand)</FormLabel><FormControl><Input placeholder="e.g., Toyota" {...field} className={commonInputStyles} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="model" render={({ field }) => (
                      <FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="e.g., Corolla" {...field} className={commonInputStyles} /></FormControl><FormMessage /></FormItem>
                    )} />
                </div>
                 <div className="grid grid-cols-3 gap-4">
                    <FormField control={form.control} name="year" render={({ field }) => (
                        <FormItem><FormLabel>Year</FormLabel><FormControl><Input type="number" {...field} className={commonInputStyles} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="mileage" render={({ field }) => (
                        <FormItem><FormLabel>Mileage (Optional)</FormLabel><FormControl><Input type="number" placeholder="e.g., 85000" {...field} className={commonInputStyles} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="fuelType" render={({ field }) => (
                        <FormItem><FormLabel>Fuel Type (Optional)</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger className={commonInputStyles}><SelectValue placeholder="Select fuel type" /></SelectTrigger></FormControl>
                                <SelectContent className="rounded-none border-zinc-200">
                                    <SelectItem value="Petrol">Petrol</SelectItem>
                                    <SelectItem value="Diesel">Diesel</SelectItem>
                                    <SelectItem value="Hybrid">Hybrid</SelectItem>
                                    <SelectItem value="EV">Electric (EV)</SelectItem>
                                </SelectContent>
                            </Select>
                        <FormMessage /></FormItem>
                    )} />
                </div>
                <div className="grid grid-cols-3 gap-4">
                     <FormField control={form.control} name="transmission" render={({ field }) => (
                        <FormItem><FormLabel>Transmission (Optional)</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger className={commonInputStyles}><SelectValue placeholder="Select transmission" /></SelectTrigger></FormControl>
                                <SelectContent className="rounded-none border-zinc-200">
                                    <SelectItem value="Auto">Automatic</SelectItem>
                                    <SelectItem value="Manual">Manual</SelectItem>
                                </SelectContent>
                            </Select>
                        <FormMessage /></FormItem>
                    )} />
                </div>
                <h3 className="text-lg font-medium tracking-tight border-b pb-2 mb-4 pt-6">Customer Details</h3>
                <div className="grid grid-cols-2 gap-4">
                     <FormField control={form.control} name="name" render={({ field }) => (
                      <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="e.g., John Doe" {...field} className={commonInputStyles} /></FormControl><FormMessage /></FormItem>
                    )} />
                     <FormField control={form.control} name="phone" render={({ field }) => (
                      <FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input placeholder="e.g., 0771234567" {...field} className={commonInputStyles} /></FormControl><FormMessage /></FormItem>
                    )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="address" render={({ field }) => (
                      <FormItem><FormLabel>Address (Optional)</FormLabel><FormControl><Input placeholder="e.g., 123 Main St, Colombo" {...field} className={commonInputStyles} /></FormControl><FormMessage /></FormItem>
                    )} />
                     <FormField control={form.control} name="nic" render={({ field }) => (
                      <FormItem><FormLabel>NIC / License No. (Optional)</FormLabel><FormControl><Input {...field} className={commonInputStyles} /></FormControl><FormMessage /></FormItem>
                    )} />
                </div>
                <DialogFooter className="mt-6 gap-2">
                  <DialogClose asChild>
                    <Button type="button" variant="outline" className={commonButtonStyles}>Cancel</Button>
                  </DialogClose>
                  <Button type="submit" className={commonButtonStyles}>{isEditMode ? 'Save Changes' : 'Add Entry'}</Button>
                </DialogFooter>
            </form>
          </Form>
      </DialogContent>
    </Dialog>
  );
}
