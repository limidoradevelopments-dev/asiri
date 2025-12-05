
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
import { Badge } from "@/components/ui/badge";
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
      <TableRow key={index}>
        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
        {type === "product" && <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-24" /></TableCell>}
        <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
        {type === "product" && <TableCell className="text-right"><Skeleton className="h-5 w-12 ml-auto" /></TableCell>}
        <TableCell className="text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
        <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
      </TableRow>
    ))
  );

  return (
    <div className="overflow-x-auto mt-4 rounded-3xl bg-white/65 backdrop-blur-md border-white/40 shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="border-white/40">
            <TableHead className="text-secondary-text">Name</TableHead>
            {type === 'product' && <TableHead className="hidden sm:table-cell text-secondary-text">SKU</TableHead>}
            <TableHead className="hidden sm:table-cell text-secondary-text">
              {type === 'product' ? 'Category' : 'Description'}
            </TableHead>
            {type === "product" && <TableHead className="text-right text-secondary-text">Stock</TableHead>}
            <TableHead className="text-right text-secondary-text">Price</TableHead>
            <TableHead>
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? renderSkeleton() : data.map((item) => (
            <TableRow key={item.id} className="border-white/40">
              <TableCell className="font-medium text-primary-text">{item.name}</TableCell>
              {type === 'product' && <TableCell className="hidden sm:table-cell text-primary-text">{(item as WithId<Product>).sku}</TableCell>}
              <TableCell className="hidden sm:table-cell text-primary-text">
                {type === 'product' ? (item as WithId<Product>).category : (item as WithId<Service>).description}
              </TableCell>
              {type === "product" && (item as WithId<Product>).stock !== undefined && (
                <TableCell className="text-right">
                  <Badge 
                    variant={(item as WithId<Product>).stock < (item as WithId<Product>).stockThreshold ? "destructive" : "secondary"}
                    className="text-xs font-medium"
                  >
                    {(item as WithId<Product>).stock}
                  </Badge>
                </TableCell>
              )}
              <TableCell className="text-right text-primary-text">{formatPrice(getPrice(item))}</TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Actions</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(item)}>Edit</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDelete(item.id, type)} className="text-destructive focus:text-destructive focus:bg-destructive/10">Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
       {!isLoading && data.length === 0 && (
        <div className="text-center py-10 text-gray-500">
          No {type}s found. Add one to get started.
        </div>
      )}
    </div>
  );
}
