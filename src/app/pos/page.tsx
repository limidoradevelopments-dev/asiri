
'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import type { Product, Service, Employee, Customer, Vehicle, Invoice, PaymentMethod, VehicleCategory } from '@/lib/data';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { Search, UserPlus, Car, Bike, Truck, Sparkles, Loader2, ChevronsUpDown, Check, Archive } from 'lucide-react';
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
import { AddCustomerVehicleDialog } from '@/components/pos/AddCustomerVehicleDialog';
import { useToast } from '@/hooks/use-toast';
import { PaymentDialog } from '@/components/pos/PaymentDialog';
import { Input } from '@/components/ui/input';
import { CartItem as CartItemComponent } from '@/components/pos/CartItem';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { VanIcon } from '@/components/icons/VanIcon';
import { JeepIcon } from '@/components/icons/JeepIcon';
import { WithId } from '@/firebase';
import { CartTotals } from '@/components/pos/CartTotals';

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
  stock: number; // Added for type consistency
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
    "Bike": Bike,
    "Car": Car,
    "Van": VanIcon,
    "Jeep": JeepIcon,
    "Lorry": Truck,
};

export default function POSPage() {
  const { toast } = useToast();
  const customNameInputRef = useRef<HTMLInputElement>(null);

  // --- Data States (fetched from API) ---
  const [products, setProducts] = useState<WithId<Product>[]>([]);
  const [services, setServices] = useState<WithId<Service>[]>([]);
  const [employees, setEmployees] = useState<WithId<Employee>[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [employeesLoading, setEmployeesLoading] = useState(true);


  // --- UI/Logic States ---
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
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchInitialData = useCallback(async (signal: AbortSignal) => {
      try {
        setProductsLoading(true);
        setServicesLoading(true);
        setEmployeesLoading(true);
        
        const [productsRes, servicesRes, employeesRes] = await Promise.all([
          fetch('/api/products', { signal }),
          fetch('/api/services', { signal }),
          fetch('/api/employees', { signal }),
        ]);

        if (!productsRes.ok) throw new Error('Failed to fetch products');
        if (!servicesRes.ok) throw new Error('Failed to fetch services');
        if (!employeesRes.ok) throw new Error('Failed to fetch employees');
        
        setProducts(await productsRes.json());
        setServices(await servicesRes.json());
        setEmployees(await employeesRes.json());

      } catch (err: any) {
        if (err.name === 'AbortError') {
            console.log("Fetch aborted on component unmount.");
            return;
        }
        const message = err instanceof Error ? err.message : 'Could not fetch initial POS data.';
        toast({ variant: 'destructive', title: 'Error', description: message });
      } finally {
        setProductsLoading(false);
        setServicesLoading(false);
        setEmployeesLoading(false);
      }
    }, [toast]);
    
  useEffect(() => {
    const controller = new AbortController();
    fetchInitialData(controller.signal);
    
    return () => {
      controller.abort();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


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
      
      // Always check against the latest product state
      let stock = Infinity;
      if (type === 'product') {
        const liveProduct = products.find(p => p.id === item.id);
        stock = liveProduct ? liveProduct.stock : 0;
      }
      
      if (existing) {
        if (existing.quantity < stock) {
          return prev.map((i) => i.cartId === existing.cartId ? { ...i, quantity: i.quantity + 1 } : i);
        }
        toast({
          variant: 'destructive',
          title: 'Stock Limit Reached',
          description: `Cannot add more of ${item.name}.`,
        });
        return prev;
      }
      
      if (stock > 0) {
        const newItem: StandardCartItem = {
          ...(item as WithId<Product> | WithId<Service>),
          cartId: `${item.id}-${Date.now()}`,
          quantity: 1,
          type,
          discountAmount: 0
        };
        return [...prev, newItem];
      } else {
         toast({
          variant: 'destructive',
          title: 'Out of Stock',
          description: `${item.name} is currently out of stock.`,
        });
      }
      return prev;
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
      stock: Infinity, // Custom jobs don't have stock
    };
    setCart(prev => [...prev, newCustomItem]);
  };
  
  const updateCartItem = (cartId: string, updates: Partial<CartItem>) => {
    const item = cart.find(i => i.cartId === cartId);
    if (!item) return;

    let validatedUpdates = { ...updates };

    if ('quantity' in validatedUpdates && validatedUpdates.quantity !== undefined) {
      const newQuantity = validatedUpdates.quantity;
      if (item.type === 'product') {
        const liveProduct = products.find(p => p.id === item.id);
        const stock = liveProduct ? liveProduct.stock : 0;
        if (newQuantity > stock) {
          toast({
            variant: 'destructive',
            title: 'Stock Limit Exceeded',
            description: `Only ${stock} units of ${item.name} available.`,
          });
          validatedUpdates.quantity = stock;
        }
      }
      if (newQuantity < 1) {
        validatedUpdates.quantity = 1;
      }
    }

    if ('discountAmount' in validatedUpdates && validatedUpdates.discountAmount !== undefined) {
      const originalPrice = getItemPrice(item);
      if (validatedUpdates.discountAmount > originalPrice) {
        toast({
          variant: "destructive",
          title: "Invalid Discount",
          description: "Discount cannot be greater than the item's price.",
        });
        validatedUpdates.discountAmount = originalPrice;
      }
      if (validatedUpdates.discountAmount < 0) {
        validatedUpdates.discountAmount = 0;
      }
    }
    
    setCart(prev => prev.map(i => i.cartId === cartId ? {...i, ...validatedUpdates} : i));
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
    try {
      const customerRes = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customerData),
      });

      if (!customerRes.ok) {
        const errorData = await customerRes.json();
        throw new Error(errorData.error || 'Failed to create customer');
      }
      const newCustomer: WithId<Customer> = await customerRes.json();

      const vehicleRes = await fetch('/api/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...vehicleData, customerId: newCustomer.id }),
      });

      if (!vehicleRes.ok) {
        const errorData = await vehicleRes.json();
        if (vehicleRes.status === 409) {
          throw new Error(errorData.error || 'This vehicle number plate already exists.');
        }
        throw new Error(errorData.error || 'Failed to create vehicle');
      }
      const newVehicle: WithId<Vehicle> = await vehicleRes.json();
      
      handleSelectCustomerAndVehicle(newCustomer, newVehicle);
      toast({ title: "Success", description: "New customer and vehicle have been created and selected." });

    } catch (err: any) {
        const message = err instanceof Error ? err.message : "An unknown error occurred.";
        toast({ variant: 'destructive', title: 'Error', description: message });
        throw err;
    }
  };

  // --- Core Financial Calculations ---
  const totals = useMemo(() => {
    const subtotal = cart.reduce((acc, item) => {
      const price = getItemPrice(item);
      return safeRound(acc + price * item.quantity);
    }, 0);
    
    const totalItemDiscount = cart.reduce((acc, item) => {
      return safeRound(acc + item.discountAmount * item.quantity);
    }, 0);

    const subtotalAfterItemDiscount = safeRound(subtotal - totalItemDiscount);
    
    const globalDiscountValue = Math.max(0, globalDiscountPercent || 0);
    const globalDiscountAmount = safeRound(subtotalAfterItemDiscount * (globalDiscountValue / 100));

    const total = Math.max(0, safeRound(subtotalAfterItemDiscount - globalDiscountAmount));
    const totalDiscount = safeRound(totalItemDiscount + globalDiscountAmount);

    return {
      subtotal,
      totalItemDiscount,
      subtotalAfterItemDiscount,
      globalDiscountAmount,
      total,
      totalDiscount,
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
    if (totals.total <= 0) {
      toast({
        variant: 'destructive',
        title: 'Invalid Transaction',
        description: 'Cannot process a transaction with a total of zero.',
      });
      return;
    }
    
    if (!selectedCustomer || !selectedVehicle || !selectedEmployee || cart.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please select a customer, vehicle, employee, and add items to the cart.',
      });
      return;
    }

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

    setPaymentDialogOpen(true);
  };
  
  const handleConfirmPayment = useCallback(async (paymentDetails: Omit<Parameters<typeof onConfirmPayment>[0], "changeDue"> & { changeGiven: number }) => {
    if (!selectedCustomer || !selectedVehicle || !selectedEmployee) return;

    setIsProcessing(true);

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
    
    try {
        const res = await fetch('/api/invoices', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(invoice),
        });

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || 'Failed to create invoice');
        }
        
        toast({
          title: 'Invoice Created',
          description: `Invoice for ${selectedCustomer.name} successfully processed for LKR ${formatPrice(totals.total)}.`,
        });

        // Optimistically update product stock on client
        setProducts(prevProducts => {
            const newProducts = [...prevProducts];
            cart.forEach(cartItem => {
                if (cartItem.type === 'product') {
                    const index = newProducts.findIndex(p => p.id === cartItem.id);
                    if (index !== -1) {
                        newProducts[index] = {
                            ...newProducts[index],
                            stock: newProducts[index].stock - cartItem.quantity,
                        };
                    }
                }
            });
            return newProducts;
        });

        resetState();
    } catch(err: any) {
        const message = err instanceof Error ? err.message : 'Failed to save invoice.';
        toast({ variant: 'destructive', title: 'Error', description: message });
    } finally {
        setIsProcessing(false);
    }
  }, [selectedCustomer, selectedVehicle, selectedEmployee, cart, totals, globalDiscountPercent, resetState, toast]);
  
  const filterButtons: { label: string; value: VehicleCategory | 'all'; icon: React.ElementType }[] = [
    { label: 'All', value: 'all', icon: Sparkles },
    { label: 'Bike', value: 'Bike', icon: Bike },
    { label: 'Car', value: 'Car', icon: Car },
    { label: 'Van', value: 'Van', icon: VanIcon },
    { label: 'Jeep', value: 'Jeep', icon: JeepIcon },
    { label: 'Lorry', value: 'Lorry', icon: Truck },
  ];

  const isLoading = productsLoading || servicesLoading || employeesLoading;

  const renderSkeletons = () => (
    Array.from({ length: 9 }).map((_, i) => (
      <Skeleton key={i} className="h-[180px] w-full" />
    ))
  );

  return (
    <div className="flex h-screen w-full bg-background font-sans overflow-hidden">
      
      {/* LEFT: CATALOG (55%) */}
      <div className="relative z-10 w-[55%] flex flex-col pt-8 pl-12 pr-6">
        
        <div className="flex justify-between items-start mb-6">
            <div>
                <h1 className="text-5xl font-normal tracking-tighter mb-2">POINT OF SALE</h1>
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">Create new invoices</p>
            </div>
            
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

        <Tabs defaultValue="services" value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col min-h-0 mt-8">
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
            
            <ScrollArea className="flex-1 -mr-4 pr-4 mt-8">
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 pb-20">
                    {isLoading ? renderSkeletons() : itemsToShow?.map((item) => {
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
                                
                                <div className="flex-1 flex flex-col justify-center py-2">
                                    <h3 className="text-xl font-medium leading-tight tracking-tight line-clamp-2 text-zinc-800 group-hover:text-black">
                                        {item.name}
                                    </h3>
                                    {isService && (item as WithId<Service>).description && (
                                        <p className="text-xs text-zinc-400 mt-1 line-clamp-1">{ (item as WithId<Service>).description }</p>
                                    )}
                                </div>

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
                     {!isLoading && itemsToShow?.length === 0 && (
                        <div className="col-span-full text-center py-20 text-zinc-400 text-sm uppercase tracking-widest">
                            No items match your filter
                        </div>
                    )}
                </div>
            </ScrollArea>
        </Tabs>
      </div>

      {/* RIGHT: INVOICE (45%) */}
      <div className="relative z-20 w-[45%] flex flex-col bg-white border-l border-zinc-100 h-full">
        
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
        
        <CartTotals 
          cart={cart}
          customNameInputRef={customNameInputRef}
          onUpdateCartItem={updateCartItem}
          onRemoveFromCart={removeFromCart}
          onAddCustomJob={addCustomJob}
          formatPrice={formatPrice}
          globalDiscountPercent={globalDiscountPercent}
          setGlobalDiscountPercent={setGlobalDiscountPercent}
          totals={totals}
          onProcessPayment={handleProcessPayment}
          isProcessButtonDisabled={cart.length === 0 || !selectedCustomer || !selectedEmployee}
        />
        
         <AddCustomerVehicleDialog
            isOpen={isCustomerDialogOpen}
            onOpenChange={setCustomerDialogOpen}
            onSelect={handleSelectCustomerAndVehicle}
            onCreate={handleCreateCustomerAndVehicle}
          />
          <PaymentDialog
            isOpen={isPaymentDialogOpen}
            onOpenChange={setPaymentDialogOpen}
            totalAmount={totals.total}
            onConfirmPayment={handleConfirmPayment}
            isProcessing={isProcessing}
          />
      </div>
    </div>
  );
}

    