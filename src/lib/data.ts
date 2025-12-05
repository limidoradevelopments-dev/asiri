
import type { LucideIcon } from "lucide-react";
import { DollarSign, Archive, Users, FileText } from "lucide-react";
import { format } from "date-fns";

export type StatCardData = {
  title: string;
  value: string;
  icon: LucideIcon;
  change?: string;
  changeType?: "increase" | "decrease";
};

export const statsData: StatCardData[] = [
  {
    title: "Total Revenue",
    value: "Rs. 13,569,567.00",
    icon: DollarSign,
    change: "+20.1% from last month",
    changeType: "increase",
  },
  {
    title: "Today's Revenue",
    value: "Rs. 382,500.00",
    icon: DollarSign,
    change: "+12.5% from yesterday",
    changeType: "increase",
  },
  {
    title: "Low Stock Items",
    value: "5",
    icon: Archive,
    change: "2 items need immediate reorder",
  },
  {
    title: "Total Customers",
    value: "1,204",
    icon: Users,
    change: "+3 since last hour",
    changeType: "increase",
  },
];

export type RevenueData = {
  date: string;
  revenue: number;
};

const today = new Date();
export const revenueData: RevenueData[] = Array.from({ length: 7 }, (_, i) => {
  const date = new Date();
  date.setDate(today.getDate() - (6 - i));
  return {
    date: format(date, "MMM d"),
    revenue: (Math.floor(Math.random() * (2500 - 500 + 1)) + 500) * 300,
  };
});

export type LowStockItem = {
  name: string;
  sku: string;
  stock: number;
  threshold: number;
};

export const lowStockItemsData: LowStockItem[] = [
  { name: "Synthetic Oil 5L", sku: "OIL-SYN-5L", stock: 8, threshold: 10 },
  { name: "Brake Pads Set", sku: "BRK-PAD-01", stock: 4, threshold: 5 },
  { name: "Air Filter", sku: "AIR-FIL-12", stock: 12, threshold: 15 },
  { name: "Spark Plugs (4-pack)", sku: "SPK-PLG-04", stock: 9, threshold: 10 },
  { name: "Wiper Blades 22in", sku: "WPR-BLD-22", stock: 3, threshold: 5 },
];

export type Invoice = {
  id: string;
  customer: string;
  date: Date;
  amount: number;
  status: "Paid" | "Pending" | "Overdue";
};

export const recentInvoicesData: Invoice[] = [
  {
    id: "INV-2024005",
    customer: "John Doe",
    date: new Date(2024, 6, 25),
    amount: 105000.0,
    status: "Paid",
  },
  {
    id: "INV-2024004",
    customer: "Jane Smith",
    date: new Date(2024, 6, 24),
    amount: 37650.5,
    status: "Pending",
  },
  {
    id: "INV-2024003",
    customer: "Michael Johnson",
    date: new Date(2024, 6, 22),
    amount: 267225.75,
    status: "Paid",
  },
  {
    id: "INV-2024002",
    customer: "Emily Davis",
    date: new Date(2024, 5, 15),
    amount: 13500.0,
    status: "Overdue",
  },
  {
    id: "INV-2024001",
    customer: "Chris Brown",
    date: new Date(2024, 6, 20),
    amount: 186000.0,
    status: "Paid",
  },
];

// --- Inventory Data ---

export type Product = {
  id: string;
  name: string;
  sku: string;
  category: string;
  stock: number;
  stockThreshold: number;
  price: number;
};

export type Service = {
  id: string;
  name: string;
  description?: string;
  price: number;
};

export const productsData: Product[] = [
  { id: 'PROD-001', name: 'Synthetic Oil 5L', sku: 'OIL-SYN-5L', category: 'Engine Oils', stock: 8, stockThreshold: 10, price: 12500.00 },
  { id: 'PROD-002', name: 'Brake Pads Set (Front)', sku: 'BRK-PAD-F01', category: 'Brakes', stock: 4, stockThreshold: 5, price: 8500.00 },
  { id: 'PROD-003', name: 'Standard Air Filter', sku: 'AIR-FIL-S12', category: 'Filters', stock: 12, stockThreshold: 15, price: 2500.00 },
  { id: 'PROD-004', name: 'Spark Plugs (4-pack)', sku: 'SPK-PLG-04', category: 'Ignition', stock: 9, stockThreshold: 10, price: 4000.00 },
  { id: 'PROD-005', name: 'Wiper Blades 22"', sku: 'WPR-BLD-22', category: 'Accessories', stock: 3, stockThreshold: 5, price: 3200.00 },
  { id: 'PROD-006', name: 'Headlight Bulb H4', sku: 'BULB-H4-01', category: 'Lighting', stock: 25, stockThreshold: 20, price: 1500.00 },
];

export const servicesData: Service[] = [
  { id: 'SERV-001', name: 'Full Service Package', description: 'Comprehensive vehicle maintenance package', price: 25000.00 },
  { id: 'SERV-002', name: 'Oil Change', description: 'Includes oil and filter change', price: 5000.00 },
  { id: 'SERV-003', name: 'Brake Inspection & Cleaning', price: 7500.00 },
  { id: 'SERV-004', name: 'Wheel Alignment', description: 'Four-wheel alignment', price: 6000.00 },
  { id: 'SERV-005', name: 'AC System Check', price: 8000.00 },
];
