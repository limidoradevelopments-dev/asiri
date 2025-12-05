
'use client';

import { useState, useMemo } from "react";
import { collection, doc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Plus, Search } from "lucide-react";
import type { Employee } from "@/lib/data";
import { AddEmployeeDialog } from "@/components/employees/AddEmployeeDialog";
import EmployeesTable from "@/components/employees/EmployeesTable";
import { useFirestore, useCollection, useMemoFirebase, WithId } from "@/firebase";
import { addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";
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

export default function EmployeesPage() {
  const firestore = useFirestore();

  const employeesCollection = useMemoFirebase(() => collection(firestore, 'employees'), [firestore]);

  const { data: employees, isLoading: employeesLoading } = useCollection<Employee>(employeesCollection);

  const [searchQuery, setSearchQuery] = useState("");
  const [isAddEmployeeDialogOpen, setAddEmployeeDialogOpen] = useState(false);
  const [employeeToEdit, setEmployeeToEdit] = useState<WithId<Employee> | null>(null);
  const [employeeToDelete, setEmployeeToDelete] = useState<string | null>(null);

  const filteredEmployees = useMemo(() => {
    if (!employees) return [];
    if (!searchQuery) return employees;

    return employees.filter(employee =>
      employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.mobile.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [employees, searchQuery]);
  
  const handleUpsertEmployee = (employee: Omit<Employee, 'id'>, id?: string) => {
    if (id) {
      const docRef = doc(firestore, 'employees', id);
      updateDocumentNonBlocking(docRef, { ...employee });
    } else {
      addDocumentNonBlocking(employeesCollection, employee);
    }
  };

  const handleEdit = (employee: WithId<Employee>) => {
    setEmployeeToEdit(employee);
    setAddEmployeeDialogOpen(true);
  };
  
  const handleDeleteRequest = (id: string) => {
    setEmployeeToDelete(id);
  };

  const confirmDelete = () => {
    if (employeeToDelete) {
      const docRef = doc(firestore, 'employees', employeeToDelete);
      deleteDocumentNonBlocking(docRef);
      setEmployeeToDelete(null);
    }
  };

  const onDialogClose = (isOpen: boolean) => {
    if (!isOpen) {
      setEmployeeToEdit(null);
    }
    setAddEmployeeDialogOpen(isOpen);
  }

  return (
    <div className="relative z-10 w-full max-w-7xl mx-auto px-12 pt-8 pb-12">
        
        {/* --- HEADER --- */}
        <div className="flex flex-col md:flex-row justify-between items-start mb-16 gap-8">
            <div>
                <h1 className="text-5xl font-light tracking-tighter mb-2">EMPLOYEES</h1>
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">Manage Employee Records</p>
            </div>

            <div className="flex items-end gap-8 w-full md:w-auto">
                <div className="relative group w-full md:w-80">
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

      <AlertDialog open={!!employeeToDelete} onOpenChange={() => setEmployeeToDelete(null)}>
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
