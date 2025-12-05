
'use client';

import { useState, useMemo } from "react";
import { collection } from "firebase/firestore";
import { Search } from "lucide-react";
import type { Customer, Vehicle } from "@/lib/data";
import CustomersTable from "@/components/customers/CustomersTable";
import { useFirestore, useCollection, useMemoFirebase, WithId } from "@/firebase";

export default function CustomersPage() {
  const firestore = useFirestore();

  const customersCollection = useMemoFirebase(() => collection(firestore, 'customers'), [firestore]);
  const vehiclesCollection = useMemoFirebase(() => collection(firestore, 'vehicles'), [firestore]);

  const { data: customers, isLoading: customersLoading } = useCollection<Customer>(customersCollection);
  const { data: vehicles, isLoading: vehiclesLoading } = useCollection<Vehicle>(vehiclesCollection);

  const [searchQuery, setSearchQuery] = useState("");

  const customersWithVehicles = useMemo(() => {
    if (!customers || !vehicles) return [];
    return customers.map(customer => ({
      ...customer,
      vehicles: vehicles.filter(vehicle => vehicle.customerId === customer.id)
    }));
  }, [customers, vehicles]);

  const filteredCustomers = useMemo(() => {
    if (!customersWithVehicles) return [];
    if (!searchQuery) return customersWithVehicles;

    const lowercasedQuery = searchQuery.toLowerCase();

    return customersWithVehicles.filter(customer =>
      customer.name.toLowerCase().includes(lowercasedQuery) ||
      customer.phone.toLowerCase().includes(lowercasedQuery) ||
      customer.vehicles.some(v => v.numberPlate.toLowerCase().includes(lowercasedQuery))
    );
  }, [customersWithVehicles, searchQuery]);

  const isLoading = customersLoading || vehiclesLoading;

  return (
    <div className="relative z-10 w-full max-w-7xl mx-auto px-12 pt-8 pb-12">
        
        {/* --- HEADER --- */}
        <div className="flex justify-between items-start mb-16 gap-8">
            <div>
                <h1 className="text-5xl font-light tracking-tighter mb-2">CUSTOMERS</h1>
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
            </div>
        </div>

        <div className="min-h-[400px]">
          <CustomersTable 
            data={filteredCustomers}
            isLoading={isLoading}
          />
        </div>
    </div>
  );
}
