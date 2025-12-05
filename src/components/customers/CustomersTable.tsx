
import type { Customer, Vehicle } from "@/lib/data";
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
import { Skeleton } from "@/components/ui/skeleton";

type CustomerWithVehicles = WithId<Customer> & {
  vehicles: WithId<Vehicle>[];
};

type CustomersTableProps = {
  data: CustomerWithVehicles[];
  isLoading: boolean;
};

export default function CustomersTable({ data, isLoading }: CustomersTableProps) {
  
  const renderSkeleton = () => (
    Array.from({ length: 8 }).map((_, index) => (
      <TableRow key={index} className="border-zinc-100">
        <TableCell className="py-4 px-0"><Skeleton className="h-5 w-32" /></TableCell>
        <TableCell className="py-4 px-0"><Skeleton className="h-5 w-24" /></TableCell>
        <TableCell className="py-4 px-0"><Skeleton className="h-5 w-48" /></TableCell>
        <TableCell className="py-4 px-0"><div className="flex gap-2"><Skeleton className="h-5 w-20" /><Skeleton className="h-5 w-20" /></div></TableCell>
      </TableRow>
    ))
  );

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-zinc-100">
            <TableHead className="p-0 h-8 text-xs font-normal text-zinc-400 uppercase tracking-widest">Name</TableHead>
            <TableHead className="p-0 h-8 text-xs font-normal text-zinc-400 uppercase tracking-widest">Phone</TableHead>
            <TableHead className="p-0 h-8 text-xs font-normal text-zinc-400 uppercase tracking-widest">Address</TableHead>
            <TableHead className="p-0 h-8 text-xs font-normal text-zinc-400 uppercase tracking-widest">Vehicles</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? renderSkeleton() : data.map((customer) => (
            <TableRow key={customer.id} className="border-zinc-100">
              <TableCell className="py-4 px-0 font-medium">{customer.name}</TableCell>
              <TableCell className="py-4 px-0">{customer.phone}</TableCell>
              <TableCell className="py-4 px-0">{customer.address || '-'}</TableCell>
              <TableCell className="py-4 px-0">
                <div className="flex flex-wrap gap-2">
                    {customer.vehicles.length > 0 ? customer.vehicles.map(v => (
                        <Badge key={v.id} variant="secondary" className="font-mono bg-zinc-100 text-zinc-700 rounded-sm">
                            {v.numberPlate}
                        </Badge>
                    )) : (
                        <span className="text-zinc-400 text-xs">-</span>
                    )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
       {!isLoading && data.length === 0 && (
        <div className="text-center py-20 text-zinc-400 text-sm uppercase tracking-widest">
          No customers found
        </div>
      )}
    </div>
  );
}
