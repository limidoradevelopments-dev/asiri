
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Banknote, CreditCard, Wallet, Plus, Trash2, Loader2, Info } from 'lucide-react';
import type { PaymentMethod, InvoiceStatus, Payment } from '@/lib/data';
import { Separator } from '../ui/separator';

type PaymentDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  totalAmount: number;
  onConfirmPayment: (paymentDetails: {
    payments: Payment[];
    amountPaid: number;
    balanceDue: number;
    paymentStatus: InvoiceStatus;
    changeGiven: number;
  }) => void;
  isProcessing: boolean;
};

// --- Utilities ---
const safeRound = (num: number): number => {
  return Math.round((num + Number.EPSILON) * 100) / 100;
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export function PaymentDialog({
  isOpen,
  onOpenChange,
  totalAmount,
  onConfirmPayment,
  isProcessing,
}: PaymentDialogProps) {
  const [payments, setPayments] = useState<Payment[]>([]);

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setPayments([{ method: 'Cash', amount: totalAmount, id: Date.now().toString() }]);
    }
  }, [isOpen, totalAmount]);
  
  const { totalPaid, remainingBalance, changeGiven, paymentStatus } = useMemo(() => {
    const paid = payments.reduce((acc, p) => acc + (p.amount || 0), 0);
    const total = safeRound(paid);
    const diff = safeRound(total - totalAmount);

    let status: InvoiceStatus = 'Unpaid';
    let balance = totalAmount;
    let change = 0;

    if (total <= 0) {
      status = 'Unpaid';
    } else if (diff < 0) {
      status = 'Partial';
      balance = Math.abs(diff);
    } else {
      status = 'Paid';
      balance = 0;
      change = diff;
    }

    return {
      totalPaid: total,
      remainingBalance: balance,
      changeGiven: change,
      paymentStatus: status,
    };
  }, [payments, totalAmount]);
  
  const handleAddPayment = () => {
    if (remainingBalance > 0) {
      setPayments(prev => [...prev, { method: 'Cash', amount: remainingBalance, id: Date.now().toString() }]);
    }
  };

  const handleRemovePayment = (id: string) => {
    setPayments(prev => prev.filter(p => p.id !== id));
  };
  
  const handleUpdatePayment = (id: string, updates: Partial<Payment>) => {
    setPayments(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };
  
  const handleConfirm = () => {
    // Filter out any payments with zero amount, unless it's the only one
    const validPayments = payments.filter((p, index) => {
        if (payments.length > 1) return p.amount > 0;
        return true;
    });

    onConfirmPayment({
      payments: validPayments,
      amountPaid: totalPaid,
      balanceDue: remainingBalance,
      paymentStatus,
      changeGiven,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden rounded-xl border-zinc-200 shadow-2xl">
        <DialogHeader className="bg-zinc-950 text-white p-6 text-center flex flex-col items-center justify-center">
          <DialogTitle className="text-zinc-400 text-xs uppercase tracking-[0.2em] mb-2">
            Total Amount Due
          </DialogTitle>
          <div className="text-5xl font-light tracking-tighter flex items-baseline gap-1">
            <span className="text-xl font-normal text-zinc-500">LKR</span>
            {formatCurrency(totalAmount)}
          </div>
        </DialogHeader>

        <div className="p-6 bg-white max-h-[60vh] overflow-y-auto">
          {payments.map((payment, index) => (
            <div key={payment.id} className="grid grid-cols-12 gap-4 items-start mb-4">
              {/* --- Payment Method Selection --- */}
              <div className="col-span-3 space-y-1.5">
                {index === 0 && <Label className="text-xs uppercase tracking-widest text-zinc-400">Method</Label>}
                <div className="flex items-center gap-1 rounded-md bg-zinc-100 p-1">
                  {[
                    { id: 'Cash', icon: Banknote },
                    { id: 'Card', icon: CreditCard },
                    { id: 'Check', icon: Wallet },
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => handleUpdatePayment(payment.id!, { method: m.id as PaymentMethod })}
                      className={cn(
                        "flex-1 flex items-center justify-center p-2 rounded-sm transition-all duration-200 text-zinc-400",
                        payment.method === m.id && "bg-white text-black shadow-sm"
                      )}
                      title={m.id}
                    >
                      <m.icon className="w-5 h-5" />
                    </button>
                  ))}
                </div>
              </div>

              {/* --- Amount Input --- */}
              <div className={cn("space-y-1.5", payment.method === 'Check' ? 'col-span-3' : 'col-span-8')}>
                {index === 0 && <Label className="text-xs uppercase tracking-widest text-zinc-400">Amount</Label>}
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-mono">LKR</span>
                  <Input
                    type="number"
                    value={payment.amount || ''}
                    onChange={(e) => handleUpdatePayment(payment.id!, { amount: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    className="pl-12 h-11 text-base font-mono border-zinc-200 focus-visible:ring-black bg-white"
                  />
                </div>
              </div>
              
              {/* --- Cheque Details --- */}
              {payment.method === 'Check' && (
                <>
                  <div className="col-span-3 space-y-1.5">
                    {index === 0 && <Label className="text-xs uppercase tracking-widest text-zinc-400">Cheque No.</Label>}
                    <Input
                      value={payment.chequeNumber || ''}
                      onChange={(e) => handleUpdatePayment(payment.id!, { chequeNumber: e.target.value })}
                      className="h-11 border-zinc-200 focus-visible:ring-black bg-white"
                    />
                  </div>
                   <div className="col-span-3 space-y-1.5">
                    {index === 0 && <Label className="text-xs uppercase tracking-widest text-zinc-400">Bank</Label>}
                    <Input
                      value={payment.bank || ''}
                      onChange={(e) => handleUpdatePayment(payment.id!, { bank: e.target.value })}
                      className="h-11 border-zinc-200 focus-visible:ring-black bg-white"
                    />
                  </div>
                </>
              )}

              {/* --- Remove Button --- */}
              <div className={cn("flex items-center", payment.method === 'Check' ? 'col-span-12' : 'col-span-1')}>
                 <div className="w-full flex justify-end">
                    {payments.length > 1 && (
                      <Button onClick={() => handleRemovePayment(payment.id!)} variant="ghost" size="icon" className="h-11 w-11 text-zinc-400 hover:text-red-500 hover:bg-red-50">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                 </div>
              </div>
            </div>
          ))}

          {remainingBalance > 0 && (
            <Button onClick={handleAddPayment} variant="outline" className="w-full mt-4 h-11 rounded-md border-dashed border-zinc-300 text-zinc-500 hover:text-black hover:border-black">
                <Plus className="mr-2 h-4 w-4" />
                Add Another Payment Method
            </Button>
          )}

        </div>
        
        <Separator/>

        <div className="p-6 bg-zinc-50 space-y-4">
             <div className="flex justify-between items-center text-sm">
                <span className="font-semibold text-zinc-600">Total Paid</span>
                <span className="font-mono font-medium text-lg text-black">{formatCurrency(totalPaid)}</span>
            </div>
            
             <div className="flex justify-between items-center text-sm">
                <span className={cn("font-semibold", changeGiven > 0 ? "text-emerald-600" : "text-zinc-600")}>
                    {changeGiven > 0 ? "Change to Return" : "Remaining Balance"}
                </span>
                <span className={cn("font-mono font-medium text-lg", changeGiven > 0 ? "text-emerald-600" : "text-black")}>
                    {formatCurrency(changeGiven > 0 ? changeGiven : remainingBalance)}
                </span>
            </div>
            
            {paymentStatus === 'Unpaid' && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-md flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    <span>This invoice will be marked as Unpaid.</span>
                </div>
            )}
        </div>

        <DialogFooter className="p-4 bg-zinc-100 border-t border-zinc-200 gap-3 sm:gap-3">
          <Button type="button" variant="ghost" className="h-12 flex-1 sm:flex-none text-zinc-600 hover:bg-zinc-200" disabled={isProcessing} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            className="h-12 px-8 flex-1 bg-black hover:bg-zinc-800 text-white uppercase tracking-widest text-xs font-bold"
            disabled={isProcessing}
          >
            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isProcessing ? 'Processing...' : 'Complete Transaction'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    