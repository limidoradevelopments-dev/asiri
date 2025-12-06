
'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CartItem, CustomCartItem } from '@/app/pos/page';
import { getItemPrice } from '@/app/pos/page';
import { WithId } from '@/firebase';
import type { Product } from '@/lib/data';

type CartItemProps = {
    item: CartItem;
    onUpdate: (cartId: string, updates: Partial<CartItem>) => void;
    onRemove: (cartId: string) => void;
    formatPrice: (price: number) => string;
    customNameInputRef: React.RefObject<HTMLInputElement> | null;
}

export const CartItem = React.memo(function CartItem({ item, onUpdate, onRemove, formatPrice, customNameInputRef }: CartItemProps) {
    const originalPrice = getItemPrice(item);
    const discountedPricePerUnit = Math.max(0, originalPrice - item.discountAmount);
    const stock = item.type === 'product' ? (item as WithId<Product>).stock : Infinity;
    const lineTotal = discountedPricePerUnit * item.quantity;
    const isCustom = item.type === 'custom';

    const handleInputChange = (field: keyof CartItem, value: string | number) => {
        onUpdate(item.cartId, { [field]: value });
    };

    return (
        <div className="group py-4 border-b border-zinc-100 grid grid-cols-12 gap-4 items-center">
            <div className="col-span-5">
                {isCustom ? (
                    <Input
                        ref={customNameInputRef}
                        type="text"
                        placeholder="Custom Job Name"
                        value={item.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        className="h-auto p-0 text-sm bg-transparent border-none focus-visible:ring-0"
                    />
                ) : (
                    <span className="text-sm font-medium tracking-tight truncate block" title={item.name}>{item.name}</span>
                )}
            </div>
            <div className="col-span-2 text-center">
                <Input
                    type="number"
                    className="w-16 text-center text-sm font-mono bg-zinc-100 border border-transparent hover:border-zinc-200 focus:border-black outline-none rounded-sm transition-colors py-1"
                    value={item.quantity}
                    onChange={(e) => handleInputChange('quantity', e.target.valueAsNumber || 0)}
                    onKeyDown={(e) => ["-", "e", "+", "."].includes(e.key) && e.preventDefault()}
                    min="1"
                    max={stock}
                />
            </div>
            <div className="col-span-2 font-mono text-sm text-right">
                {isCustom ? (
                        <Input
                        type="number"
                        className="w-full text-right text-sm font-mono bg-transparent border-b border-transparent hover:border-zinc-200 focus:border-black outline-none transition-colors p-0"
                        placeholder="0.00"
                        value={(item as CustomCartItem).unitPrice || ''}
                        onChange={(e) => handleInputChange('unitPrice', parseFloat(e.target.value) || 0)}
                        onKeyDown={(e) => ["-", "e"].includes(e.key) && e.preventDefault()}
                        min="0"
                    />
                ) : (
                    formatPrice(originalPrice)
                )}
            </div>
                <div className="col-span-1 text-right">
                <Input
                    type="number"
                    className="w-12 text-right text-xs font-mono bg-transparent border-b border-transparent hover:border-zinc-200 focus:border-black outline-none transition-colors p-0"
                    placeholder="0.00"
                    value={item.discountAmount || ''}
                    onChange={(e) => handleInputChange('discountAmount', parseFloat(e.target.value) || 0)}
                    onKeyDown={(e) => ["-", "e"].includes(e.key) && e.preventDefault()}
                    min="0"
                    max={originalPrice}
                />
            </div>
            <div className="col-span-2 font-mono text-sm w-24 text-right flex items-center justify-end">
                <span>{formatPrice(lineTotal)}</span>
                <Button onClick={() => onRemove(item.cartId)} variant="ghost" size="icon" className="h-8 w-8 ml-1 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-none">
                    <Trash2 className="w-4 h-4" />
                </Button>
            </div>
        </div>
    );
});
