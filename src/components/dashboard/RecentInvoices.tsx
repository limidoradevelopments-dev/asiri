
import type { Invoice } from "@/lib/data";
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
import { cn } from "@/lib/utils";
import { WithId } from "@/firebase";

type RecentInvoicesProps = {
  data: (WithId<Invoice> & { customerName: string })[];
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
          {data.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-100 hover:bg-transparent">
                  <TableHead className="p-0 h-8 text-xs font-normal text-zinc-400 uppercase tracking-widest">Invoice</TableHead>
                  <TableHead className="p-0 h-8 text-xs font-normal text-zinc-400 uppercase tracking-widest">Customer</TableHead>
                  <TableHead className="p-0 h-8 text-xs font-normal text-zinc-400 uppercase tracking-widest">Status</TableHead>
                  <TableHead className="p-0 h-8 text-xs font-normal text-zinc-400 uppercase tracking-widest">Date</TableHead>
                  <TableHead className="p-0 h-8 text-right text-xs font-normal text-zinc-400 uppercase tracking-widest">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((invoice) => (
                  <TableRow key={invoice.id} className="border-zinc-100">
                    <TableCell className="py-3 px-0 font-medium font-mono text-blue-600">{invoice.invoiceNumber}</TableCell>
                    <TableCell className="py-3 px-0">{invoice.customerName}</TableCell>
                    <TableCell className="py-3 px-0">
                      <Badge 
                        className={cn("capitalize text-xs font-medium rounded-md border-transparent", statusStyles[invoice.paymentStatus])}
                      >
                        {invoice.paymentStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3 px-0">{invoice.date ? new Date(invoice.date).toLocaleDateString('en-US', { timeZone: 'Asia/Colombo', year: 'numeric', month: 'short', day: 'numeric' }) : 'Invalid Date'}</TableCell>
                    <TableCell className="text-right py-3 px-0 font-mono">
                      {invoice.total.toLocaleString("en-US", {
                        style: "currency",
                        currency: "LKR",
                        currencyDisplay: "symbol"
                      }).replace('LKR', 'Rs.')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-10 text-zinc-400 text-sm uppercase tracking-widest">
              No invoices found.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
