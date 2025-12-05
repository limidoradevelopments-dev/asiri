'use client';

import { useState, useMemo } from 'react';
import { collection } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, WithId } from '@/firebase';
import type { Invoice, Customer, Vehicle, InvoiceStatus } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { InvoicesTable } from '@/components/invoices/InvoicesTable';
import { cn } from '@/lib/utils';
import { FileText } from 'lucide-react';

type EnrichedInvoice = WithId<Invoice> & {
  customerName?: string;
  vehicleNumberPlate?: string;
};

type FilterStatus = 'all' | InvoiceStatus;

export default function InvoicesPage() {
  const firestore = useFirestore();

  const invoicesCollection = useMemoFirebase(() => collection(firestore, 'invoices'), [firestore]);
  const customersCollection = useMemoFirebase(() => collection(firestore, 'customers'), [firestore]);
  const vehiclesCollection = useMemoFirebase(() => collection(firestore, 'vehicles'), [firestore]);

  const { data: invoices, isLoading: invoicesLoading } = useCollection<Invoice>(invoicesCollection);
  const { data: customers, isLoading: customersLoading } = useCollection<Customer>(customersCollection);
  const { data: vehicles, isLoading: vehiclesLoading } = useCollection<Vehicle>(vehiclesCollection);
  
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('all');

  const enrichedInvoices = useMemo(() => {
    if (!invoices || !customers || !vehicles) return [];
    
    const customerMap = new Map(customers.map(c => [c.id, c.name]));
    const vehicleMap = new Map(vehicles.map(v => [v.id, v.numberPlate]));

    return invoices
      .map(invoice => ({
        ...invoice,
        customerName: customerMap.get(invoice.customerId) || 'N/A',
        vehicleNumberPlate: vehicleMap.get(invoice.vehicleId) || 'N/A',
      }))
      .sort((a, b) => b.date - a.date); // Sort by most recent first
  }, [invoices, customers, vehicles]);
  
  const filteredInvoices = useMemo(() => {
    if (activeFilter === 'all') {
      return enrichedInvoices;
    }
    return enrichedInvoices.filter(invoice => invoice.paymentStatus === activeFilter);
  }, [enrichedInvoices, activeFilter]);
  
  const isLoading = invoicesLoading || customersLoading || vehiclesLoading;

  const filterButtons: { label: string; value: FilterStatus }[] = [
    { label: 'All Invoices', value: 'all' },
    { label: 'Paid', value: 'Paid' },
    { label: 'Partial', value: 'Partial' },
    { label: 'Unpaid', value: 'Unpaid' },
  ];

  return (
    <div className="relative z-10 w-full max-w-7xl mx-auto px-12 pt-8 pb-12">
      {/* --- HEADER --- */}
      <div className="flex justify-between items-start mb-16 gap-8">
        <div>
          <h1 className="text-5xl font-light tracking-tighter mb-2">INVOICES</h1>
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">View and Manage All Invoices</p>
        </div>
        <div className="flex items-end gap-2 bg-zinc-100 p-1">
          {filterButtons.map(({ label, value }) => (
            <Button
              key={value}
              onClick={() => setActiveFilter(value)}
              variant="ghost"
              className={cn(
                "h-10 px-6 rounded-none text-sm font-medium uppercase tracking-widest text-zinc-500 hover:bg-zinc-200 transition-colors",
                activeFilter === value && "bg-black text-white hover:bg-black hover:text-white"
              )}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      <div className="min-h-[600px]">
        <InvoicesTable 
            data={filteredInvoices} 
            isLoading={isLoading} 
        />
      </div>
    </div>
  );
}
