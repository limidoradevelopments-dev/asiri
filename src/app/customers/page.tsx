
'use client';

import { useState, useMemo } from "react";
import { collection, doc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Plus, Search } from "lucide-react";
import type { Customer } from "@/lib/data";
import { AddCustomerDialog } from "@/components/customers/AddCustomerDialog";
import CustomersTable from "@/components/customers/CustomersTable";
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

export default function CustomersPage() {
  const firestore = useFirestore();

  const customersCollection = useMemoFirebase(() => collection(firestore, 'customers'), [firestore]);

  const { data: customers, isLoading: customersLoading } = useCollection<Customer>(customersCollection);

  const [searchQuery, setSearchQuery] = useState("");
  const [isAddCustomerDialogOpen, setAddCustomerDialogOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<WithId<Customer> | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<string | null>(null);

  const filteredCustomers = useMemo(() => {
    if (!customers) return [];
    if (!searchQuery) return customers;

    const lowercasedQuery = searchQuery.toLowerCase();

    return customers.filter(customer =>
      customer.name.toLowerCase().includes(lowercasedQuery) ||
      customer.phone.toLowerCase().includes(lowercasedQuery)
    );
  }, [customers, searchQuery]);
  
  const handleUpsertCustomer = (customer: Omit<Customer, 'id'>, id?: string) => {
    if (id) {
      const docRef = doc(firestore, 'customers', id);
      updateDocumentNonBlocking(docRef, { ...customer });
    } else {
      addDocumentNonBlocking(customersCollection, customer);
    }
  };

  const handleEdit = (customer: WithId<Customer>) => {
    setCustomerToEdit(customer);
    setAddCustomerDialogOpen(true);
  };
  
  const handleDeleteRequest = (id: string) => {
    setCustomerToDelete(id);
  };

  const confirmDelete = () => {
    if (customerToDelete) {
      const docRef = doc(firestore, 'customers', customerToDelete);
      deleteDocumentNonBlocking(docRef);
      setCustomerToDelete(null);
    }
  };

  const onDialogClose = (isOpen: boolean) => {
    if (!isOpen) {
      setCustomerToEdit(null);
    }
    setAddCustomerDialogOpen(isOpen);
  }

  return (
    <div className="relative z-10 w-full max-w-7xl mx-auto px-12 pt-8 pb-12">
        
        {/* --- HEADER --- */}
        <div className="flex justify-between items-start mb-16 gap-8">
            <div>
                <h1 className="text-5xl font-light tracking-tighter mb-2">CUSTOMERS</h1>
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">View and Manage Customer Records</p>
            </div>

            <div className="flex items-end gap-8 w-auto">
                <div className="relative group w-80">
                    <Search className="absolute left-0 bottom-3 h-4 w-4 text-zinc-400 group-focus-within:text-black transition-colors" />
                    <input
                        type="search"
                        placeholder="SEARCH NAME OR PHONE..."
                        className="w-full bg-transparent border-b border-zinc-200 py-2.5 pl-8 text-sm outline-none placeholder:text-zinc-300 placeholder:uppercase placeholder:tracking-widest uppercase tracking-wide focus:border-black transition-colors"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-4">
                     <AddCustomerDialog 
                        onUpsertCustomer={handleUpsertCustomer} 
                        customerToEdit={customerToEdit}
                        isOpen={isAddCustomerDialogOpen}
                        onOpenChange={onDialogClose}
                    >
                        <Button 
                            className="h-10 px-6 rounded-none bg-black text-white text-xs uppercase tracking-[0.15em] hover:bg-zinc-800 transition-all shadow-none"
                        >
                            <Plus className="mr-2 h-3 w-3" />
                            New Customer
                        </Button>
                    </AddCustomerDialog>
                </div>
            </div>
        </div>

        <div className="min-h-[400px]">
          <CustomersTable 
            data={filteredCustomers}
            isLoading={customersLoading}
            onEdit={handleEdit}
            onDelete={handleDeleteRequest}
          />
        </div>

      <AlertDialog open={!!customerToDelete} onOpenChange={() => setCustomerToDelete(null)}>
        <AlertDialogContent className="rounded-none border-zinc-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-light tracking-tight text-xl">Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-500">
              This action cannot be undone. This will permanently remove the customer's record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 mt-4">
            <AlertDialogCancel 
                onClick={() => setCustomerToDelete(null)}
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
    </div>
  );
}
