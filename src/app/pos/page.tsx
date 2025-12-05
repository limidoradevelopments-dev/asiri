
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
      {/* Left Column: Products and Services */}
      <div className="lg:col-span-2 flex flex-col gap-4">
        <Card className="flex-1 rounded-3xl bg-white/65 backdrop-blur-md border-white/40 shadow-sm">
          <CardHeader>
            <CardTitle>Products</CardTitle>
          </CardHeader>
          <CardContent>
             <p className="text-muted-foreground">Select products to add to the invoice.</p>
             {/* Product list will go here */}
          </CardContent>
        </Card>
        <Card className="flex-1 rounded-3xl bg-white/65 backdrop-blur-md border-white/40 shadow-sm">
          <CardHeader>
            <CardTitle>Services</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Select services to add to the invoice.</p>
            {/* Service list will go here */}
          </CardContent>
        </Card>
      </div>

      {/* Right Column: Invoice */}
      <div className="lg:col-span-1">
        <Card className="rounded-3xl bg-white/65 backdrop-blur-md border-white/40 shadow-sm h-full">
          <CardHeader>
            <CardTitle>Invoice</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Items added will appear here.</p>
            {/* Invoice items and total will go here */}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
