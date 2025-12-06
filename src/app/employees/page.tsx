
'use client';

import { useState, useMemo, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Search } from "lucide-react";
import type { Employee } from "@/lib/data";
import { AddEmployeeDialog } from "@/components/employees/AddEmployeeDialog";
import EmployeesTable from "@/components/employees/EmployeesTable";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from "@/hooks/use-toast";

type WithId<T> = T & { id: string };

export default function EmployeesPage() {
  const { toast } = useToast();
  
  const [employees, setEmployees] = useState<WithId<Employee>[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [isAddEmployeeDialogOpen, setAddEmployeeDialogOpen] = useState(false);
  const [employeeToEdit, setEmployeeToEdit] = useState<WithId<Employee> | null>(null);
  const [employeeToDelete, setEmployeeToDelete] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setEmployeesLoading(true);
      const res = await fetch('/api/employees');
      if (!res.ok) throw new Error('Failed to fetch employees');
      setEmployees(await res.json());
    } catch (err) {
      console.error(err);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch employee data.' });
    } finally {
      setEmployeesLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);


  const filteredEmployees = useMemo(() => {
    if (!employees) return [];
    if (!searchQuery) return employees;

    const lowercasedQuery = searchQuery.toLowerCase();
    return employees.filter(employee =>
      employee.name.toLowerCase().includes(lowercasedQuery) ||
      employee.mobile.toLowerCase().includes(lowercasedQuery)
    );
  }, [employees, searchQuery]);
  
  const handleUpsertEmployee = useCallback(async (employee: Omit<Employee, 'id'>, id?: string) => {
    try {
        const method = id ? "PUT" : "POST";
        const body = JSON.stringify(id ? { id, ...employee } : employee);

        const res = await fetch('/api/employees', {
            method,
            headers: { 'Content-Type': 'application/json' },
            body,
        });

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || 'Failed to save employee.');
        }

        toast({ title: id ? "Employee Updated" : "Employee Added", description: `${employee.name}'s record has been saved.` });
        await fetchData();
        onDialogClose(false);

    } catch (err: any) {
        console.error("Upsert error:", err);
        toast({ variant: 'destructive', title: 'Error', description: err.message || 'Failed to save employee.' });
    }
  }, [fetchData, toast]);

  const handleEdit = useCallback((employee: WithId<Employee>) => {
    setEmployeeToEdit(employee);
    setAddEmployeeDialogOpen(true);
  }, []);
  
  const handleDeleteRequest = useCallback((id: string) => {
    setEmployeeToDelete(id);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!employeeToDelete) return;
    
    // Optimistic UI update
    setEmployees(prev => prev.filter(p => p.id !== employeeToDelete));
    
    try {
        const res = await fetch(`/api/employees?id=${encodeURIComponent(employeeToDelete)}`, { method: "DELETE" });

        if (!res.ok) {
            throw new Error("Delete failed on the server.");
        }
        toast({ title: "Deleted", description: "Employee successfully deleted." });
    } catch (err) {
        console.error("Delete error:", err);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete employee.' });
        fetchData(); // Re-fetch to revert optimistic update
    } finally {
        setEmployeeToDelete(null);
    }
  }, [employeeToDelete, fetchData, toast]);

  const onDialogClose = useCallback((isOpen: boolean) => {
    if (!isOpen) {
      setEmployeeToEdit(null);
    }
    setAddEmployeeDialogOpen(isOpen);
  }, []);

  return (
    <div className="relative z-10 w-full max-w-7xl mx-auto px-12 pt-8 pb-12">
        
        {/* --- HEADER --- */}
        <div className="flex justify-between items-start mb-16 gap-8">
            <div>
                <h1 className="text-5xl font-light tracking-tighter mb-2">EMPLOYEES</h1>
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">Manage Employee Records</p>
            </div>

            <div className="flex items-end gap-8 w-auto">
                <div className="relative group w-80">
                    <Search className="absolute left-0 bottom-3 h-4 w-4 text-zinc-400 group-focus-within:text-black transition-colors" />
                    <input
                        type="search"
                        placeholder="SEARCH NAME OR MOBILE..."
                        className="w-full bg-transparent border-b border-zinc-200 py-2.5 pl-8 text-sm outline-none placeholder:text-zinc-300 placeholder:uppercase placeholder:tracking-widest uppercase tracking-wide focus:border-black transition-colors"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-4">
                     <AddEmployeeDialog 
                        onUpsertEmployee={handleUpsertEmployee} 
                        employeeToEdit={employeeToEdit}
                        isOpen={isAddEmployeeDialogOpen}
                        onOpenChange={onDialogClose}
                    >
                        <Button 
                            onClick={() => setAddEmployeeDialogOpen(true)}
                            className="h-10 px-6 rounded-none bg-black text-white text-xs uppercase tracking-[0.15em] hover:bg-zinc-800 transition-all shadow-none"
                        >
                            <Plus className="mr-2 h-3 w-3" />
                            New Employee
                        </Button>
                    </AddEmployeeDialog>
                </div>
            </div>
        </div>

        <div className="min-h-[400px]">
          <EmployeesTable 
            data={filteredEmployees}
            isLoading={employeesLoading}
            onEdit={handleEdit}
            onDelete={handleDeleteRequest}
          />
        </div>

      <AlertDialog open={!!employeeToDelete} onOpenChange={(open) => !open && setEmployeeToDelete(null)}>
        <AlertDialogContent className="rounded-none border-zinc-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-light tracking-tight text-xl">Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-500">
              This action cannot be undone. This will permanently remove the employee's record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 mt-4">
            <AlertDialogCancel 
                onClick={() => setEmployeeToDelete(null)}
                className="rounded-none border-zinc-200 uppercase tracking-widest text-xs"
            >
                Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
                onClick={confirmDelete} 
                className="bg-red-600 hover:bg-red-700 text-white rounded-none uppercase tracking-widest text-xs"
            >
                Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
