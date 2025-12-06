
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { 
  Banknote, 
  CreditCard, 
  Wallet, 
  CheckCircle2, 
  AlertCircle,
  ArrowRight,
  Loader2
} from 'lucide-react';
import type { PaymentMethod, InvoiceStatus } from '@/lib/data';

type PaymentDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  totalAmount: number;
  onConfirmPayment: (paymentDetails: {
    paymentMethod: PaymentMethod;
    amountPaid: number;
    balanceDue: number;
    paymentStatus: InvoiceStatus;
    changeGiven: number;
    chequeNumber?: string;
    bank?: string;
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
  const [amountPaid, setAmountPaid] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [chequeNumber, setChequeNumber] = useState('');
  const [bank, setBank] = useState('');

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setAmountPaid(''); // Start empty to force user interaction, or use totalAmount for auto-fill
      setChequeNumber('');
      setBank('');
    }
  }, [isOpen, totalAmount]);

  // --- Core Calculation Logic ---
  const { balanceDue, changeGiven, paymentStatus, numericPaid } = useMemo(() => {
    const paid = Math.max(0, parseFloat(amountPaid) || 0);
    const diff = safeRound(paid - totalAmount);
    
    let status: InvoiceStatus = 'Unpaid';
    let balance = 0;
    let change = 0;

    if (paid <= 0) {
        status = 'Unpaid';
        balance = totalAmount;
    } else if (diff < 0) {
        // Customer hasn't paid enough
        status = 'Partial';
        balance = Math.abs(diff);
    } else {
        // Customer paid exact or excess
        status = 'Paid';
        change = diff; // The positive difference is the change
    }

    return { 
        balanceDue: balance, 
        changeGiven: change, 
        paymentStatus: status,
        numericPaid: paid
    };
  }, [amountPaid, totalAmount]);

  const handleConfirm = () => {
    onConfirmPayment({
      paymentMethod,
      amountPaid: numericPaid,
      balanceDue,
      paymentStatus,
      changeGiven,
      chequeNumber: paymentMethod === 'Check' ? chequeNumber : undefined,
      bank: paymentMethod === 'Check' ? bank : undefined,
    });
    // Don't close the dialog immediately; let the parent handle it after processing.
  };

  const setExactAmount = () => {
      setAmountPaid(totalAmount.toString());
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0 gap-0 overflow-hidden rounded-xl border-zinc-200 shadow-2xl">
        
        {/* --- Header: Hero Section --- */}
        <div className="bg-zinc-950 text-white p-8 text-center flex flex-col items-center justify-center">
            <span className="text-zinc-400 text-xs uppercase tracking-[0.2em] mb-2">Total Amount Due</span>
            <div className="text-5xl font-light tracking-tighter flex items-baseline gap-1">
                <span className="text-xl font-normal text-zinc-500">LKR</span>
                {formatCurrency(totalAmount)}
            </div>
        </div>

        <div className="p-6 space-y-8 bg-white">
            
            {/* --- Payment Method Selection --- */}
            <div className="space-y-3">
                <Label className="text-xs uppercase tracking-widest text-zinc-500 font-semibold">Payment Method</Label>
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { id: 'Cash', icon: Banknote }, 
                        { id: 'Card', icon: CreditCard }, 
                        { id: 'Check', icon: Wallet }
                    ].map((m) => {
                        const Icon = m.icon;
                        const isSelected = paymentMethod === m.id;
                        return (
                            <button
                                key={m.id}
                                onClick={() => setPaymentMethod(m.id as PaymentMethod)}
                                className={cn(
                                    "flex flex-col items-center justify-center gap-2 p-4 rounded-lg border transition-all duration-200",
                                    isSelected 
                                        ? "border-black bg-zinc-50 text-black shadow-sm ring-1 ring-black" 
                                        : "border-zinc-200 text-zinc-400 hover:border-zinc-300 hover:bg-zinc-50"
                                )}
                            >
                                <Icon className={cn("w-6 h-6", isSelected ? "text-black" : "text-zinc-400")} />
                                <span className="text-xs font-medium uppercase tracking-wide">{m.id}</span>
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* --- Cheque Details (Conditional) --- */}
            {paymentMethod === 'Check' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="chequeNumber" className="text-xs uppercase tracking-widest text-zinc-500">Cheque Number</Label>
                  <Input
                    id="chequeNumber"
                    value={chequeNumber}
                    onChange={(e) => setChequeNumber(e.target.value)}
                    placeholder="123456"
                    className="h-12 border-zinc-200 focus-visible:ring-black rounded-lg bg-zinc-50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bank" className="text-xs uppercase tracking-widest text-zinc-500">Bank</Label>
                  <Input
                    id="bank"
                    value={bank}
                    onChange={(e) => setBank(e.target.value)}
                    placeholder="e.g., Commercial Bank"
                    className="h-12 border-zinc-200 focus-visible:ring-black rounded-lg bg-zinc-50"
                  />
                </div>
              </div>
            )}


            {/* --- Amount Input --- */}
            <div className="space-y-3">
                <div className="flex justify-between items-end">
                    <Label className="text-xs uppercase tracking-widest text-zinc-500 font-semibold">Amount Received</Label>
                    <button 
                        onClick={setExactAmount}
                        className="text-[10px] uppercase tracking-wider font-bold text-blue-600 hover:text-blue-800 hover:underline"
                    >
                        Click for Exact Amount
                    </button>
                </div>
                
                <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-mono text-lg">LKR</span>
                    <Input
                        type="number"
                        value={amountPaid}
                        onChange={(e) => setAmountPaid(e.target.value)}
                        placeholder="0.00"
                        className="pl-14 h-14 text-2xl font-mono border-zinc-200 focus-visible:ring-black rounded-lg bg-zinc-50"
                        autoFocus
                    />
                </div>
            </div>

            {/* --- Dynamic Feedback Section (Change vs Balance) --- */}
            <div className={cn(
                "rounded-lg p-4 flex items-center justify-between border",
                changeGiven > 0 
                    ? "bg-emerald-50 border-emerald-100" 
                    : balanceDue > 0 
                        ? "bg-red-50 border-red-100" 
                        : "bg-zinc-50 border-zinc-100"
            )}>
                <div className="flex items-center gap-3">
                    {changeGiven > 0 ? (
                        <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                            <ArrowRight className="w-5 h-5 -rotate-45" />
                        </div>
                    ) : balanceDue > 0 ? (
                        <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                            <AlertCircle className="w-5 h-5" />
                        </div>
                    ) : (
                        <div className="h-10 w-10 rounded-full bg-zinc-200 flex items-center justify-center text-zinc-500">
                            <CheckCircle2 className="w-5 h-5" />
                        </div>
                    )}
                    
                    <div className="flex flex-col">
                        <span className={cn(
                            "text-xs uppercase tracking-widest font-bold",
                            changeGiven > 0 ? "text-emerald-700" : balanceDue > 0 ? "text-red-700" : "text-zinc-500"
                        )}>
                            {changeGiven > 0 ? "Change Return" : balanceDue > 0 ? "Balance Due" : "Settled"}
                        </span>
                        <span className={cn(
                            "text-lg font-mono font-medium leading-none mt-1",
                            changeGiven > 0 ? "text-emerald-900" : balanceDue > 0 ? "text-red-900" : "text-zinc-900"
                        )}>
                            LKR {formatCurrency(changeGiven > 0 ? changeGiven : balanceDue)}
                        </span>
                    </div>
                </div>

                <div className={cn(
                    "px-3 py-1 rounded-full text-[10px] uppercase tracking-widest font-bold border",
                    paymentStatus === 'Paid' ? "bg-black text-white border-black" : 
                    paymentStatus === 'Partial' ? "bg-white text-red-600 border-red-200" : 
                    "bg-zinc-100 text-zinc-400 border-zinc-200"
                )}>
                    {paymentStatus}
                </div>
            </div>
        </div>

        {/* --- Footer --- */}
        <DialogFooter className="p-4 bg-zinc-50 border-t border-zinc-100 gap-3 sm:gap-0">
          <DialogClose asChild>
            <Button type="button" variant="outline" className="h-12 flex-1 sm:flex-none border-zinc-200 hover:bg-white hover:text-black" disabled={isProcessing}>
              Cancel
            </Button>
          </DialogClose>
          <Button 
            onClick={handleConfirm} 
            className="h-12 px-8 flex-1 bg-black hover:bg-zinc-800 text-white uppercase tracking-widest text-xs font-bold"
            disabled={isProcessing || (paymentStatus === 'Unpaid' && numericPaid === 0 && paymentMethod !== 'Check')}
          >
            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isProcessing ? 'Processing...' : 'Complete Transaction'}
          </Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}
