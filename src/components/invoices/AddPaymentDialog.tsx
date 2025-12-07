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
import { Banknote, CreditCard, Wallet, Loader2, Info } from 'lucide-react';
import type { PaymentMethod, Payment } from '@/lib/data';
import { Separator } from '../ui/separator';
import { useToast } from '@/hooks/use-toast';
import { EnrichedInvoice } from '@/app/invoices/page';

type AddPaymentDialogProps = {
  invoice: EnrichedInvoice | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onConfirmPayment: (newPayment: Omit<Payment, 'id'>) => void;
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

const availableMethods: { id: PaymentMethod, icon: React.ElementType }[] = [
    { id: 'Cash', icon: Banknote },
    { id: 'Card', icon: CreditCard },
    { id: 'Check', icon: Wallet },
];

export function AddPaymentDialog({
  invoice,
  isOpen,
  onOpenChange,
  onConfirmPayment,
  isProcessing,
}: AddPaymentDialogProps) {
  const { toast } = useToast();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [tenderedAmount, setTenderedAmount] = useState<number>(0);
  const [chequeNumber, setChequeNumber] = useState('');
  const [bank, setBank] = useState('');

  const balanceDue = invoice?.balanceDue || 0;

  useEffect(() => {
    if (isOpen && balanceDue > 0) {
      setTenderedAmount(balanceDue);
      setPaymentMethod('Cash');
      setChequeNumber('');
      setBank('');
    } else {
      setTenderedAmount(0);
    }
  }, [isOpen, balanceDue]);

  const { changeGiven, isChequeInfoMissing, isAmountInsufficient } = useMemo(() => {
    const amount = tenderedAmount || 0;
    const diff = safeRound(amount - balanceDue);
    
    const chequeInfoMissing = paymentMethod === 'Check' && (!chequeNumber.trim() || !bank.trim());
    const amountInsufficient = amount < balanceDue;

    return {
      changeGiven: diff > 0 ? diff : 0,
      isChequeInfoMissing: chequeInfoMissing,
      isAmountInsufficient: amountInsufficient,
    };
  }, [tenderedAmount, balanceDue, paymentMethod, chequeNumber, bank]);

  const handleConfirm = () => {
    if (isAmountInsufficient) {
      toast({
        variant: "destructive",
        title: "Insufficient Amount",
        description: "Payment must cover the full outstanding balance.",
      });
      return;
    }
    if (isChequeInfoMissing) {
      toast({
        variant: "destructive",
        title: "Missing Cheque Details",
        description: "Please fill in the Cheque Number and Bank for 'Check' payments.",
      });
      return;
    }

    const newPayment: Omit<Payment, 'id'> = {
      method: paymentMethod,
      amount: tenderedAmount,
    };
    if (paymentMethod === 'Check') {
      newPayment.chequeNumber = chequeNumber;
      newPayment.bank = bank;
    }
    
    onConfirmPayment(newPayment);
  };

  const isConfirmDisabled = isProcessing || isChequeInfoMissing || isAmountInsufficient;

  if (!invoice) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl p-0 gap-0 overflow-hidden rounded-xl border-zinc-200 shadow-2xl">
        <DialogHeader className="bg-zinc-950 text-white p-6 text-center flex flex-col items-center justify-center">
          <DialogTitle className="text-zinc-400 text-xs uppercase tracking-[0.2em] mb-2">
            Add Payment for Invoice {invoice.invoiceNumber}
          </DialogTitle>
          <div className="text-5xl font-light tracking-tighter flex items-baseline gap-1">
            <span className="text-xl font-normal text-zinc-500">LKR</span>
            {formatCurrency(invoice.balanceDue)}
          </div>
           <p className="text-sm text-zinc-400">Balance Due</p>
        </DialogHeader>

        <div className="p-6 bg-white space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-widest text-zinc-400">Payment Method</Label>
              <div className="flex items-center gap-1 rounded-md bg-zinc-100 p-1">
                {availableMethods.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setPaymentMethod(m.id as PaymentMethod)}
                    className={cn(
                      "flex-1 flex items-center justify-center p-2 rounded-sm transition-all duration-200 text-zinc-400",
                      paymentMethod === m.id && "bg-white text-black shadow-sm"
                    )}
                    title={m.id}
                  >
                    <m.icon className="w-5 h-5" />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-widest text-zinc-400">Amount Tendered</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-mono">LKR</span>
                <Input
                  type="number"
                  value={tenderedAmount || ''}
                  onChange={(e) => setTenderedAmount(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="pl-12 h-11 text-base font-mono border-zinc-200 focus-visible:ring-black bg-white"
                />
              </div>
            </div>
          </div>
          
          {paymentMethod === 'Check' && (
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-widest text-zinc-400">Cheque No.</Label>
                <Input
                  value={chequeNumber}
                  onChange={(e) => setChequeNumber(e.target.value)}
                  className="h-11 border-zinc-200 focus-visible:ring-black bg-white"
                  placeholder="Required"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-widest text-zinc-400">Bank</Label>
                <Input
                  value={bank}
                  onChange={(e) => setBank(e.target.value)}
                  className="h-11 border-zinc-200 focus-visible:ring-black bg-white"
                  placeholder="Required"
                />
              </div>
            </div>
          )}
        </div>
        
        <Separator/>

        <div className="p-6 bg-zinc-50 space-y-4">
            {changeGiven > 0 && (
                <div className="flex justify-between items-center text-sm">
                    <span className="font-semibold text-emerald-600">Change to Return</span>
                    <span className="font-mono font-medium text-lg text-emerald-600">
                        {formatCurrency(changeGiven)}
                    </span>
                </div>
            )}
            
            {isAmountInsufficient && (
                 <div className="p-3 bg-red-50 text-red-700 text-xs rounded-md flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    <span>Tendered amount must cover the full balance of {formatCurrency(balanceDue)}.</span>
                </div>
            )}
            
            {isChequeInfoMissing && (
                 <div className="p-3 bg-amber-50 text-amber-700 text-xs rounded-md flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    <span>Cheque Number and Bank are required for 'Check' payments.</span>
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
            disabled={isConfirmDisabled}
          >
            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isProcessing ? 'Processing...' : 'Settle Payment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
