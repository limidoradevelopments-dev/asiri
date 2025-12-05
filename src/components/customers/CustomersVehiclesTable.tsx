
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

type CustomerWithVehicle = {
  customer: WithId<Customer>;
  vehicle: WithId<Vehicle>;
};

type CustomersVehiclesTableProps = {
  data: CustomerWithVehicle[];
  isLoading: boolean;
  onEdit: (item: CustomerWithVehicle) => void;
  onDelete: (item: CustomerWithVehicle) => void;
  onViewDetails: (item: CustomerWithVehicle) => void;
};

export default function CustomersVehiclesTable({ data, isLoading, onEdit, onDelete, onViewDetails }: CustomersVehiclesTableProps) {
  
  const renderSkeleton = () => (
    Array.from({ length: 8 }).map((_, index) => (
      <TableRow key={index} className="border-zinc-100">
        <TableCell className="py-4 px-0"><Skeleton className="h-5 w-32" /></TableCell>
        <TableCell className="py-4 px-0"><Skeleton className="h-5 w-24" /></TableCell>
        <TableCell className="py-4 px-0"><Skeleton className="h-5 w-48" /></TableCell>
        <TableCell className="py-4 px-0"><Skeleton className="h-5 w-40" /></TableCell>
        <TableCell className="py-4 px-0"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
      </TableRow>
    ))
  );

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-zinc-100">
            <TableHead className="p-0 h-8 text-xs font-normal text-zinc-400 uppercase tracking-widest">Owner</TableHead>
            <TableHead className="p-0 h-8 text-xs font-normal text-zinc-400 uppercase tracking-widest">Phone</TableHead>
            <TableHead className="p-0 h-8 text-xs font-normal text-zinc-400 uppercase tracking-widest">Vehicle</TableHead>
            <TableHead className="p-0 h-8 text-xs font-normal text-zinc-400 uppercase tracking-widest">Number Plate</TableHead>
            <TableHead className="p-0 h-8">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? renderSkeleton() : data.map((item) => (
            <TableRow 
              key={item.vehicle.id} 
              className="border-zinc-100 cursor-pointer hover:bg-zinc-50/50"
              onClick={() => onViewDetails(item)}
            >
              <TableCell className="py-4 px-0 font-medium">{item.customer.name}</TableCell>
              <TableCell className="py-4 px-0">{item.customer.phone}</TableCell>
              <TableCell className="py-4 px-0">{`${item.vehicle.make} ${item.vehicle.model} (${item.vehicle.year})`}</TableCell>
              <TableCell className="py-4 px-0">{item.vehicle.numberPlate}</TableCell>
              <TableCell className="text-right py-4 px-0" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Actions</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-none border-zinc-200">
                    <DropdownMenuItem onClick={() => onEdit(item)} className="text-xs">Edit</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDelete(item)} className="text-xs text-red-600 focus:text-red-600">Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
       {!isLoading && data.length === 0 && (
        <div className="text-center py-20 text-zinc-400 text-sm uppercase tracking-widest">
          No customer or vehicle entries found
        </div>
      )}
    </div>
  );
}
