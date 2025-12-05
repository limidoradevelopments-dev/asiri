
import type { Employee } from "@/lib/data";
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

type EmployeesTableProps = {
  data: WithId<Employee>[];
  isLoading: boolean;
  onEdit: (employee: WithId<Employee>) => void;
  onDelete: (id: string) => void;
};

export default function EmployeesTable({ data, isLoading, onEdit, onDelete }: EmployeesTableProps) {
  
  const renderSkeleton = () => (
    Array.from({ length: 5 }).map((_, index) => (
      <TableRow key={index} className="border-zinc-100">
        <TableCell className="py-4 px-0"><Skeleton className="h-5 w-32" /></TableCell>
        <TableCell className="py-4 px-0 hidden sm:table-cell"><Skeleton className="h-5 w-48" /></TableCell>
        <TableCell className="py-4 px-0 hidden md:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
        <TableCell className="py-4 px-0 hidden lg:table-cell"><Skeleton className="h-5 w-40" /></TableCell>
        <TableCell className="py-4 px-0"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
      </TableRow>
    ))
  );

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-zinc-100">
            <TableHead className="p-0 h-8 text-xs font-normal text-zinc-400 uppercase tracking-widest">Name</TableHead>
            <TableHead className="p-0 h-8 text-xs font-normal text-zinc-400 uppercase tracking-widest hidden sm:table-cell">Address</TableHead>
            <TableHead className="p-0 h-8 text-xs font-normal text-zinc-400 uppercase tracking-widest hidden md:table-cell">Mobile</TableHead>
            <TableHead className="p-0 h-8 text-xs font-normal text-zinc-400 uppercase tracking-widest hidden lg:table-cell">Notes</TableHead>
            <TableHead className="p-0 h-8">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? renderSkeleton() : data.map((employee) => (
            <TableRow key={employee.id} className="border-zinc-100">
              <TableCell className="py-4 px-0 font-medium">{employee.name}</TableCell>
              <TableCell className="hidden sm:table-cell py-4 px-0">{employee.address}</TableCell>
              <TableCell className="hidden md:table-cell py-4 px-0">{employee.mobile}</TableCell>
              <TableCell className="hidden lg:table-cell py-4 px-0 truncate max-w-xs">{employee.notes}</TableCell>
              <TableCell className="text-right py-4 px-0">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Actions</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-none border-zinc-200">
                    <DropdownMenuItem onClick={() => onEdit(employee)} className="text-xs">Edit</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDelete(employee.id)} className="text-xs text-red-600 focus:text-red-600">Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
       {!isLoading && data.length === 0 && (
        <div className="text-center py-20 text-zinc-400 text-sm uppercase tracking-widest">
          No employees found
        </div>
      )}
    </div>
  );
}
