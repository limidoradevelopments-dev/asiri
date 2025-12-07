
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
import { Loader2, Plus, Search, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';
import { useDebouncedCallback } from 'use-debounce';
import { format, formatDistanceToNow } from 'date-fns';

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
  mileage: z.string().optional().transform(val => val === '' ? undefined : val).pipe(z.coerce.number().int().min(0, "Mileage must be a positive number.").optional()),
  fuelType: z.enum(['Petrol', 'Diesel', 'Hybrid', 'EV']).optional(),
  transmission: z.enum(['Auto', 'Manual']).optional(),
});

const combinedSchema = customerSchema.merge(vehicleSchema);


type EnrichedVehicle = WithId<Vehicle> & { customer?: WithId<Customer> };

type CustomerWithVehicle = {
  customer: WithId<Customer>;
  vehicle: WithId<Vehicle>;
};

type AddCustomerVehicleDialogProps = {
  onUpsert: (customer: Omit<Customer, 'id'>, vehicle: Partial<Omit<Vehicle, 'id' | 'customerId'>>, customerId?: string, vehicleId?: string) => Promise<boolean>;
  itemToEdit?: CustomerWithVehicle | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

export function AddCustomerVehicleDialog({ 
  onUpsert, 
  itemToEdit, 
  isOpen, 
  onOpenChange 
}: AddCustomerVehicleDialogProps) {
  const { toast } = useToast();
  
  const isEditMode = !!itemToEdit;
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  
  const form = useForm<z.infer<typeof combinedSchema>>({
    resolver: zodResolver(combinedSchema),
    defaultValues: {
      name: '', phone: '', address: '', nic: '',
      numberPlate: '', make: '', model: '', year: new Date().getFullYear(),
      mileage: undefined, fuelType: undefined, transmission: undefined
    },
  });

  useEffect(() => {
    if (isOpen) {
        if (isEditMode && itemToEdit) {
            setShowAddForm(true);
            form.reset({
                ...itemToEdit.customer,
                ...itemToEdit.vehicle,
                numberPlate: itemToEdit.vehicle.numberPlate.toUpperCase(),
                mileage: itemToEdit.vehicle.mileage?.toString(),
            });
        }
    } else {
        // Reset all state when dialog is closed
        setShowAddForm(false);
        setIsSubmitting(false);
        form.reset({
             name: '', phone: '', address: '', nic: '',
            numberPlate: '', make: '', model: '', year: new Date().getFullYear(),
            mileage: undefined, fuelType: undefined, transmission: undefined
        });
    }
  }, [itemToEdit, isEditMode, form, isOpen]);


  const onSubmit = async (values: z.infer<typeof combinedSchema>) => {
    setIsSubmitting(true);
    const { name, phone, address, nic, ...vehicleData } = values;
    const customerData = { name, phone, address, nic };
    
    const finalVehicleData: Partial<Omit<Vehicle, 'id' | 'customerId'>> = {
        ...vehicleData,
        numberPlate: vehicleData.numberPlate.toUpperCase(),
    };

    if (vehicleData.mileage) {
        finalVehicleData.mileage = Number(vehicleData.mileage);
    } else {
        delete (finalVehicleData as Partial<Vehicle>).mileage;
    }

    try {
        await onUpsert(customerData, finalVehicleData, itemToEdit?.customer.id, itemToEdit?.vehicle.id);
    } finally {
        setIsSubmitting(false);
    }
  };

  const commonInputStyles = "rounded-none h-11 text-base";
  const commonButtonStyles = "rounded-none uppercase tracking-widest text-xs h-11";

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
         <Button 
            onClick={() => onOpenChange(true)}
            className="h-10 px-6 rounded-none bg-black text-white text-xs uppercase tracking-[0.15em] hover:bg-zinc-800 transition-all shadow-none"
        >
            <Plus className="mr-2 h-3 w-3" />
            New Entry
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl rounded-none border-zinc-200">
        <DialogHeader>
          <DialogTitle className="font-light tracking-tight text-2xl">{isEditMode ? 'Edit Customer & Vehicle' : 'Add New Customer & Vehicle'}</DialogTitle>
          <DialogDescription className="text-zinc-500">
            {isEditMode ? "Update the customer and vehicle details." : 'Add a new customer and their vehicle to your records.'}
          </DialogDescription>
        </DialogHeader>

        {showAddForm || isEditMode ? (
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
                    <h3 className="text-lg font-medium tracking-tight border-b pb-2 mb-4">Vehicle Details</h3>
                    <div className="grid grid-cols-3 gap-4">
                        <FormField control={form.control} name="numberPlate" render={({ field }) => (
                        <FormItem><FormLabel>Vehicle Number Plate</FormLabel><FormControl><Input placeholder="e.g., ABC-1234" {...field} className={cn(commonInputStyles, "uppercase")} onChange={(e) => field.onChange(e.target.value.toUpperCase())} /></FormControl><FormMessage /></FormItem>
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
                    <DialogFooter className="mt-6 gap-2 sticky bottom-0 bg-white py-4 pr-4">
                      {!isEditMode && 
                        <Button type="button" variant="outline" onClick={() => setShowAddForm(false)} className={commonButtonStyles}>
                          Back to Search
                        </Button>
                      }
                      <Button type="submit" className={commonButtonStyles} disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isEditMode ? 'Save Changes' : 'Create Entry'}
                      </Button>
                    </DialogFooter>
                </form>
            </Form>
        ) : (
          <SearchAndSelect onSelect={(customer, vehicle) => {
             onUpsert(
                { name: customer.name, phone: customer.phone, address: customer.address, nic: customer.nic },
                { numberPlate: vehicle.numberPlate, make: vehicle.make, model: vehicle.model, year: vehicle.year, mileage: vehicle.mileage, fuelType: vehicle.fuelType, transmission: vehicle.transmission, lastVisit: vehicle.lastVisit },
                customer.id,
                vehicle.id
            ).then(success => {
                if(success) onOpenChange(false);
            });
          }} onAddNew={() => setShowAddForm(true)} />
        )}

      </DialogContent>
    </Dialog>
  );
}


function SearchAndSelect({ onSelect, onAddNew }: { 
    onSelect: (customer: WithId<Customer>, vehicle: WithId<Vehicle>) => void;
    onAddNew: () => void;
}) {
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<EnrichedVehicle[]>([]);
    const [customers, setCustomers] = useState<WithId<Customer>[]>([]);
    const { toast } = useToast();

    const fetchCustomers = useCallback(async (signal: AbortSignal) => {
        try {
            const res = await fetch('/api/customers', { signal });
            if (!res.ok) throw new Error('Failed to fetch customers');
            setCustomers(await res.json());
        } catch (err: any) {
            if (err.name === 'AbortError') return;
            const message = err instanceof Error ? err.message : 'Could not fetch customer data.';
            toast({ variant: 'destructive', title: 'Error', description: message });
        }
    }, [toast]);
    
    useEffect(() => {
        const controller = new AbortController();
        fetchCustomers(controller.signal);
        return () => controller.abort();
    }, [fetchCustomers]);

    const customerMap = useMemo(() => new Map(customers.map(c => [c.id, c])), [customers]);

    const debouncedSearch = useDebouncedCallback(async (query: string) => {
        if (query.trim().length < 2) {
        setSearchResults([]);
        setIsSearching(false);
        return;
        }
        
        try {
        const res = await fetch(`/api/vehicles/search?query=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error('Search failed');
        const vehicles: WithId<Vehicle>[] = await res.json();
        
        const enrichedVehicles = vehicles.map(vehicle => ({
            ...vehicle,
            customer: customerMap.get(vehicle.customerId)
        }));

        setSearchResults(enrichedVehicles);
        } catch (error) {
        console.error("Failed to search vehicles:", error);
        setSearchResults([]);
        } finally {
        setIsSearching(false);
        }
    }, 500);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value.toUpperCase();
        setSearchQuery(query);
        setIsSearching(true);
        debouncedSearch(query);
    };

    const handleSelect = (vehicle: EnrichedVehicle) => {
        if(vehicle.customer) {
        onSelect(vehicle.customer, vehicle);
        }
    }
    
    const formatLastVisit = (timestamp: any): string => {
        if (!timestamp) return 'No previous visits';
        try {
        const dateInMillis = typeof timestamp === 'number' 
            ? timestamp 
            : (timestamp && timestamp.seconds) 
            ? timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1000000
            : 0;

        if (dateInMillis === 0) return 'Invalid date';

        const date = new Date(dateInMillis);
        return `${format(date, 'MMM d, yyyy')} (${formatDistanceToNow(date, { addSuffix: true })})`;
        } catch(e) {
        return 'Invalid date format';
        }
    };


    return (
        <div className="py-4">
            <div className="relative group mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 group-focus-within:text-black transition-colors" />
                {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 animate-spin" />}
                <Input
                    placeholder="Search by Vehicle Number Plate to begin..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    className={cn("rounded-none h-11 text-base", "pl-10 uppercase")}
                />
            </div>
            
            <ScrollArea className="h-60 border border-zinc-200">
                <div className='p-2'>
                {searchResults.length > 0 ? (
                    searchResults.map(vehicle => {
                    return (
                        <button key={vehicle.id} onClick={() => handleSelect(vehicle)} className="w-full text-left p-3 hover:bg-zinc-100 rounded-sm transition-colors flex justify-between items-center group">
                        <div>
                            <p className="font-semibold">{vehicle.numberPlate}</p>
                            <p className="text-sm text-zinc-500">{vehicle.customer?.name} - {vehicle.make} {vehicle.model} ({vehicle.year})</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-zinc-400">{formatLastVisit(vehicle.lastVisit)}</p>
                            <span className="text-xs uppercase tracking-widest text-zinc-400 group-hover:text-black">Select</span>
                        </div>
                        </button>
                    )
                    })
                ) : (
                    <div className="p-8 text-center text-sm text-zinc-400 uppercase tracking-widest">
                    {searchQuery ? 'No vehicles found' : 'Start typing to search'}
                    </div>
                )}
                </div>
            </ScrollArea>
                <DialogFooter className="mt-6">
                <Button onClick={onAddNew} className={cn("rounded-none uppercase tracking-widest text-xs h-11", "w-full")}>
                    <UserPlus className="mr-2 h-4 w-4"/>
                    Customer or Vehicle Not Found? Add New Entry
                </Button>
            </DialogFooter>
        </div>
    )
}
