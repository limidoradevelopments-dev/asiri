
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

type LowStockItemsProps = {
  data: WithId<LowStockItem>[];
};

export default function LowStockItems({ data }: LowStockItemsProps) {
  return (
    <Card className="rounded-none border-0 shadow-none bg-transparent p-0 flex flex-col h-full">
      <CardHeader className="p-0 mb-8">
        <CardTitle className="text-sm uppercase tracking-widest font-medium text-zinc-400">Low Stock</CardTitle>
        <CardDescription className="text-xs text-zinc-400">
          Items at or below re-order level
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 p-0 min-h-0">
        <ScrollArea className="h-full">
          {data.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-100">
                  <TableHead className="p-0 h-8 text-xs font-normal text-zinc-400 uppercase tracking-widest">Item</TableHead>
                  <TableHead className="p-0 h-8 text-right text-xs font-normal text-zinc-400 uppercase tracking-widest">Stock</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((item) => (
                  <TableRow key={item.id} className="border-zinc-100">
                    <TableCell className="py-3 px-0 font-medium">{item.name}</TableCell>
                    <TableCell className="py-3 px-0 text-right">
                      <span className="text-red-600 font-bold">
                        {item.stock}
                      </span>
                       <span className="text-zinc-300"> / {item.threshold}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
             <div className="flex items-center justify-center h-full text-sm text-zinc-400">
                All stock levels are healthy.
              </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
