
'use client';

import { useMemo } from 'react';
import { collection } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, WithId } from '@/firebase';
import type { Product, Service } from '@/lib/data';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function POSPage() {
  const firestore = useFirestore();

  const productsCollection = useMemoFirebase(() => collection(firestore, 'products'), [firestore]);
  const servicesCollection = useMemoFirebase(() => collection(firestore, 'services'), [firestore]);

  const { data: products, isLoading: productsLoading } = useCollection<Product>(productsCollection);
  const { data: services, isLoading: servicesLoading } = useCollection<Service>(servicesCollection);

  const formatPrice = (price: number) => {
    return price.toLocaleString("en-US", {
      style: "currency",
      currency: "LKR",
      currencyDisplay: "symbol",
    }).replace('LKR', 'Rs.');
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 h-[calc(100vh-8rem)]">
      {/* Left Column: Products and Services */}
      <div className="lg:col-span-2 flex flex-col gap-4">
        <Card className="flex-1 flex flex-col rounded-3xl bg-white/65 backdrop-blur-md border-white/40 shadow-sm">
          <CardHeader>
            <CardTitle>Services</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            <ScrollArea className="flex-1">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4">
                {servicesLoading && Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="aspect-square bg-gray-200 animate-pulse rounded-lg" />
                ))}
                {services?.map(service => (
                  <div key={service.id} className="cursor-pointer aspect-square flex flex-col justify-center items-center text-center p-2 border rounded-lg bg-white/50 hover:bg-primary/10 hover:border-primary transition-colors">
                    <p className="font-semibold">{service.name}</p>
                    <p className="text-sm text-muted-foreground">{formatPrice(service.price)}</p>
                  </div>
                ))}
              </div>
               {!servicesLoading && services?.length === 0 && <p className="text-muted-foreground text-center">No services found.</p>}
            </ScrollArea>
          </CardContent>
        </Card>
        <Card className="flex-1 flex flex-col rounded-3xl bg-white/65 backdrop-blur-md border-white/40 shadow-sm">
          <CardHeader>
            <CardTitle>Products</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
             <ScrollArea className="flex-1">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4">
                 {productsLoading && Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="aspect-square bg-gray-200 animate-pulse rounded-lg" />
                ))}
                {products?.map(product => (
                  <div key={product.id} className="cursor-pointer aspect-square flex flex-col justify-center items-center text-center p-2 border rounded-lg bg-white/50 hover:bg-primary/10 hover:border-primary transition-colors">
                    <p className="font-semibold">{product.name}</p>
                    <p className="text-sm text-muted-foreground">{formatPrice(product.sellingPrice)}</p>
                  </div>
                ))}
              </div>
              {!productsLoading && products?.length === 0 && <p className="text-muted-foreground text-center">No products found.</p>}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Right Column: Invoice */}
      <div className="lg:col-span-3">
        <Card className="rounded-3xl bg-white/65 backdrop-blur-md border-white/40 shadow-sm h-full">
          <CardHeader>
            <CardTitle>Invoice</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-center py-10">Items added will appear here.</p>
            {/* Invoice items and total will go here */}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
