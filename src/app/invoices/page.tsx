'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import type { Invoice, Customer, Vehicle, Employee, Payment } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { InvoicesTable } from '@/components/invoices/InvoicesTable';
import { cn } from '@/lib/utils';
import { InvoiceDetailsDialog } from '@/components/invoices/InvoiceDetailsDialog';
import { AddPaymentDialog } from '@/components/invoices/AddPaymentDialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { WithId } from '@/firebase';
import { useIntersectionObserver } from '@/hooks/use-intersection-observer';

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
type LoadingState = 'idle' | 'loading' | 'loading-more';

export default function InvoicesPage() {
  const { toast } = useToast();
  
  const [allInvoices, setAllInvoices] = useState<EnrichedInvoice[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [lastVisibleId, setLastVisibleId] = useState<string | null>(null);
  const [loadingState, setLoadingState] = useState<LoadingState>('loading');

  const [activeFilter, setActiveFilter] = useState<FilterStatus>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<EnrichedInvoice | null>(null);
  const [invoiceToPay, setInvoiceToPay] = useState<EnrichedInvoice | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [printOnOpen, setPrintOnOpen] = useState(false);

  const fetchInvoices = useCallback(async (startAfterId: string | null = null, isInitialLoad = false) => {
    setLoadingState(isInitialLoad ? 'loading' : 'loading-more');
    
    try {
      let url = `/api/invoices?limit=${BATCH_SIZE}`;
      if (startAfterId) {
        url += `&startAfter=${startAfterId}`;
      }

      const res = await fetch(url); // No signal needed as we control load state
      if (!res.ok) throw new Error('Failed to fetch invoices from server.');

      const { invoices: newInvoices, hasMore: moreToLoad, lastVisibleId: newLastVisibleId } = await res.json();
      
      setAllInvoices(prev => startAfterId ? [...prev, ...newInvoices] : newInvoices);
      setHasMore(moreToLoad);
      setLastVisibleId(newLastVisibleId);

    } catch (err: any) {
        toast({
          variant: 'destructive',
          title: 'Error Fetching Invoices',
          description: err.message || 'There was a problem loading invoice data.',
        });
    } finally {
      setLoadingState('idle');
    }
  }, [toast]);

  useEffect(() => {
    fetchInvoices(null, true);
  }, [fetchInvoices]);

  const loadMoreRef = useRef<HTMLDivElement>(null);
  useIntersectionObserver({
    target: loadMoreRef,
    onIntersect: () => {
      if (hasMore && loadingState === 'idle') {
        fetchInvoices(lastVisibleId);
      }
    },
    enabled: hasMore && loadingState === 'idle',
  });


  useEffect(() => {
    if (!selectedInvoice) {
      setPrintOnOpen(false);
    }
  }, [selectedInvoice]);

  const filteredInvoices = useMemo(() => {
    if (activeFilter === 'all') {
      return allInvoices;
    }
    return allInvoices.filter(invoice => invoice.paymentStatus === activeFilter);
  }, [allInvoices, activeFilter]);
  
  const isLoading = loadingState === 'loading';

  const handleAddPaymentRequest = (invoice: EnrichedInvoice) => {
    setInvoiceToPay(invoice);
  };
  
  const handleConfirmPayment = async (newPayment: Omit<Payment, 'id'>) => {
    if (!invoiceToPay) return;
    setIsProcessingPayment(true);
    try {
        const res = await fetch('/api/invoices', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ invoiceId: invoiceToPay.id, newPayments: [newPayment] }),
        });

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || "Failed to update payment");
        }
        
        toast({ title: 'Payment Added', description: `Payment successfully added to invoice ${invoiceToPay.invoiceNumber}.` });
        setInvoiceToPay(null);
        fetchInvoices(null, true); // Refetch all invoices to show updated status
    } catch (err: any) {
        toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
        setIsProcessingPayment(false);
    }
  };

  const handleViewDetails = (invoice: EnrichedInvoice) => {
    setSelectedInvoice(invoice);
  };

  const handlePrintRequest = (invoice: EnrichedInvoice) => {
    setSelectedInvoice(invoice);
    setPrintOnOpen(true);
  };

  const filterButtons: { label: string; value: FilterStatus }[] = [
    { label: 'All Invoices', value: 'all' },
    { label: 'Paid', value: 'Paid' },
    { label: 'Partial', value: 'Partial' },
    { label: 'Unpaid', value: 'Unpaid' },
  ];

  return (
    <div className="relative z-10 w-full max-w-7xl mx-auto px-12 pt-8 pb-12">
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
            onAddPayment={handleAddPaymentRequest}
            onPrintRequest={handlePrintRequest}
        />
      </div>

      <div ref={loadMoreRef} className="text-center mt-8 h-10">
        {loadingState === 'loading-more' && (
           <Button
            disabled={true}
            variant="outline"
            className="rounded-none uppercase tracking-widest text-xs h-11 border-zinc-200 hover:bg-zinc-100"
          >
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading...
          </Button>
        )}
      </div>
      
      <InvoiceDetailsDialog
        invoice={selectedInvoice}
        isOpen={!!selectedInvoice}
        onOpenChange={(isOpen) => !isOpen && setSelectedInvoice(null)}
        printOnOpen={printOnOpen}
      />

      <AddPaymentDialog
        invoice={invoiceToPay}
        isOpen={!!invoiceToPay}
        onOpenChange={(isOpen) => !isOpen && setInvoiceToPay(null)}
        onConfirmPayment={handleConfirmPayment}
        isProcessing={isProcessingPayment}
      />
    </div>
  );
}
