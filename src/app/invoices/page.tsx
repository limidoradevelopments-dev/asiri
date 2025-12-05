
'use client';

import { useState, useMemo } from 'react';
import { collection } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, WithId } from '@/firebase';
import type { Invoice, Customer, Vehicle, Employee } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { InvoicesTable } from '@/components/invoices/InvoicesTable';
import { cn } from '@/lib/utils';
import { InvoiceDetailsDialog } from '@/components/invoices/InvoiceDetailsDialog';

type EnrichedInvoice = WithId<Invoice> & {
  customerName?: string;
  vehicleNumberPlate?: string;
  employeeName?: string;
  customerDetails?: WithId<Customer>;
  vehicleDetails?: WithId<Vehicle>;
  employeeDetails?: WithId<Employee>;
};

type FilterStatus = 'all' | 'Paid' | 'Partial' | 'Unpaid';

export default function InvoicesPage() {
  const firestore = useFirestore();

  const invoicesCollection = useMemoFirebase(() => collection(firestore, 'invoices'), [firestore]);
  const customersCollection = useMemoFirebase(() => collection(firestore, 'customers'), [firestore]);
  const vehiclesCollection = useMemoFirebase(() => collection(firestore, 'vehicles'), [firestore]);
  const employeesCollection = useMemoFirebase(() => collection(firestore, 'employees'), [firestore]);

  const { data: invoices, isLoading: invoicesLoading } = useCollection<Invoice>(invoicesCollection);
  const { data: customers, isLoading: customersLoading } = useCollection<WithId<Customer>>(customersCollection);
  const { data: vehicles, isLoading: vehiclesLoading } = useCollection<WithId<Vehicle>>(vehiclesCollection);
  const { data: employees, isLoading: employeesLoading } = useCollection<WithId<Employee>>(employeesCollection);
  
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<EnrichedInvoice | null>(null);


  const enrichedInvoices = useMemo(() => {
    if (!invoices || !customers || !vehicles || !employees) return [];
    
    const customerMap = new Map(customers.map(c => [c.id, c]));
    const vehicleMap = new Map(vehicles.map(v => [v.id, v]));
    const employeeMap = new Map(employees.map(e => [e.id, e]));

    return invoices
      .map(invoice => ({
        ...invoice,
        customerName: customerMap.get(invoice.customerId)?.name || 'N/A',
        vehicleNumberPlate: vehicleMap.get(invoice.vehicleId)?.numberPlate || 'N/A',
        employeeName: employeeMap.get(invoice.employeeId)?.name || 'N/A',
        customerDetails: customerMap.get(invoice.customerId),
        vehicleDetails: vehicleMap.get(invoice.vehicleId),
        employeeDetails: employeeMap.get(invoice.employeeId),
      }))
      .sort((a, b) => b.date - a.date); // Sort by most recent first
  }, [invoices, customers, vehicles, employees]);
  
  const filteredInvoices = useMemo(() => {
    if (activeFilter === 'all') {
      return enrichedInvoices;
    }
    return enrichedInvoices.filter(invoice => invoice.paymentStatus === activeFilter);
  }, [enrichedInvoices, activeFilter]);
  
  const isLoading = invoicesLoading || customersLoading || vehiclesLoading || employeesLoading;

  const handleViewDetails = (invoice: EnrichedInvoice) => {
    setSelectedInvoice(invoice);
  };

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
            onViewDetails={handleViewDetails}
        />
      </div>
      
      <InvoiceDetailsDialog
        invoice={selectedInvoice}
        isOpen={!!selectedInvoice}
        onOpenChange={(isOpen) => !isOpen && setSelectedInvoice(null)}
      />
    </div>
  );
}
