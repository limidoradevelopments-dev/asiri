
'use client';

import { useState, useMemo, useCallback } from "react";
import { collection, doc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Plus, Search } from "lucide-react";
import type { Customer, Vehicle } from "@/lib/data";
import { AddCustomerVehicleDialog } from "@/components/customers/AddCustomerVehicleDialog";
import CustomersVehiclesTable from "@/components/customers/CustomersVehiclesTable";
import { useFirestore, useCollection, useMemoFirebase, WithId } from "@/firebase";
import { addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";
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
import { CustomerVehicleDetailsDialog } from "@/components/customers/CustomerVehicleDetailsDialog";

export type CustomerWithVehicle = {
  customer: WithId<Customer>;
  vehicle: WithId<Vehicle>;
};

export default function CustomersPage() {
  const firestore = useFirestore();

  const customersCollection = useMemoFirebase(() => collection(firestore, 'customers'), [firestore]);
  const vehiclesCollection = useMemoFirebase(() => collection(firestore, 'vehicles'), [firestore]);

  const { data: customers, isLoading: customersLoading } = useCollection<Customer>(customersCollection);
  const { data: vehicles, isLoading: vehiclesLoading } = useCollection<Vehicle>(vehiclesCollection);

  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<CustomerWithVehicle | null>(null);
  const [itemToDelete, setItemToDelete] = useState<CustomerWithVehicle | null>(null);
  const [itemToView, setItemToView] = useState<CustomerWithVehicle | null>(null);

  const combinedData = useMemo(() => {
    if (!customers || !vehicles) return [];
    
    const customerMap = new Map(customers.map(c => [c.id, c]));
    
    return vehicles.map(vehicle => {
      const customer = customerMap.get(vehicle.customerId);
      return customer ? { customer, vehicle } : null;
    }).filter((item): item is CustomerWithVehicle => item !== null);

  }, [customers, vehicles]);


  const filteredData = useMemo(() => {
    if (!searchQuery) return combinedData;

    const lowercasedQuery = searchQuery.toLowerCase();

    return combinedData.filter(({ customer, vehicle }) =>
      customer.name.toLowerCase().includes(lowercasedQuery) ||
      customer.phone.toLowerCase().includes(lowercasedQuery) ||
      vehicle.numberPlate.toLowerCase().includes(lowercasedQuery)
    );
  }, [combinedData, searchQuery]);
  
  const handleUpsert = useCallback(async (customerData: Omit<Customer, 'id'>, vehicleData: Partial<Omit<Vehicle, 'id' | 'customerId'>>, customerId?: string, vehicleId?: string) => {
    if (customerId && vehicleId) {
      // Editing
      const customerDocRef = doc(firestore, 'customers', customerId);
      updateDocumentNonBlocking(customerDocRef, customerData);

      const vehicleDocRef = doc(firestore, 'vehicles', vehicleId);
      updateDocumentNonBlocking(vehicleDocRef, vehicleData);

    } else {
      // Creating
      if(customersCollection && vehiclesCollection) {
        const customerRef = await addDocumentNonBlocking(customersCollection, customerData);
        if(customerRef) {
          const newVehicleData = { ...vehicleData, customerId: customerRef.id };
          await addDocumentNonBlocking(vehiclesCollection, newVehicleData);
        }
      }
    }
  }, [firestore, customersCollection, vehiclesCollection]);

  const handleEdit = useCallback((item: CustomerWithVehicle) => {
    setItemToEdit(item);
    setAddDialogOpen(true);
  }, []);
  
  const handleDeleteRequest = useCallback((item: CustomerWithVehicle) => {
    setItemToDelete(item);
  }, []);

  const handleViewDetails = useCallback((item: CustomerWithVehicle) => {
    setItemToView(item);
  }, []);

  const confirmDelete = useCallback(() => {
    if (!itemToDelete) return;

    const { customer, vehicle } = itemToDelete;
    
    const vehicleDocRef = doc(firestore, 'vehicles', vehicle.id);
    deleteDocumentNonBlocking(vehicleDocRef);

    // Check if this is the customer's only vehicle
    const customerVehicles = vehicles?.filter(v => v.customerId === customer.id);
    if (customerVehicles?.length === 1) {
      const customerDocRef = doc(firestore, 'customers', customer.id);
      deleteDocumentNonBlocking(customerDocRef);
    }
    
    // Close the dialog immediately for optimistic UI update
    setItemToDelete(null);
  }, [itemToDelete, firestore, vehicles]);

  const onDialogClose = useCallback((isOpen: boolean) => {
    if (!isOpen) {
      setItemToEdit(null);
    }
    setAddDialogOpen(isOpen);
  }, []);
  
  const isLoading = customersLoading || vehiclesLoading;

  return (
    <div className="relative z-10 w-full max-w-7xl mx-auto px-12 pt-8 pb-12">
        
        {/* --- HEADER --- */}
        <div className="flex justify-between items-start mb-16 gap-8">
            <div>
                <h1 className="text-5xl font-light tracking-tighter mb-2">CUSTOMERS & VEHICLES</h1>
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">View and Manage Customer & Vehicle Records</p>
            </div>

            <div className="flex items-end gap-8 w-auto">
                <div className="relative group w-80">
                    <Search className="absolute left-0 bottom-3 h-4 w-4 text-zinc-400 group-focus-within:text-black transition-colors" />
                    <input
                        type="search"
                        placeholder="SEARCH NAME, PHONE, OR PLATE..."
                        className="w-full bg-transparent border-b border-zinc-200 py-2.5 pl-8 text-sm outline-none placeholder:text-zinc-300 placeholder:uppercase placeholder:tracking-widest uppercase tracking-wide focus:border-black transition-colors"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-4">
                     <AddCustomerVehicleDialog
                        onUpsert={handleUpsert}
                        itemToEdit={itemToEdit}
                        isOpen={isAddDialogOpen}
                        onOpenChange={onDialogClose}
                      >
                        <Button 
                            onClick={() => setAddDialogOpen(true)}
                            className="h-10 px-6 rounded-none bg-black text-white text-xs uppercase tracking-[0.15em] hover:bg-zinc-800 transition-all shadow-none"
                        >
                            <Plus className="mr-2 h-3 w-3" />
                            New Entry
                        </Button>
                    </AddCustomerVehicleDialog>
                </div>
            </div>
        </div>

        <div className="min-h-[400px]">
          <CustomersVehiclesTable
            data={filteredData}
            isLoading={isLoading}
            onEdit={handleEdit}
            onDelete={handleDeleteRequest}
            onViewDetails={handleViewDetails}
          />
        </div>

      <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent className="rounded-none border-zinc-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-light tracking-tight text-xl">Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-500">
              This action will permanently delete the vehicle record. If this is the customer's only vehicle, their record will be deleted as well. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 mt-4">
            <AlertDialogCancel 
                onClick={() => setItemToDelete(null)}
                className="rounded-none border-zinc-200 uppercase tracking-widest text-xs"
            >
                Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
                onClick={confirmDelete} 
                className="bg-red-600 hover:bg-red-700 text-white rounded-none uppercase tracking-widest text-xs"
            >
                Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <CustomerVehicleDetailsDialog
        item={itemToView}
        isOpen={!!itemToView}
        onOpenChange={(isOpen) => !isOpen && setItemToView(null)}
      />
    </div>
  );
}
