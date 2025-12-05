
import type { Product, Service } from "@/lib/data";
import { WithId } from "@/firebase";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

type InventoryTableProps = {
  data: WithId<Product>[] | WithId<Service>[];
  type: "product" | "service";
  isLoading: boolean;
  onEdit: (item: WithId<Product> | WithId<Service>) => void;
  onDelete: (id: string, type: "product" | "service") => void;
};

export default function InventoryTable({ data, type, isLoading, onEdit, onDelete }: InventoryTableProps) {
  const formatPrice = (price: number) => {
    return price.toLocaleString("en-US", {
      style: "currency",
      currency: "LKR",
      currencyDisplay: "symbol",
    }).replace('LKR', 'Rs.');
  }

  const getPrice = (item: WithId<Product> | WithId<Service>) => {
    if (type === 'product') {
      return (item as WithId<Product>).sellingPrice;
    }
    return (item as WithId<Service>).price;
  };
  
  const renderSkeleton = () => (
    Array.from({ length: 5 }).map((_, index) => (
      <TableRow key={index} className="border-zinc-100">
        <TableCell className="py-4 px-0"><Skeleton className="h-5 w-32" /></TableCell>
        <TableCell className="py-4 px-0 hidden sm:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
        <TableCell className="py-4 px-0 hidden sm:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
        {type === "product" && <TableCell className="py-4 px-0 text-right"><Skeleton className="h-5 w-12 ml-auto" /></TableCell>}
        <TableCell className="py-4 px-0 text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
        <TableCell className="py-4 px-0"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
      </TableRow>
    ))
  );

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-zinc-100">
            <TableHead className="p-0 h-8 text-xs font-normal text-zinc-400 uppercase tracking-widest">Name</TableHead>
            {type === 'product' && <TableHead className="p-0 h-8 text-xs font-normal text-zinc-400 uppercase tracking-widest hidden sm:table-cell">SKU</TableHead>}
            <TableHead className="p-0 h-8 text-xs font-normal text-zinc-400 uppercase tracking-widest hidden sm:table-cell">
              {type === 'product' ? 'Category' : 'Vehicle Category'}
            </TableHead>
            {type === "product" && <TableHead className="p-0 h-8 text-right text-xs font-normal text-zinc-400 uppercase tracking-widest">Stock</TableHead>}
            <TableHead className="p-0 h-8 text-right text-xs font-normal text-zinc-400 uppercase tracking-widest">Price</TableHead>
            <TableHead className="p-0 h-8">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? renderSkeleton() : data.map((item) => (
            <TableRow key={item.id} className="border-zinc-100">
              <TableCell className="py-4 px-0 font-medium">{item.name}</TableCell>
              {type === 'product' && <TableCell className="hidden sm:table-cell py-4 px-0">{ (item as WithId<Product>).sku}</TableCell>}
              <TableCell className="hidden sm:table-cell py-4 px-0">
                {type === 'product' ? (item as WithId<Product>).category : (item as WithId<Service>).vehicleCategory}
              </TableCell>
              {type === "product" && (item as WithId<Product>).stock !== undefined && (
                <TableCell className="text-right py-4 px-0">
                  <span
                    className={
                      (item as WithId<Product>).stock < (item as WithId<Product>).stockThreshold
                        ? "text-red-600 font-medium"
                        : "text-zinc-600"
                    }
                  >
                    {(item as WithId<Product>).stock}
                  </span>
                </TableCell>
              )}
              <TableCell className="text-right py-4 px-0 font-mono">{formatPrice(getPrice(item))}</TableCell>
              <TableCell className="text-right py-4 px-0">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Actions</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-none border-zinc-200">
                    <DropdownMenuItem onClick={() => onEdit(item)} className="text-xs">Edit</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDelete(item.id, type)} className="text-xs text-red-600 focus:text-red-600">Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
       {!isLoading && data.length === 0 && (
        <div className="text-center py-20 text-zinc-400 text-sm uppercase tracking-widest">
          No {type}s found
        </div>
      )}
    </div>
  );
}
