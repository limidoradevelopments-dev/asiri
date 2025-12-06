
import type { Product } from "@/lib/data";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { WithId } from "@/firebase";
import { cn } from "@/lib/utils";
import { memo } from "react";

type LowStockItemsProps = {
  data: WithId<Product>[];
};

const LowStockItemRow = memo(function LowStockItemRow({ item }: { item: WithId<Product> }) {
  const isCritical = item.stock === 0;
  return (
    <TableRow className="border-zinc-100 hover:bg-transparent">
      <TableCell className="py-3 px-0 font-medium text-sm">
        {item.name}
      </TableCell>
      <TableCell className="py-3 px-0 text-right text-sm">
        <span
          className={cn(
            "font-bold",
            isCritical ? "text-red-700" : "text-red-600"
          )}
        >
          {item.stock}
        </span>
        <span className="text-zinc-300"> / {item.stockThreshold}</span>
      </TableCell>
    </TableRow>
  );
});

export default function LowStockItems({ data }: LowStockItemsProps) {
  const filteredData = data.filter((item) => item.stock <= item.stockThreshold);

  return (
    <Card className="rounded-none border-0 shadow-none bg-transparent p-0 flex flex-col h-full">
      <CardHeader className="p-0 mb-8 shrink-0">
        <CardTitle className="text-sm uppercase tracking-widest font-medium text-zinc-400">
          Low Stock
        </CardTitle>
        <CardDescription className="text-xs text-zinc-400">
          Items at or below re-order level
        </CardDescription>
      </CardHeader>
      
      <CardContent className="flex-1 p-0 min-h-0 relative">
        <ScrollArea className="h-full w-full">
          {filteredData.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-100 hover:bg-transparent">
                  <TableHead className="p-0 h-8 text-xs font-normal text-zinc-400 uppercase tracking-widest">
                    Item
                  </TableHead>
                  <TableHead className="p-0 h-8 text-right text-xs font-normal text-zinc-400 uppercase tracking-widest">
                    Stock
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((item) => (
                  <LowStockItemRow key={item.id} item={item} />
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-sm text-green-500">All stock levels are healthy.</p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
