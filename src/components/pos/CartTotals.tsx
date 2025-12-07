'use client';

import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { CartItem } from '@/app/pos/page';
import { CartItem as CartItemComponent } from './CartItem';

interface CartTotalsProps {
  cart: CartItem[];
  customNameInputRef: React.RefObject<HTMLInputElement>;
  onUpdateCartItem: (cartId: string, updates: Partial<CartItem>) => void;
  onRemoveFromCart: (cartId: string) => void;
  onAddCustomJob: () => void;
  formatPrice: (price: number) => string;
  globalDiscountPercent: number;
  setGlobalDiscountPercent: (value: number) => void;
  totals: {
    subtotal: number;
    totalItemDiscount: number;
    total: number;
    totalDiscount: number;
  };
  onProcessPayment: () => void;
  isProcessButtonDisabled: boolean;
}

export function CartTotals({
  cart,
  customNameInputRef,
  onUpdateCartItem,
  onRemoveFromCart,
  onAddCustomJob,
  formatPrice,
  globalDiscountPercent,
  setGlobalDiscountPercent,
  totals,
  onProcessPayment,
  isProcessButtonDisabled,
}: CartTotalsProps) {
  return (
    <>
      <div className="px-10 py-2 bg-zinc-50 border-b border-t border-zinc-200">
        <div className="grid grid-cols-12 gap-4 text-xs uppercase tracking-widest text-zinc-400 font-medium">
          <div className="col-span-5 flex items-center gap-2">
            <span>Product Name</span>
            <button onClick={onAddCustomJob} title="Add custom job" className="text-zinc-400 hover:text-black transition-colors">
              <PlusCircle className="w-4 h-4" />
            </button>
          </div>
          <div className="col-span-2 text-center">QTY</div>
          <div className="col-span-2 text-right">Unit Price</div>
          <div className="col-span-1 text-right">Dis.</div>
          <div className="col-span-2 text-right">Total</div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative">
        <ScrollArea className="h-full">
          <div className="px-10">
            {cart.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-zinc-300 text-sm uppercase tracking-widest">
                ( Cart is Empty )
              </div>
            ) : (
              <div className="flex flex-col">
                {cart.map((item) => (
                  <CartItemComponent
                    key={item.cartId}
                    item={item}
                    onUpdate={onUpdateCartItem}
                    onRemove={onRemoveFromCart}
                    formatPrice={formatPrice}
                    customNameInputRef={item.type === 'custom' && item.name === '' ? customNameInputRef : null}
                  />
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      <div className="p-10 bg-white z-20 border-t border-zinc-100">
        <div className="space-y-3 mb-6">
          <div className="flex justify-between items-center text-sm">
            <span className="text-zinc-500">Subtotal</span>
            <span className="font-mono text-zinc-600">{formatPrice(totals.subtotal)}</span>
          </div>

          {totals.totalItemDiscount > 0 && (
            <div className="flex justify-between items-center text-sm text-red-500">
              <span>Total Item Discount</span>
              <span className="font-mono">- {formatPrice(totals.totalItemDiscount)}</span>
            </div>
          )}

          <div className="flex justify-between items-center text-sm">
            <span className="text-zinc-500">Global Discount</span>
            <div className="flex items-center gap-2">
              <Input
                className="w-8 text-right bg-transparent border-b border-zinc-200 focus:border-black outline-none font-mono text-zinc-500 focus:text-black"
                placeholder="0"
                type='number'
                value={globalDiscountPercent || ''}
                onChange={(e) => setGlobalDiscountPercent(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                onKeyDown={(e) => ["-", "e", "+"].includes(e.key) && e.preventDefault()}
              />
              <span className="text-zinc-400">%</span>
            </div>
          </div>
        </div>

        <Separator className="mb-6" />

        <div className="flex justify-between items-baseline mb-2">
          <span className="text-sm uppercase tracking-widest font-bold">Total Due</span>
          <span className="text-xs uppercase tracking-widest text-zinc-400">LKR</span>
        </div>
        <div className="text-5xl font-light tracking-tighter leading-none mb-6">
          {formatPrice(totals.total)}
        </div>

        {totals.totalDiscount > 0 && (
          <div className="text-right text-xs text-red-500 font-mono mb-6 -mt-4">
            You saved {formatPrice(totals.totalDiscount)} in total
          </div>
        )}

        <button
          onClick={onProcessPayment}
          disabled={isProcessButtonDisabled}
          className={cn(
            "w-full py-4 bg-black text-white text-sm uppercase tracking-[0.3em] hover:bg-zinc-800 transition-all rounded-none shadow-none",
            "disabled:bg-zinc-100 disabled:text-zinc-300",
            (cart.length > 0 && isProcessButtonDisabled) && "bg-zinc-800 opacity-90"
          )}
        >
          Process Payment
        </button>
      </div>
    </>
  );
}
