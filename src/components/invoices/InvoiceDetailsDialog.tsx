'use client';

import { useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { Invoice, Customer, Vehicle, Employee, Payment } from '@/lib/data';
import { WithId } from '@/firebase';
import { Separator } from '../ui/separator';
import { ScrollArea } from '../ui/scroll-area';
import { Printer, CheckCircle, AlertCircle } from 'lucide-react';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';

type EnrichedInvoice = WithId<Invoice> & {
  customerDetails?: WithId<Customer>;
  vehicleDetails?: WithId<Vehicle>;
  employeeDetails?: WithId<Employee>;
};

type DetailsDialogProps = {
  invoice: EnrichedInvoice | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  printOnOpen?: boolean;
};

const DetailItem = ({ label, value }: { label: string; value?: string | number | null }) => (
  <div>
    <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{label}</p>
    <p className="text-sm text-zinc-900 font-medium">{value || 'N/A'}</p>
  </div>
);

const statusStyles: Record<EnrichedInvoice['paymentStatus'], string> = {
  Paid: "bg-emerald-100 text-emerald-800 border-emerald-200",
  Partial: "bg-amber-100 text-amber-800 border-amber-200",
  Unpaid: "bg-red-100 text-red-800 border-red-200",
};


export function InvoiceDetailsDialog({ invoice, isOpen, onOpenChange, printOnOpen = false }: DetailsDialogProps) {
  const printTriggered = useRef(false);

  useEffect(() => {
    if (isOpen && printOnOpen && !printTriggered.current) {
      printTriggered.current = true;
      // Allow dialog to render before printing
      setTimeout(() => {
        window.print();
      }, 500); 
    }
    if (!isOpen) {
      printTriggered.current = false;
    }
  }, [isOpen, printOnOpen]);

  if (!invoice) return null;

  const { customerDetails: customer, vehicleDetails: vehicle, employeeDetails: employee } = invoice;

  const formatPrice = (price: number) => {
    return `Rs. ${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  
  const handlePrint = () => {
    window.print();
  }
  
  const isFullyPaid = invoice.paymentStatus === 'Paid' && invoice.balanceDue === 0;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl rounded-none border-zinc-200 p-0" id="invoice-preview">
        
        <DialogHeader className="p-6 pb-0">
          <div className="flex justify-between items-start">
            <div>
              <DialogTitle className="font-sans font-bold tracking-normal text-2xl">
                Invoice
              </DialogTitle>
              <p className="text-zinc-400 font-mono text-sm">{invoice.invoiceNumber}</p>
            </div>
             <Badge className={cn("capitalize text-xs font-semibold rounded-md border", statusStyles[invoice.paymentStatus])} variant="outline">
                {invoice.paymentStatus}
            </Badge>
          </div>
        </DialogHeader>
        
        <ScrollArea className="max-h-[75vh]">
            <div className="p-6 space-y-8">
                {/* --- Customer & Vehicle Details --- */}
                <div className="grid grid-cols-3 gap-6">
                    <div className="col-span-1 space-y-4">
                        <h3 className="text-xs uppercase tracking-widest text-zinc-400 font-bold">Bill To</h3>
                        <div className="space-y-1">
                            <p className="font-semibold text-base">{customer?.name}</p>
                            <p className="text-sm text-zinc-600">{customer?.address}</p>
                            <p className="text-sm text-zinc-600">{customer?.phone}</p>
                        </div>
                    </div>
                    <div className="col-span-1 space-y-4">
                        <h3 className="text-xs uppercase tracking-widest text-zinc-400 font-bold">Vehicle</h3>
                        <div className="space-y-1">
                            <p className="font-semibold text-base">{vehicle?.numberPlate}</p>
                            <p className="text-sm text-zinc-600">{vehicle?.make} {vehicle?.model} ({vehicle?.year})</p>
                        </div>
                    </div>
                    <div className="col-span-1 space-y-4 text-right">
                        <h3 className="text-xs uppercase tracking-widest text-zinc-400 font-bold">Details</h3>
                        <div className="space-y-1">
                            <p className="text-sm"><span className="font-semibold">Date:</span> {new Date(invoice.date).toLocaleDateString('en-US', { timeZone: 'Asia/Colombo', year: 'numeric', month: 'short', day: 'numeric' })}</p>
                            <p className="text-sm"><span className="font-semibold">Job By:</span> {employee?.name || 'N/A'}</p>
                        </div>
                    </div>
                </div>
                <Separator />
                {/* --- Items Table --- */}
                <div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200">
                        <th className="text-left font-semibold uppercase text-zinc-500 tracking-wider pb-2">Item</th>
                        <th className="text-center font-semibold uppercase text-zinc-500 tracking-wider pb-2">Qty</th>
                        <th className="text-right font-semibold uppercase text-zinc-500 tracking-wider pb-2">Unit Price</th>
                        <th className="text-right font-semibold uppercase text-zinc-500 tracking-wider pb-2">Discount</th>
                        <th className="text-right font-semibold uppercase text-zinc-500 tracking-wider pb-2">Line Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.items.map((item, index) => (
                        <tr key={index} className="border-b border-zinc-100">
                          <td className="py-3 pr-2">{item.name}</td>
                          <td className="py-3 px-2 text-center">{item.quantity}</td>
                          <td className="py-3 px-2 text-right font-mono">{formatPrice(item.unitPrice)}</td>
                          <td className="py-3 px-2 text-right font-mono">{item.discount > 0 ? formatPrice(item.discount) : '-'}</td>
                          <td className="py-3 pl-2 text-right font-mono font-semibold">{formatPrice(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* --- Totals Section --- */}
                <div className="flex justify-end">
                    <div className="w-full max-w-sm space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-zinc-600">Subtotal:</span>
                            <span className="font-mono">{formatPrice(invoice.subtotal)}</span>
                        </div>
                        {invoice.globalDiscountAmount > 0 && (
                            <div className="flex justify-between">
                                <span className="text-zinc-600">Global Discount ({invoice.globalDiscountPercent}%):</span>
                                <span className="font-mono text-red-500">- {formatPrice(invoice.globalDiscountAmount)}</span>
                            </div>
                        )}
                        <Separator/>
                        <div className="flex justify-between font-bold text-base">
                            <span>Total:</span>
                            <span className="font-mono">{formatPrice(invoice.total)}</span>
                        </div>
                         <Separator/>

                         {invoice.payments.map((payment, index) => (
                            <div key={index} className="flex justify-between">
                                <div className="text-zinc-600">
                                    Paid by {payment.method}
                                    {payment.method === 'Check' && payment.chequeNumber && (
                                        <span className="block text-xs text-zinc-400">
                                            (No: {payment.chequeNumber}, Bank: {payment.bank})
                                        </span>
                                    )}
                                </div>
                                <span className="font-mono">{formatPrice(payment.amount)}</span>
                            </div>
                         ))}
                         
                        <div className="flex justify-between font-bold text-zinc-800">
                            <span>Total Paid:</span>
                            <span className="font-mono">{formatPrice(invoice.amountPaid)}</span>
                        </div>

                        {invoice.changeGiven && invoice.changeGiven > 0 && (
                          <div className="flex justify-between">
                            <span className="text-zinc-600">Change Given:</span>
                            <span className="font-mono">{formatPrice(invoice.changeGiven)}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-semibold">
                            <span>Balance Due:</span>
                            <span className="font-mono">{formatPrice(invoice.balanceDue)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </ScrollArea>
        <DialogFooter className="p-6 bg-zinc-50 border-t border-zinc-100 gap-4 flex-row justify-between items-center print:hidden">
            {isFullyPaid ? (
                <div className="flex items-center gap-2 text-sm text-emerald-600">
                    <CheckCircle className="h-4 w-4"/>
                    <span>This invoice is fully paid.</span>
                </div>
            ) : (
                <div className="flex items-center gap-2 text-sm text-amber-600">
                    <AlertCircle className="h-4 w-4" />
                    <span>This is a partial payment. Balance of {formatPrice(invoice.balanceDue)} is due.</span>
                </div>
            )}
            <Button onClick={handlePrint} variant="outline" className="rounded-none uppercase tracking-widest text-xs h-11">
                <Printer className="mr-2 h-4 w-4"/>
                Print
            </Button>
        </DialogFooter>

        <style jsx global>{`
          @media print {
            body * {
              visibility: hidden;
            }
            #invoice-preview, #invoice-preview * {
              visibility: visible;
            }
            #invoice-preview {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              height: 100%;
              border: none;
              box-shadow: none;
              border-radius: 0;
              max-width: 100%;
            }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}
