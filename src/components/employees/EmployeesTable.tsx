
'use client';

import { memo, useState, useEffect } from 'react';
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

const MemoizedRow = memo(function EmployeeTableRow({ employee, onEdit, onDelete }: {
    employee: WithId<Employee>;
    onEdit: (employee: WithId<Employee>) => void;
    onDelete: (id: string) => void;
}) {
    return (
        <TableRow className="border-zinc-100">
            <TableCell className="py-4 px-0 font-medium">{employee.name}</TableCell>
            <TableCell className="py-4 px-0">{employee.address}</TableCell>
            <TableCell className="py-4 px-0">{employee.mobile}</TableCell>
            <TableCell className="py-4 px-0 truncate max-w-xs">{employee.notes}</TableCell>
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
    );
});

export default function EmployeesTable({ data, isLoading, onEdit, onDelete }: EmployeesTableProps) {
  
  const [showEmptyState, setShowEmptyState] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (!isLoading) {
      timer = setTimeout(() => {
        setShowEmptyState(data.length === 0);
      }, 300);
    } else {
      setShowEmptyState(false);
    }

    return () => {
      clearTimeout(timer);
    };
  }, [isLoading, data.length]);


  const renderSkeleton = () => (
    Array.from({ length: 5 }).map((_, index) => (
      <TableRow key={index} className="border-zinc-100">
        <TableCell className="py-4 px-0"><Skeleton className="h-5 w-32" /></TableCell>
        <TableCell className="py-4 px-0"><Skeleton className="h-5 w-48" /></TableCell>
        <TableCell className="py-4 px-0"><Skeleton className="h-5 w-24" /></TableCell>
        <TableCell className="py-4 px-0"><Skeleton className="h-5 w-40" /></TableCell>
        <TableCell className="py-4 px-0"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
      </TableRow>
    ))
  );

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-zinc-100 hover:bg-transparent">
            <TableHead className="p-0 h-8 text-xs font-normal text-zinc-400 uppercase tracking-widest">Name</TableHead>
            <TableHead className="p-0 h-8 text-xs font-normal text-zinc-400 uppercase tracking-widest">Address</TableHead>
            <TableHead className="p-0 h-8 text-xs font-normal text-zinc-400 uppercase tracking-widest">Mobile</TableHead>
            <TableHead className="p-0 h-8 text-xs font-normal text-zinc-400 uppercase tracking-widest">Notes</TableHead>
            <TableHead className="p-0 h-8">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? renderSkeleton() : data.map((employee) => (
            <MemoizedRow 
                key={employee.id}
                employee={employee}
                onEdit={onEdit}
                onDelete={onDelete}
            />
          ))}
        </TableBody>
      </Table>
       {!isLoading && showEmptyState && (
        <div className="text-center py-20 text-zinc-400 text-sm uppercase tracking-widest">
          No employees found
        </div>
      )}
    </div>
  );
}
