import type { LowStockItem } from "@/lib/data";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

type LowStockItemsProps = {
  data: LowStockItem[];
};

export default function LowStockItems({ data }: LowStockItemsProps) {
  return (
    <Card className="rounded-3xl bg-white/65 backdrop-blur-md border-white/40 shadow-sm flex flex-col h-full">
      <CardHeader>
        <CardTitle className="text-lg font-medium text-primary-text">Low Stock Items</CardTitle>
        <CardDescription className="text-sm text-secondary-text">
          Items that are running low and may need reordering soon.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-full">
          <div className="px-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((item) => (
                  <TableRow key={item.sku} className="border-white/40">
                    <TableCell className="p-2 sm:p-4">
                      <div className="font-medium text-primary-text">{item.name}</div>
                      <div className="text-sm text-secondary-text hidden sm:block">
                        {item.sku}
                      </div>
                    </TableCell>
                    <TableCell className="text-right p-2 sm:p-4">
                      <Badge
                        variant={
                          item.stock < item.threshold ? "destructive" : "secondary"
                        }
                        className="text-xs font-medium"
                      >
                        {item.stock}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </ScrollArea>
      </CardContent>
      <CardFooter className="p-6">
        <Button variant="outline" size="sm" className="w-full text-sm font-medium">
          View All Inventory
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
