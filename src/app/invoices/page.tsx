
'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import type { Invoice, Customer, Vehicle, Employee } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { InvoicesTable } from '@/components/invoices/InvoicesTable';
import { cn } from '@/lib/utils';
import { InvoiceDetailsDialog } from '@/components/invoices/InvoiceDetailsDialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { WithId } from '@/firebase';

const BATCH_SIZE = 50;

export type EnrichedInvoice = WithId<Invoice> & {
  customerName?: string;
  vehicleNumberPlate?: string;
  employeeName?: string;
  customerDetails?: WithId<Customer>;
  vehicleDetails?: WithId<Vehicle>;
  employeeDetails?: WithId<Employee>;
};

type FilterStatus = 'all' | 'Paid' | 'Partial' | 'Unpaid';
type LoadingState = 'idle' | 'initial' | 'loadingMore';

export default function InvoicesPage() {
  const { toast } = useToast();
  
  const [allInvoices, setAllInvoices] = useState<EnrichedInvoice[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loadingState, setLoadingState] = useState<LoadingState>('initial');

  const [activeFilter, setActiveFilter] = useState<FilterStatus>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<EnrichedInvoice | null>(null);

  const fetchInvoices = useCallback(async (startAfter: number | null = null, signal: AbortSignal) => {
    setLoadingState(startAfter ? 'loadingMore' : 'initial');
    
    try {
      let url = `/api/invoices?limit=${BATCH_SIZE}`;
      if (startAfter) {
        url += `&startAfter=${startAfter}`;
      }

      const res = await fetch(url, { signal });
      if (!res.ok) throw new Error('Failed to fetch invoices from server.');

      const { invoices: newInvoices, hasMore: moreToLoad } = await res.json();
      
      // The API returns date as a Firestore Timestamp object, convert it back to a number for client-side use
      const clientReadyInvoices = newInvoices.map((inv: any) => ({
        ...inv,
        date: inv.date._seconds ? inv.date._seconds * 1000 + inv.date._nanoseconds / 1000000 : inv.date
      }));

      setAllInvoices(prev => startAfter ? [...prev, ...clientReadyInvoices] : clientReadyInvoices);
      setHasMore(moreToLoad);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        toast({
          variant: 'destructive',
          title: 'Error Fetching Invoices',
          description: err.message || 'There was a problem loading invoice data.',
        });
      }
    } finally {
      setLoadingState('idle');
    }
  }, [toast]);

  useEffect(() => {
    const controller = new AbortController();
    fetchInvoices(null, controller.signal);
    
    return () => {
      controller.abort();
    };
  }, [fetchInvoices]);

  // When filter changes, close details dialog to prevent stale views
  useEffect(() => {
    setSelectedInvoice(null);
  }, [activeFilter]);
  
  const handleLoadMore = () => {
    if (hasMore && allInvoices.length > 0 && loadingState === 'idle') {
      const lastInvoice = allInvoices[allInvoices.length - 1];
      const lastDate = Number(lastInvoice.date);
      fetchInvoices(lastDate, new AbortController().signal);
    }
  };

  const filteredInvoices = useMemo(() => {
    if (activeFilter === 'all') {
      return allInvoices;
    }
    return allInvoices.filter(invoice => invoice.paymentStatus === activeFilter);
  }, [allInvoices, activeFilter]);
  
  const isLoading = loadingState === 'initial';

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

      {hasMore && loadingState !== 'initial' && (
        <div className="text-center mt-8">
          <Button
            onClick={handleLoadMore}
            disabled={loadingState === 'loadingMore'}
            variant="outline"
            className="rounded-none uppercase tracking-widest text-xs h-11 border-zinc-200 hover:bg-zinc-100"
          >
            {loadingState === 'loadingMore' ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : 'Load More Invoices'}
          </Button>
        </div>
      )}
      
      <InvoiceDetailsDialog
        invoice={selectedInvoice}
        isOpen={!!selectedInvoice}
        onOpenChange={(isOpen) => !isOpen && setSelectedInvoice(null)}
      />
    </div>
  );
}
