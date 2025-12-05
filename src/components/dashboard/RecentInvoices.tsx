
import type { Invoice } from "@/lib/data";
import { format } from "date-fns";
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
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

type RecentInvoicesProps = {
  data: (Omit<Invoice, 'invoiceNumber' | 'customerId' | 'vehicleId' | 'employeeId' | 'items' | 'subtotal' | 'globalDiscountPercent' | 'globalDiscountAmount' | 'balanceDue' | 'paymentMethod'> & { customer: string, amount: number, status: 'Paid' | 'Pending' | 'Overdue'})[];
};

const statusStyles: Record<Invoice['paymentStatus'], string> = {
  Paid: "bg-green-100 text-green-800",
  Partial: "bg-yellow-100 text-yellow-800",
  Unpaid: "bg-red-100 text-red-800",
};


export default function RecentInvoices({ data }: RecentInvoicesProps) {
  return (
    <Card className="rounded-none border-0 shadow-none bg-background p-8">
      <CardHeader className="p-0 mb-8">
        <CardTitle className="text-sm uppercase tracking-widest font-medium text-zinc-400">Recent Invoices</CardTitle>
        <CardDescription className="text-xs text-zinc-400">
          A list of the most recent invoices from your business.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-100">
                <TableHead className="p-0 h-8 text-xs font-normal text-zinc-400 uppercase tracking-widest">Invoice</TableHead>
                <TableHead className="p-0 h-8 text-xs font-normal text-zinc-400 uppercase tracking-widest">Customer</TableHead>
                <TableHead className="p-0 h-8 text-xs font-normal text-zinc-400 uppercase tracking-widest">Status</TableHead>
                <TableHead className="p-0 h-8 text-xs font-normal text-zinc-400 uppercase tracking-widest">Date</TableHead>
                <TableHead className="p-0 h-8 text-right text-xs font-normal text-zinc-400 uppercase tracking-widest">Amount</TableHead>
                <TableHead className="p-0 h-8">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((invoice) => (
                <TableRow key={invoice.id} className="border-zinc-100">
                  <TableCell className="py-3 px-0 font-medium">{invoice.id}</TableCell>
                  <TableCell className="py-3 px-0">{invoice.customer}</TableCell>
                  <TableCell className="py-3 px-0">
                    <Badge 
                      className={cn("capitalize text-xs font-medium rounded-md", statusStyles[invoice.paymentStatus])}
                      variant="outline"
                    >
                      {invoice.paymentStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3 px-0">{format(new Date(invoice.date), "MMM d, yyyy")}</TableCell>
                  <TableCell className="text-right py-3 px-0 font-mono">
                    {invoice.amount.toLocaleString("en-US", {
                      style: "currency",
                      currency: "LKR",
                      currencyDisplay: "symbol"
                    }).replace('LKR', 'Rs.')}
                  </TableCell>
                  <TableCell className="text-right py-3 px-0">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-none border-zinc-200">
                        <DropdownMenuItem className="text-xs">View Details</DropdownMenuItem>
                        <DropdownMenuItem className="text-xs">Mark as Paid</DropdownMenuItem>
                        <DropdownMenuItem className="text-xs">Send Reminder</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
