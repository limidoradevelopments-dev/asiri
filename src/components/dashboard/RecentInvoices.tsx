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

type RecentInvoicesProps = {
  data: Invoice[];
};

const statusVariantMap: Record<Invoice["status"], "default" | "secondary" | "destructive"> = {
  Paid: "default",
  Pending: "secondary",
  Overdue: "destructive",
};

export default function RecentInvoices({ data }: RecentInvoicesProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-primary-text">Recent Invoices</CardTitle>
        <CardDescription className="text-secondary-text">
          A list of the most recent invoices from your business.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto" style={{
          backgroundImage: 'linear-gradient(to right, rgba(255,255,255, 0.8), rgba(255,255,255, 0))'
        }}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-secondary-text">Invoice</TableHead>
                <TableHead className="hidden sm:table-cell text-secondary-text">Customer</TableHead>
                <TableHead className="text-secondary-text">Status</TableHead>
                <TableHead className="hidden md:table-cell text-secondary-text">Date</TableHead>
                <TableHead className="text-right text-secondary-text">Amount</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium text-primary-text">{invoice.id}</TableCell>
                  <TableCell className="hidden sm:table-cell text-primary-text">{invoice.customer}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariantMap[invoice.status]} className="capitalize">
                      {invoice.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-primary-text">{format(invoice.date, "MMM d, yyyy")}</TableCell>
                  <TableCell className="text-right text-primary-text">
                    {invoice.amount.toLocaleString("en-US", {
                      style: "currency",
                      currency: "LKR",
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>View Details</DropdownMenuItem>
                        <DropdownMenuItem>Mark as Paid</DropdownMenuItem>
                        <DropdownMenuItem>Send Reminder</DropdownMenuItem>
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
