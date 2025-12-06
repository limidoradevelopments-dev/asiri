import type { LowStockItem } from "@/lib/data";
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
import { cn } from "@/lib/utils"; // Assuming you have the standard shadcn utility

type LowStockItemsProps = {
  data: WithId<LowStockItem>[];
};

export default function LowStockItems({ data }: LowStockItemsProps) {
  // Optional: Safety filter to ensure we ONLY show actually low stock items,
  // even if the API/Parent passes extra data by mistake.
  const filteredData = data.filter((item) => item.stock <= item.threshold);

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
      
      {/* min-h-0 is crucial for scroll areas inside flex containers */}
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
                {filteredData.map((item) => {
                  const isCritical = item.stock === 0;
                  
                  return (
                    <TableRow key={item.id} className="border-zinc-100">
                      <TableCell className="py-3 px-0 font-medium text-sm">
                        {item.name}
                      </TableCell>
                      <TableCell className="py-3 px-0 text-right text-sm">
                        <span
                          className={cn(
                            "font-bold",
                            // Logic: Red if low, Zinc if healthy (safeguard), Red-700 if 0
                            isCritical ? "text-red-700" : "text-red-600"
                          )}
                        >
                          {item.stock}
                        </span>
                        <span className="text-zinc-300"> / {item.threshold}</span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            // Absolute positioning ensures this centers perfectly in the available space
            <div className="absolute inset-0 flex items-center justify-center text-sm text-green-600">
              All stock levels are healthy.
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}