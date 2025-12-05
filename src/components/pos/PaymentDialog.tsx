
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { PaymentMethod, InvoiceStatus } from '@/lib/data';
import { cn } from '@/lib/utils';

type PaymentDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  totalAmount: number;
  onConfirmPayment: (paymentDetails: {
    paymentMethod?: PaymentMethod;
    amountPaid: number;
    balanceDue: number;
    paymentStatus: InvoiceStatus;
  }) => void;
};

const safeRound = (num: number): number => {
    return Math.round((num + Number.EPSILON) * 100) / 100;
};

export function PaymentDialog({
  isOpen,
  onOpenChange,
  totalAmount,
  onConfirmPayment,
}: PaymentDialogProps) {
  const [amountPaid, setAmountPaid] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');

  useEffect(() => {
    if (isOpen) {
      setAmountPaid(totalAmount.toFixed(2));
    }
  }, [isOpen, totalAmount]);

  const { balanceDue, paymentStatus } = useMemo(() => {
    const paid = parseFloat(amountPaid) || 0;
    const balance = safeRound(totalAmount - paid);
    
    let status: InvoiceStatus = 'Unpaid';
    if (paid <= 0) {
        status = 'Unpaid';
    } else if (balance <= 0) {
        status = 'Paid';
    } else {
        status = 'Partial';
    }

    return { balanceDue: Math.max(0, balance), paymentStatus: status };
  }, [amountPaid, totalAmount]);

  const handleConfirm = () => {
    onConfirmPayment({
      paymentMethod,
      amountPaid: parseFloat(amountPaid) || 0,
      balanceDue,
      paymentStatus,
    });
    onOpenChange(false);
  };
  
  const formatPrice = (price: number) => {
    return Math.max(0, price).toLocaleString("en-US", {
      style: "decimal",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const commonButtonStyles = "rounded-none uppercase tracking-widest text-xs h-11";
  const statusColors: Record<InvoiceStatus, string> = {
    Paid: 'bg-green-100 text-green-800',
    Partial: 'bg-yellow-100 text-yellow-800',
    Unpaid: 'bg-red-100 text-red-800',
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-none border-zinc-200">
        <DialogHeader>
          <DialogTitle className="font-light tracking-tight text-2xl">Process Payment</DialogTitle>
          <DialogDescription>
            Confirm payment details to finalize the invoice. Total due is LKR {formatPrice(totalAmount)}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
            {/* Payment Method */}
            <div className="space-y-3">
                <Label className="text-sm">Payment Method</Label>
                <RadioGroup
                    defaultValue="Cash"
                    className="grid grid-cols-3 gap-4"
                    value={paymentMethod}
                    onValueChange={(value: PaymentMethod) => setPaymentMethod(value)}
                >
                    {(['Cash', 'Card', 'Check'] as PaymentMethod[]).map((method) => (
                        <div key={method}>
                        <RadioGroupItem value={method} id={method} className="peer sr-only" />
                        <Label
                            htmlFor={method}
                            className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                        >
                            {method}
                        </Label>
                        </div>
                    ))}
                </RadioGroup>
            </div>

            {/* Amount Paid */}
            <div className="space-y-2">
                <Label htmlFor="amount-paid">Amount Paid (LKR)</Label>
                <Input
                    id="amount-paid"
                    type="number"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    placeholder={totalAmount.toFixed(2)}
                    className="rounded-none h-11 text-lg font-mono"
                    step="0.01"
                />
            </div>
            
             {/* Summary */}
             <div className="space-y-3 rounded-md border border-zinc-200 bg-zinc-50 p-4">
                <div className="flex justify-between items-center text-sm">
                    <span className="text-zinc-500">Balance Due</span>
                    <span className="font-mono font-medium">LKR {formatPrice(balanceDue)}</span>
                </div>
                 <div className="flex justify-between items-center text-sm">
                    <span className="text-zinc-500">Payment Status</span>
                    <span className={cn("px-2 py-1 text-xs font-semibold rounded-md", statusColors[paymentStatus])}>
                        {paymentStatus}
                    </span>
                </div>
            </div>
        </div>

        <DialogFooter className="gap-2">
          <DialogClose asChild>
            <Button type="button" variant="outline" className={commonButtonStyles}>
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={handleConfirm} className={commonButtonStyles}>
            Confirm & Create Invoice
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
