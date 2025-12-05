
import type { Product, Service } from "@/lib/data";
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

type InventoryTableProps = {
  data: (Product | Service)[];
  type: "product" | "service";
};

export default function InventoryTable({ data, type }: InventoryTableProps) {
  const formatPrice = (price: number) => {
    return price.toLocaleString("en-US", {
      style: "currency",
      currency: "LKR",
      currencyDisplay: "symbol",
    }).replace('LKR', 'Rs.');
  }

  const getPrice = (item: Product | Service) => {
    if (type === 'product') {
      return (item as Product).sellingPrice;
    }
    return (item as Service).price;
  };

  return (
    <div className="overflow-x-auto mt-4">
      <Table>
        <TableHeader>
          <TableRow className="border-white/40">
            <TableHead className="text-secondary-text">Name</TableHead>
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
          {data.map((item) => (
            <TableRow key={item.id} className="border-white/40">
              <TableCell className="font-medium text-primary-text">{item.name}</TableCell>
              <TableCell className="hidden sm:table-cell text-primary-text">
                {type === 'product' ? (item as Product).category : (item as Service).description}
              </TableCell>
              {type === "product" && (item as Product).stock !== undefined && (
                <TableCell className="text-right">
                  <Badge 
                    variant={(item as Product).stock < (item as Product).stockThreshold ? "destructive" : "secondary"}
                    className="text-xs font-medium"
                  >
                    {(item as Product).stock}
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
                    <DropdownMenuItem>Edit</DropdownMenuItem>
                    <DropdownMenuItem>View Details</DropdownMenuItem>
                    {type === "product" && <DropdownMenuItem>Adjust Stock</DropdownMenuItem>}
                    <DropdownMenuItem className="text-destructive-foreground">Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
