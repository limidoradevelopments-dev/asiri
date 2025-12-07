
'use client';

import { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { WithId } from '@/firebase';
import type { Invoice, Customer, Vehicle, Employee } from '@/lib/data';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';

export type EnrichedInvoice = WithId<Invoice> & {
  customerName?: string;
  vehicleNumberPlate?: string;
  employeeName?: string;
  customerDetails?: WithId<Customer>;
  vehicleDetails?: WithId<Vehicle>;
  employeeDetails?: WithId<Employee>;
};


type InvoicesTableProps = {
  data: EnrichedInvoice[];
  isLoading: boolean;
  onViewDetails: (invoice: EnrichedInvoice) => void;
};

const statusStyles: Record<EnrichedInvoice['paymentStatus'], string> = {
  Paid: "bg-emerald-100 text-emerald-800 border-emerald-200",
  Partial: "bg-amber-100 text-amber-800 border-amber-200",
  Unpaid: "bg-red-100 text-red-800 border-red-200",
};

export function InvoicesTable({ data, isLoading, onViewDetails }: InvoicesTableProps) {
  const [showEmptyState, setShowEmptyState] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (!isLoading) {
      timer = setTimeout(() => {
        setShowEmptyState(data.length === 0);
      }, 300); // 300ms delay
    } else {
      setShowEmptyState(false);
    }
    return () => clearTimeout(timer);
  }, [isLoading, data.length]);


  const formatPrice = (price: number) => {
    if (typeof price !== 'number') return 'Rs. 0.00';
    return price.toLocaleString('en-US', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace('LKR', 'Rs.');
  };
  
  const renderSkeleton = () => (
    Array.from({ length: 10 }).map((_, index) => (
      <TableRow key={index} className="border-zinc-100">
        <TableCell className="p-2 h-12"><Skeleton className="h-5 w-24" /></TableCell>
        <TableCell className="p-2 h-12"><Skeleton className="h-5 w-32" /></TableCell>
        <TableCell className="p-2 h-12"><Skeleton className="h-5 w-28" /></TableCell>
        <TableCell className="p-2 h-12"><Skeleton className="h-5 w-24" /></TableCell>
        <TableCell className="p-2 h-12"><Skeleton className="h-5 w-20" /></TableCell>
        <TableCell className="p-2 h-12 text-right"><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
        <TableCell className="p-2 h-12"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
      </TableRow>
    ))
  );

  return (
    <div className="overflow-x-auto border border-zinc-200 bg-white">
      <Table>
        <TableHeader className="bg-zinc-50">
          <TableRow className="border-zinc-200 hover:bg-transparent">
            <TableHead className="p-2 h-11 text-xs font-medium text-zinc-500 uppercase tracking-wider">Invoice #</TableHead>
            <TableHead className="p-2 h-11 text-xs font-medium text-zinc-500 uppercase tracking-wider">Customer</TableHead>
            <TableHead className="p-2 h-11 text-xs font-medium text-zinc-500 uppercase tracking-wider">Vehicle</TableHead>
            <TableHead className="p-2 h-11 text-xs font-medium text-zinc-500 uppercase tracking-wider">Date</TableHead>
            <TableHead className="p-2 h-11 text-xs font-medium text-zinc-500 uppercase tracking-wider">Status</TableHead>
            <TableHead className="p-2 h-11 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">Amount</TableHead>
            <TableHead className="p-2 h-11"><span className="sr-only">Actions</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? renderSkeleton() : data.map((invoice) => (
            <TableRow key={invoice.id} className="border-zinc-100 text-sm hover:bg-zinc-50/50 cursor-pointer" onClick={() => onViewDetails(invoice)}>
              <TableCell className="p-2 h-12 font-mono text-blue-600 hover:underline text-xs">{invoice.invoiceNumber}</TableCell>
              <TableCell className="p-2 h-12 font-medium">{invoice.customerName}</TableCell>
              <TableCell className="p-2 h-12">{invoice.vehicleNumberPlate}</TableCell>
              <TableCell className="p-2 h-12">{format(new Date(invoice.date), "MMM d, yyyy")}</TableCell>
              <TableCell className="p-2 h-12">
                <Badge className={cn("capitalize text-xs font-semibold rounded-md border", statusStyles[invoice.paymentStatus])} variant="outline">
                    {invoice.paymentStatus}
                </Badge>
              </TableCell>
              <TableCell className="text-right p-2 h-12 font-mono">{formatPrice(invoice.total)}</TableCell>
              <TableCell className="text-right p-2 h-12" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Actions</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-none border-zinc-200">
                    <DropdownMenuItem onClick={() => onViewDetails(invoice)} className="text-xs">View Details</DropdownMenuItem>
                    <DropdownMenuItem disabled className="text-xs">Print Invoice</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {showEmptyState && (
        <div className="flex items-center justify-center text-center py-20 text-zinc-400 text-sm uppercase tracking-widest">
          No invoices found for this filter
        </div>
      )}
    </div>
  );
}
