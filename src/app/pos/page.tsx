
'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { collection, doc, serverTimestamp, updateDoc, increment } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, WithId } from '@/firebase';
import type { Product, Service, Employee, Customer, Vehicle, Invoice, PaymentMethod, VehicleCategory } from '@/lib/data';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { Search, Trash2, ChevronsUpDown, Check, UserPlus, Archive, PlusCircle, Car, Bike, Truck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { AddCustomerVehicleDialog } from '@/components/pos/AddCustomerVehicleDialog';
import { useToast } from '@/hooks/use-toast';
import { PaymentDialog } from '@/components/pos/PaymentDialog';
import { Input } from '@/components/ui/input';
import { CartItem as CartItemComponent } from '@/components/pos/CartItem';
import { useDebouncedCallback } from 'use-debounce';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


// --- Types ---
export type CartItemBase = {
  cartId: string;
  quantity: number;
  discountAmount: number; // Discount per UNIT
};

export type StandardCartItem = CartItemBase & WithId<Product | Service> & {
  type: 'product' | 'service';
};

export type CustomCartItem = CartItemBase & {
  name: string;
  unitPrice: number;
  type: 'custom';
};

export type CartItem = StandardCartItem | CustomCartItem;


// --- Math & Helper Utilities ---

// Solves floating point math issues (e.g., 0.1 + 0.2 !== 0.3)
export const safeRound = (num: number): number => {
  return Math.round((num + Number.EPSILON) * 100) / 100;
};

// Safely gets price regardless of Product (sellingPrice) or Service (price)
export const getItemPrice = (item: CartItem): number => {
  if (item.type === 'custom') return item.unitPrice;
  if ('sellingPrice' in item) return (item as WithId<Product>).sellingPrice;
  if ('price' in item) return (item as WithId<Service>).price;
  return 0;
};

const categoryIcons: Record<VehicleCategory, React.ElementType> = {
    "Car": Car,
    "Jeep/Van": Truck,
    "Bike": Bike,
};

export default function POSPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const customNameInputRef = useRef<HTMLInputElement>(null);

  // --- Data Fetching ---
  const productsCollection = useMemoFirebase(() => collection(firestore, 'products'), [firestore]);
  const servicesCollection = useMemoFirebase(() => collection(firestore, 'services'), [firestore]);
  const employeesCollection = useMemoFirebase(() => collection(firestore, 'employees'), [firestore]);
  const customersCollection = useMemoFirebase(() => collection(firestore, 'customers'), [firestore]);
  const vehiclesCollection = useMemoFirebase(() => collection(firestore, 'vehicles'), [firestore]);
  const invoicesCollection = useMemoFirebase(() => collection(firestore, 'invoices'), [firestore]);

  const { data: products } = useCollection<WithId<Product>>(productsCollection);
  const { data: services } = useCollection<WithId<Service>>(servicesCollection);
  const { data: employees } = useCollection<WithId<Employee>>(employeesCollection);
  const { data: customers } = useCollection<WithId<Customer>>(customersCollection);
  const { data: vehicles } = useCollection<WithId<Vehicle>>(vehiclesCollection);

  // --- State ---
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('services');
  const [categoryFilter, setCategoryFilter] = useState<VehicleCategory | 'all'>('all');
  const [globalDiscountPercent, setGlobalDiscountPercent] = useState<number>(0);
  const [selectedEmployee, setSelectedEmployee] = useState<WithId<Employee> | null>(null);
  const [employeePopoverOpen, setEmployeePopoverOpen] = useState(false);
  const [isCustomerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<WithId<Customer> | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<WithId<Vehicle> | null>(null);
  const [isPaymentDialogOpen, setPaymentDialogOpen] = useState(false);

  useEffect(() => {
    if (cart.some(item => item.type === 'custom' && item.name === '')) {
      customNameInputRef.current?.focus();
    }
  }, [cart]);


  // --- Logic Helpers ---
  const formatPrice = (price: number) => {
    return Math.max(0, price).toLocaleString("en-US", {
      style: "decimal",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const addToCart = (item: WithId<Product> | WithId<Service>, type: 'product' | 'service') => {
    setCart((prev) => {
      const existing = prev.find((i) => i.type !== 'custom' && i.id === item.id);
      const stock = type === 'product' ? (item as WithId<Product>).stock : Infinity;
      
      if (existing) {
        // Strict stock check
        if (existing.quantity < stock) {
          return prev.map((i) => i.cartId === existing.cartId ? { ...i, quantity: i.quantity + 1 } : i);
        }
        return prev; // Stock limit reached
      }
      
      if (stock > 0) {
        const newItem: StandardCartItem = {
          ...item,
          cartId: `${item.id}-${Date.now()}`,
          quantity: 1,
          type,
          discountAmount: 0
        };
        return [...prev, newItem];
      }
      return prev; // Out of stock
    });
  };

  const addCustomJob = () => {
    const newCustomItem: CustomCartItem = {
      cartId: `custom-${Date.now()}`,
      name: '',
      quantity: 1,
      unitPrice: 0,
      discountAmount: 0,
      type: 'custom',
    };
    setCart(prev => [...prev, newCustomItem]);
  };
  
  const debouncedUpdateCartItem = useDebouncedCallback((cartId: string, updates: Partial<CartItem>) => {
    setCart(prev => prev.map(item => {
      if (item.cartId === cartId) {
        const updatedItem = { ...item, ...updates };

        if ('quantity' in updates && updatedItem.quantity !== undefined) {
            const stock = item.type === 'product' ? (item as WithId<Product>).stock : Infinity;
            updatedItem.quantity = Math.max(1, Math.min(Math.floor(updatedItem.quantity || 1), stock));
        }

        if ('discountAmount' in updates && updatedItem.discountAmount !== undefined) {
          const originalPrice = getItemPrice(item);
          updatedItem.discountAmount = Math.min(updatedItem.discountAmount || 0, originalPrice);
        }
        
        return updatedItem;
      }
      return item;
    }));
  }, 300);

  const updateCartItem = (cartId: string, updates: Partial<CartItem>) => {
     setCart(prev => prev.map(item => item.cartId === cartId ? {...item, ...updates} : item));
     debouncedUpdateCartItem(cartId, updates);
  }
  
  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.cartId !== id));
  };
  
  const handleSelectCustomerAndVehicle = (customer: WithId<Customer>, vehicle: WithId<Vehicle>) => {
    setSelectedCustomer(customer);
    setSelectedVehicle(vehicle);
    setCustomerDialogOpen(false);
  };
  
  const handleCreateCustomerAndVehicle = async (customerData: Omit<Customer, 'id'>, vehicleData: Omit<Vehicle, 'id' | 'customerId'>) => {
    if(!customersCollection || !vehiclesCollection) return;
    const customerRef = await addDocumentNonBlocking(customersCollection, customerData);
    if(customerRef) {
      const newVehicleData = { ...vehicleData, customerId: customerRef.id };
      const vehicleRef = await addDocumentNonBlocking(vehiclesCollection, newVehicleData);
      if(vehicleRef) {
        // We manually create the new objects to pass to the selection handler,
        // because the firestore hooks won't update with the new data immediately.
        handleSelectCustomerAndVehicle({ ...customerData, id: customerRef.id }, { ...newVehicleData, id: vehicleRef.id });
      }
    }
  };

  // --- Core Financial Calculations ---
  // We use useMemo to ensure these values are recalculated consistently only when cart changes
  const totals = useMemo(() => {
    const subtotalBeforeGlobalDiscount = cart.reduce((acc, item) => {
      const originalPrice = getItemPrice(item);
      const discountedPricePerUnit = Math.max(0, originalPrice - item.discountAmount);
      // Calculate line total, THEN add to accumulator
      const lineTotal = safeRound(discountedPricePerUnit * item.quantity);
      return safeRound(acc + lineTotal);
    }, 0);

    const globalDiscountAmount = safeRound(subtotalBeforeGlobalDiscount * (globalDiscountPercent / 100));
    const total = safeRound(subtotalBeforeGlobalDiscount - globalDiscountAmount);

    return {
      subtotal: subtotalBeforeGlobalDiscount,
      globalDiscountAmount,
      total
    };
  }, [cart, globalDiscountPercent]);

  const itemsToShow = useMemo(() => {
    let list: WithId<Service>[] | WithId<Product>[] | undefined;

    if (activeTab === 'services') {
        list = services;
        if (categoryFilter !== 'all') {
            list = list?.filter(s => s.vehicleCategory === categoryFilter);
        }
    } else {
        list = products;
    }
    
    if (!searchQuery) return list;
    const lowercasedQuery = searchQuery.toLowerCase();
    return list?.filter((i: any) => i.name.toLowerCase().includes(lowercasedQuery));
  }, [activeTab, services, products, searchQuery, categoryFilter]);


  const resetState = useCallback(() => {
    setCart([]);
    setGlobalDiscountPercent(0);
    setSelectedEmployee(null);
    setSelectedCustomer(null);
    setSelectedVehicle(null);
    setPaymentDialogOpen(false);
  }, []);

  const handleProcessPayment = () => {
    // 1. Basic Validation
    if (!selectedCustomer || !selectedVehicle || !selectedEmployee || cart.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please select a customer, vehicle, employee, and add items to the cart.',
      });
      return;
    }

    // 2. FINAL STOCK VALIDATION & CUSTOM ITEM VALIDATION
    const errors: string[] = [];
    cart.forEach(cartItem => {
        if (cartItem.type === 'product') {
            const liveProduct = products?.find(p => p.id === cartItem.id);
            if (!liveProduct || liveProduct.stock < cartItem.quantity) {
                errors.push(`Insufficient stock for: ${cartItem.name}`);
            }
        }
        if (cartItem.type === 'custom' && (!cartItem.name.trim() || cartItem.unitPrice <= 0)) {
            errors.push('A custom job is missing a name or has an invalid price.');
        }
    });

    if (errors.length > 0) {
        toast({
            variant: 'destructive',
            title: 'Invoice Error',
            description: errors.join(' '),
        });
        return;
    }

    // 3. Open Payment Dialog
    setPaymentDialogOpen(true);
  };
  
  const handleConfirmPayment = useCallback(async (paymentDetails: Omit<Parameters<typeof onConfirmPayment>[0], "changeDue"> & { changeGiven: number }) => {
    if (!selectedCustomer || !selectedVehicle || !selectedEmployee || !invoicesCollection || !firestore) return;

    const invoiceItems = cart.map(item => {
      const originalPrice = getItemPrice(item);
      const discountedPricePerUnit = Math.max(0, originalPrice - item.discountAmount);
      const lineTotal = safeRound(discountedPricePerUnit * item.quantity);
      
      return {
        itemId: item.type !== 'custom' ? item.id : `custom-${Date.now()}`,
        name: item.name,
        quantity: item.quantity,
        unitPrice: originalPrice,
        discount: item.discountAmount,
        total: lineTotal,
      };
    });

    const invoice: Omit<Invoice, 'id'> = {
      invoiceNumber: `INV-${Date.now()}`,
      customerId: selectedCustomer.id,
      vehicleId: selectedVehicle.id,
      employeeId: selectedEmployee.id,
      date: Date.now(),
      items: invoiceItems,
      subtotal: totals.subtotal,
      globalDiscountPercent,
      globalDiscountAmount: totals.globalDiscountAmount,
      total: totals.total,
      paymentStatus: paymentDetails.paymentStatus,
      amountPaid: paymentDetails.amountPaid,
      balanceDue: paymentDetails.balanceDue,
      changeGiven: paymentDetails.changeGiven,
      paymentMethod: paymentDetails.paymentMethod,
      ...(paymentDetails.paymentMethod === 'Check' && { 
        chequeNumber: paymentDetails.chequeNumber, 
        bank: paymentDetails.bank 
      }),
    };
    
    // 4. Execute Database Operations
    await addDocumentNonBlocking(invoicesCollection, invoice);

    // Decrement stock for products in the cart
    for (const item of cart) {
      if (item.type === 'product') {
        const productRef = doc(firestore, 'products', item.id);
        // This is a non-blocking operation on purpose. We don't need to wait for it.
        updateDoc(productRef, {
            stock: increment(-item.quantity)
        }).catch(err => console.error(`Failed to update stock for ${item.id}`, err));
      }
    }

    const vehicleDocRef = doc(firestore, 'vehicles', selectedVehicle.id);
    await updateDocumentNonBlocking(vehicleDocRef, { lastVisit: serverTimestamp() });
    
    toast({
      title: 'Invoice Created',
      description: `Invoice for ${selectedCustomer.name} successfully processed for LKR ${formatPrice(totals.total)}.`,
    });

    resetState();
  }, [selectedCustomer, selectedVehicle, selectedEmployee, cart, totals, globalDiscountPercent, invoicesCollection, firestore, resetState, toast]);
  
  const filterButtons: { label: string; value: VehicleCategory | 'all'; icon: React.ElementType }[] = [
    { label: 'All', value: 'all', icon: Sparkles },
    { label: 'Bike', value: 'Bike', icon: Bike },
    { label: 'Car', value: 'Car', icon: Car },
    { label: 'Jeep/Van', value: 'Jeep/Van', icon: Truck },
  ];

  return (
    <div className="flex h-screen w-full bg-background font-sans overflow-hidden">
      
      {/* GLOBAL TEXTURE: Subtle Noise is on body via layout */}

      {/* --- LEFT: CATALOG (55%) --- */}
      <div className="relative z-10 w-[55%] flex flex-col pt-8 pl-12 pr-6">
        
        {/* Header Area */}
        <div className="flex justify-between items-start mb-6">
            <div>
                <h1 className="text-5xl font-normal tracking-tighter mb-2">POINT OF SALE</h1>
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">Create new invoices</p>
            </div>
            
            {/* Search as a simple line */}
            <div className="relative group w-80">
                <Search className="absolute left-0 bottom-3 h-4 w-4 text-zinc-400 group-focus-within:text-black transition-colors" />
                <input
                    type="search"
                    placeholder="SEARCH ITEM..."
                    className="w-full bg-transparent border-b border-zinc-200 py-2.5 pl-8 text-sm outline-none placeholder:text-zinc-300 placeholder:uppercase placeholder:tracking-widest uppercase tracking-wide focus:border-black transition-colors"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
        </div>

        {/* Category Filters */}
        <div className="flex items-center justify-between mb-8">
            <div className={cn("flex items-center gap-2 transition-opacity", activeTab === 'products' && 'opacity-20 pointer-events-none')}>
                {filterButtons.map(({ label, value, icon: Icon }) => (
                    <TooltipProvider key={value}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                key={value}
                                onClick={() => setCategoryFilter(value)}
                                variant="ghost"
                                size="icon"
                                className={cn(
                                    "h-10 w-10 rounded-full border border-zinc-200 text-zinc-400 hover:bg-zinc-100 hover:text-black",
                                    categoryFilter === value && "bg-black text-white hover:bg-black hover:text-white border-black"
                                )}
                                >
                                    <Icon className="h-5 w-5" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Filter {label}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                ))}
            </div>
        </div>

        {/* Minimal Tabs */}
        <Tabs defaultValue="services" value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col min-h-0">
            <TabsList className="bg-zinc-100 justify-start p-1 w-full rounded-none">
                <TabsTrigger
                    value="services"
                    className="relative h-10 px-6 rounded-none text-sm font-medium uppercase tracking-widest text-zinc-400 data-[state=active]:text-white data-[state=active]:bg-black data-[state=active]:shadow-none hover:bg-zinc-200 transition-colors"
                >
                    Services
                </TabsTrigger>
                <TabsTrigger
                    value="products"
                    className="relative h-10 px-6 rounded-none text-sm font-medium uppercase tracking-widest text-zinc-400 data-[state=active]:text-white data-[state=active]:bg-black data-[state=active]:shadow-none hover:bg-zinc-200 transition-colors"
                >
                    Products
                </TabsTrigger>
            </TabsList>
            
            {/* Grid */}
            <ScrollArea className="flex-1 -mr-4 pr-4 mt-8">
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 pb-20">
                    {itemsToShow?.map((item) => {
                        const isProduct = 'stock' in item;
                        const isService = 'price' in item;
                        const cartItem = cart.find(ci => ci.type !== 'custom' && ci.id === item.id);
                        const cartQuantity = cartItem?.quantity ?? 0;
                        const stock = isProduct ? (item as WithId<Product>).stock : Infinity;
                        const isOutOfStock = stock <= 0;
                        const cartLimitReached = isProduct && cartQuantity >= stock;
                        const isDisabled = isOutOfStock || cartLimitReached;
                        const CategoryIcon = isService && item.vehicleCategory ? categoryIcons[item.vehicleCategory] : null;

                        return (
                            <button 
                                key={item.id} 
                                onClick={() => addToCart(item, activeTab === 'services' ? 'service' : 'product')} 
                                disabled={isDisabled}
                                className={cn(
                                    "group relative flex flex-col justify-between h-[180px] p-5 border border-zinc-200 bg-white text-left transition-all duration-200",
                                    !isDisabled && "hover:border-black hover:z-10",
                                    isDisabled && "bg-zinc-50 opacity-60 cursor-not-allowed"
                                )}
                            >
                                {/* Top Row: Category & Price */}
                                <div className="flex justify-between items-start w-full">
                                    <div className='flex items-center gap-2'>
                                        {CategoryIcon && <CategoryIcon className="w-4 h-4 text-zinc-400" />}
                                        <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-300 group-hover:text-black transition-colors border border-zinc-100 group-hover:border-zinc-900 px-1.5 py-0.5 rounded-sm">
                                            {isService ? 'SVC' : 'PRD'}
                                        </span>
                                    </div>
                                    <span className="font-mono text-lg font-medium text-zinc-900">
                                        {formatPrice(getItemPrice(item as any))}
                                    </span>
                                </div>
                                
                                {/* Middle: Name */}
                                <div className="flex-1 flex flex-col justify-center py-2">
                                    <h3 className="text-xl font-medium leading-tight tracking-tight line-clamp-2 text-zinc-800 group-hover:text-black">
                                        {item.name}
                                    </h3>
                                    {isService && (item as WithId<Service>).description && (
                                        <p className="text-xs text-zinc-400 mt-1 line-clamp-1">{ (item as WithId<Service>).description }</p>
                                    )}
                                </div>

                                {/* Bottom: ID & Add Action / Stock */}
                                <div className="w-full flex justify-between items-end border-t border-zinc-100 pt-3 mt-1 group-hover:border-zinc-200 transition-colors">
                                     <div className='flex items-center gap-2'>
                                        <span className="font-mono text-[10px] text-zinc-300">
                                            #{item.id ? item.id.substring(0, 5).toUpperCase() : '000'}
                                        </span>
                                        {isProduct && (
                                            <div className={cn("flex items-center gap-1 text-xs", stock < item.stockThreshold ? 'text-red-500' : 'text-zinc-400')}>
                                                <Archive className="w-3 h-3" />
                                                <span>{stock}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                                        {isDisabled ? (
                                             <span className="text-[9px] uppercase tracking-widest font-bold text-red-500">
                                                {isOutOfStock ? "Out of Stock" : "Limit Reached"}
                                             </span>
                                        ): (
                                            <>
                                                <span className="text-[9px] uppercase tracking-widest font-bold">Add</span>
                                                <span className="text-sm leading-none mb-0.5">+</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                     {itemsToShow?.length === 0 && (
                        <div className="col-span-full text-center py-20 text-zinc-400 text-sm uppercase tracking-widest">
                            No items match your filter
                        </div>
                    )}
                </div>
            </ScrollArea>
        </Tabs>
      </div>

      {/* --- RIGHT: INVOICE (45%) --- */}
      <div className="relative z-20 w-[45%] flex flex-col bg-white border-l border-zinc-100 h-full">
        
        {/* Ticket Header */}
        <div className="pt-8 px-10 pb-4">
            <div className="flex justify-between items-center mb-4">
                <span className="text-xs uppercase tracking-[0.2em] text-zinc-400">Customer</span>
                 <Button
                    variant="link"
                    className="p-0 h-auto text-sm text-zinc-400 hover:text-black focus:text-black flex items-center"
                    onClick={() => setCustomerDialogOpen(true)}
                  >
                    {selectedCustomer && selectedVehicle ? (
                      <div className='text-right'>
                        <div className='font-semibold'>{selectedCustomer.name}</div>
                        <div className='text-zinc-400 font-normal'>{selectedVehicle.numberPlate}</div>
                      </div>
                    ) : "Add Customer / Vehicle"}
                    {!selectedCustomer && <UserPlus className="ml-2 h-4 w-4 shrink-0 opacity-50" />}
                  </Button>
            </div>
             <div className="w-full h-px bg-zinc-200" />
            <div className="flex justify-between items-baseline my-4">
                <span className="text-xs uppercase tracking-[0.2em] text-zinc-400">Job By</span>
                <Popover open={employeePopoverOpen} onOpenChange={setEmployeePopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="link"
                      role="combobox"
                      aria-expanded={employeePopoverOpen}
                      className="p-0 h-auto text-sm text-zinc-400 hover:text-black focus:text-black"
                    >
                      {selectedEmployee ? selectedEmployee.name : "Select Employee"}
                      <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[200px] p-0 rounded-none">
                    <Command>
                      <CommandInput placeholder="Search employee..." />
                      <CommandList>
                        <CommandEmpty>No employee found.</CommandEmpty>
                        <CommandGroup>
                          {employees?.map((employee) => (
                            <CommandItem
                              key={employee.id}
                              value={employee.name}
                              onSelect={() => {
                                setSelectedEmployee(employee);
                                setEmployeePopoverOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedEmployee?.id === employee.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {employee.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
            </div>
            <div className="w-full h-px bg-zinc-900" />
        </div>
        
        {/* Cart Table Header */}
        <div className="px-10 py-2 bg-zinc-50 border-b border-t border-zinc-200">
            <div className="grid grid-cols-12 gap-4 text-xs uppercase tracking-widest text-zinc-400 font-medium">
                <div className="col-span-5 flex items-center gap-2">
                    <span>Product Name</span>
                     <button onClick={addCustomJob} title="Add custom job" className="text-zinc-400 hover:text-black transition-colors">
                        <PlusCircle className="w-4 h-4"/>
                    </button>
                </div>
                <div className="col-span-2 text-center">QTY</div>
                <div className="col-span-2 text-right">Unit Price</div>
                <div className="col-span-1 text-right">Dis.</div>
                <div className="col-span-2 text-right">Total</div>
            </div>
        </div>

        {/* Cart Items */}
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
                                  onUpdate={updateCartItem}
                                  onRemove={removeFromCart}
                                  formatPrice={formatPrice}
                                  customNameInputRef={item.type === 'custom' && item.name === '' ? customNameInputRef : null}
                                />
                            ))}
                        </div>
                    )}
                 </div>
            </ScrollArea>
        </div>

        {/* Footer / Totals */}
        <div className="p-10 bg-white z-20 border-t border-zinc-100">
            {/* Global Discount */}
            <div className="flex justify-between items-center mb-6 text-sm">
                <span className="text-zinc-400 uppercase tracking-widest text-xs">Global Discount</span>
                <div className="flex items-center gap-2">
                    <input 
                        className="w-8 text-right bg-transparent border-b border-zinc-200 focus:border-black outline-none font-mono text-zinc-500 focus:text-black"
                        placeholder="0"
                        type='number'
                        value={globalDiscountPercent || ''}
                        onChange={(e) => setGlobalDiscountPercent(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                        onKeyDown={(e) => ["-", "e", "+"].includes(e.key) && e.preventDefault()}
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
                <div className="text-5xl font-light tracking-tighter leading-none">
                    {formatPrice(totals.total)}
                </div>
                {totals.globalDiscountAmount > 0 && (
                    <div className="flex justify-end text-xs text-red-400 font-mono mt-1">
                        - {formatPrice(totals.globalDiscountAmount)} Discount Applied
                    </div>
                )}
            </div>

            {/* Pay Button - Full Width Text Block */}
            <button 
                onClick={handleProcessPayment}
                disabled={cart.length === 0} 
                className={cn(
                    "w-full py-4 bg-black text-white text-sm uppercase tracking-[0.3em] hover:bg-zinc-800 transition-all rounded-none shadow-none",
                    "disabled:bg-zinc-100 disabled:text-zinc-300",
                    (cart.length > 0 && (!selectedCustomer || !selectedEmployee || !selectedVehicle)) && "bg-zinc-800 opacity-90"
                )}
            >
                Process Payment
            </button>
        </div>
         <AddCustomerVehicleDialog
            isOpen={isCustomerDialogOpen}
            onOpenChange={setCustomerDialogOpen}
            customers={customers || []}
            vehicles={vehicles || []}
            onSelect={handleSelectCustomerAndVehicle}
            onCreate={handleCreateCustomerAndVehicle}
          />
          <PaymentDialog
            isOpen={isPaymentDialogOpen}
            onOpenChange={setPaymentDialogOpen}
            totalAmount={totals.total}
            onConfirmPayment={handleConfirmPayment}
          />
      </div>
    </div>
  );
}

    
