
'use client';

import { useState } from 'react';
import { collection } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, WithId } from '@/firebase';
import type { Product, Service } from '@/lib/data';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

// --- Types ---
type CartItem = (Product | Service) & {
  id: string;
  cartId: string;
  quantity: number;
  type: 'product' | 'service';
  discountAmount: number;
};

export default function POSPage() {
  const firestore = useFirestore();

  // --- Data Fetching ---
  const productsCollection = useMemoFirebase(() => collection(firestore, 'products'), [firestore]);
  const servicesCollection = useMemoFirebase(() => collection(firestore, 'services'), [firestore]);
  const { data: products } = useCollection<Product>(productsCollection);
  const { data: services } = useCollection<Service>(servicesCollection);

  // --- State ---
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('services');
  const [globalDiscountPercent, setGlobalDiscountPercent] = useState<number>(0);

  // --- Logic Helpers ---
  const formatPrice = (price: number) => {
    return Math.max(0, price).toLocaleString("en-US", {
      style: "decimal",
      minimumFractionDigits: 2,
    });
  };

  const addToCart = (item: WithId<Product> | WithId<Service>, type: 'product' | 'service') => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      const price = 'sellingPrice' in item ? item.sellingPrice : item.price;
      return [...prev, {
        ...item,
        cartId: `${item.id}-${Date.now()}`,
        quantity: 1,
        type,
        price,
        discountAmount: 0
      }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(item => item.cartId === id ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.cartId !== id));
  };

  const updateItemDiscountAmount = (id: string, newAmount: string) => {
    const val = parseFloat(newAmount);
    setCart(prev => prev.map(item => {
      if (item.cartId === id) {
        const originalPrice = 'sellingPrice' in item ? (item as any).sellingPrice : (item as any).price;
        const amount = isNaN(val) ? 0 : Math.max(0, val);
        const effectiveDiscount = Math.min(amount, originalPrice);
        return { ...item, discountAmount: effectiveDiscount };
      }
      return item;
    }));
  };

  // --- Calculations ---
  const subtotalBeforeGlobalDiscount = cart.reduce((acc, item) => {
    const originalPrice = 'sellingPrice' in item ? (item as any).sellingPrice : (item as any).price;
    const discountedPricePerUnit = Math.max(0, originalPrice - item.discountAmount);
    return acc + (discountedPricePerUnit * item.quantity);
  }, 0);

  const globalDiscountAmount = subtotalBeforeGlobalDiscount * (globalDiscountPercent / 100);
  const total = subtotalBeforeGlobalDiscount - globalDiscountAmount;

  const itemsToShow = (activeTab === 'services' ? services : products)
    ?.filter((i: any) => i.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="flex h-screen w-full bg-[#fcfcfc] text-zinc-900 font-sans overflow-hidden">
      
      {/* GLOBAL TEXTURE: Subtle Noise */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-0 mix-blend-multiply" 
           style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} 
      />

      {/* --- LEFT: CATALOG (65%) --- */}
      <div className="relative z-10 w-[65%] flex flex-col pt-12 pl-12 pr-6">
        
        {/* Header Area */}
        <div className="flex justify-between items-end mb-12">
            <div>
                <h1 className="text-4xl font-light tracking-tighter mb-2">CATALOG</h1>
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">Select items to add</p>
            </div>
            
            {/* Search as a simple line */}
            <div className="w-64 border-b border-zinc-200 focus-within:border-black transition-colors">
                <input 
                    className="w-full bg-transparent py-2 text-sm outline-none placeholder:text-zinc-300 uppercase tracking-widest"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                />
            </div>
        </div>

        {/* Minimal Tabs */}
        <Tabs defaultValue="services" value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col min-h-0">
            <TabsList className="bg-transparent justify-start gap-12 p-0 mb-8 w-full border-b border-zinc-100">
                {['services', 'products'].map((tab) => (
                    <TabsTrigger 
                        key={tab} 
                        value={tab}
                        className="relative bg-transparent h-12 p-0 rounded-none text-sm font-medium uppercase tracking-widest text-zinc-300 data-[state=active]:text-black data-[state=active]:shadow-none hover:text-zinc-500 transition-colors"
                    >
                        {tab}
                        {activeTab === tab && <span className="absolute bottom-0 left-0 w-full h-[1px] bg-black" />}
                    </TabsTrigger>
                ))}
            </TabsList>
            
            {/* Grid - UPDATED SECTION */}
            <ScrollArea className="flex-1 -mr-4 pr-4">
                <div className="grid grid-cols-3 gap-6 pb-20">
                    {itemsToShow?.map((item) => (
                        <button 
                            key={item.id} 
                            onClick={() => addToCart(item, activeTab === 'services' ? 'service' : 'product')} 
                            className="group relative flex flex-col justify-between h-[180px] p-5 border border-zinc-200 bg-white text-left transition-all duration-200 hover:border-black hover:z-10 "
                        >
                            {/* Top Row: Category & Price */}
                            <div className="flex justify-between items-start w-full">
                                <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-300 group-hover:text-black transition-colors border border-zinc-100 group-hover:border-zinc-900 px-1.5 py-0.5 rounded-sm">
                                    {'category' in item ? item.category : 'vehicleCategory' in item ? item.vehicleCategory : (activeTab === 'services' ? 'SVC' : 'PRD')}
                                </span>
                                <span className="font-mono text-lg font-medium text-zinc-900">
                                    {formatPrice('sellingPrice' in item ? item.sellingPrice : item.price)}
                                </span>
                            </div>
                            
                            {/* Middle: Name */}
                            <div className="flex-1 flex flex-col justify-center py-2">
                                <h3 className="text-xl font-medium leading-tight tracking-tight line-clamp-2 text-zinc-800 group-hover:text-black">
                                    {item.name}
                                </h3>
                            </div>

                            {/* Bottom: ID & Add Action */}
                            <div className="w-full flex justify-between items-end border-t border-zinc-100 pt-3 mt-1 group-hover:border-zinc-200 transition-colors">
                                <span className="font-mono text-[10px] text-zinc-300">
                                    #{item.id ? item.id.substring(0, 5).toUpperCase() : '000'}
                                </span>
                                <div className="flex items-center gap-1 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                                    <span className="text-[9px] uppercase tracking-widest font-bold">Add</span>
                                    <span className="text-sm leading-none mb-0.5">+</span>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </ScrollArea>
        </Tabs>
      </div>

      {/* --- RIGHT: INVOICE (35%) --- */}
      <div className="relative z-20 w-[35%] flex flex-col bg-white border-l border-zinc-100 h-full">
        
        {/* Ticket Header */}
        <div className="pt-12 px-10 pb-8">
            <div className="flex justify-between items-baseline mb-8">
                <span className="text-xs uppercase tracking-[0.2em] text-zinc-400">Ticket</span>
                <span className="font-mono text-sm text-zinc-400">NO. {Math.floor(Math.random() * 9000) + 1000}</span>
            </div>
            <div className="w-full h-px bg-zinc-900" />
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-hidden relative">
            <ScrollArea className="h-full px-10">
                {cart.length === 0 ? (
                    <div className="h-40 flex items-center text-zinc-300 text-sm uppercase tracking-widest">
                        ( Cart Empty )
                    </div>
                ) : (
                    <div className="flex flex-col">
                        {cart.map((item, index) => {
                            const originalPrice = 'sellingPrice' in item ? (item as any).sellingPrice : (item as any).price;
                            const discountedPricePerUnit = Math.max(0, originalPrice - item.discountAmount);

                            return (
                                <div key={item.cartId} className="group py-6 border-b border-zinc-100 flex flex-col gap-3">
                                    <div className="flex justify-between items-start">
                                        <div className="flex flex-col">
                                            <span className="text-lg font-medium tracking-tight">{item.name}</span>
                                            <span className="text-[10px] uppercase tracking-widest text-zinc-400 mt-1">
                                                {formatPrice(discountedPricePerUnit)} / unit
                                            </span>
                                        </div>
                                        <div className="font-mono text-lg">
                                            {formatPrice(discountedPricePerUnit * item.quantity)}
                                        </div>
                                    </div>

                                    {/* Minimal Controls */}
                                    <div className="flex justify-between items-center opacity-30 group-hover:opacity-100 transition-opacity duration-300">
                                        
                                        {/* QTY Control (Text based) */}
                                        <div className="flex items-center gap-4 text-sm font-mono select-none">
                                            <button onClick={() => updateQty(item.cartId, -1)} className="hover:text-red-500 transition-colors cursor-pointer disabled:opacity-20" disabled={item.quantity <= 1}>[ - ]</button>
                                            <span>{item.quantity.toString().padStart(2, '0')}</span>
                                            <button onClick={() => updateQty(item.cartId, 1)} className="hover:text-black transition-colors cursor-pointer">[ + ]</button>
                                        </div>

                                        {/* Discount Control */}
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] uppercase tracking-widest text-zinc-400">Disc.</span>
                                            <input 
                                                type="number"
                                                className="w-12 text-right text-xs font-mono bg-transparent border-b border-transparent hover:border-zinc-200 focus:border-black outline-none transition-colors"
                                                placeholder="0"
                                                value={item.discountAmount || ''}
                                                onChange={(e) => updateItemDiscountAmount(item.cartId, e.target.value)}
                                            />
                                        </div>

                                        {/* Remove (Text) */}
                                        <button onClick={() => removeFromCart(item.cartId)} className="text-[9px] uppercase tracking-widest text-zinc-400 hover:text-red-600 transition-colors">
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </ScrollArea>
        </div>

        {/* Footer / Totals */}
        <div className="p-10 bg-white z-20">
            {/* Global Discount */}
            <div className="flex justify-between items-center mb-6 text-sm">
                <span className="text-zinc-400 uppercase tracking-widest text-xs">Global Discount</span>
                <div className="flex items-center gap-2">
                    <input 
                        className="w-8 text-right bg-transparent border-b border-zinc-200 focus:border-black outline-none font-mono text-zinc-500 focus:text-black"
                        placeholder="0"
                        value={globalDiscountPercent || ''}
                        onChange={(e) => setGlobalDiscountPercent(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                    />
                    <span className="text-zinc-300">%</span>
                </div>
            </div>

            {/* Total Display */}
            <div className="flex flex-col gap-2 mb-10">
                <div className="flex justify-between items-baseline">
                    <span className="text-sm uppercase tracking-widest font-bold">Total Due</span>
                    <span className="text-xs uppercase tracking-widest text-zinc-400">LKR</span>
                </div>
                <div className="text-6xl font-light tracking-tighter leading-none">
                    {formatPrice(total)}
                </div>
            </div>

            {/* Pay Button - Full Width Text Block */}
            <button 
                disabled={cart.length === 0}
                className="w-full py-6 bg-black text-white text-sm uppercase tracking-[0.3em] hover:bg-zinc-800 transition-all disabled:bg-zinc-100 disabled:text-zinc-300"
            >
                Process Payment
            </button>
        </div>

      </div>
    </div>
  );
}


    