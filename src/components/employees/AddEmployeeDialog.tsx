
'use client';

import { useState, useEffect } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import type { Employee } from '@/lib/data';
import { WithId } from '@/firebase';
import { Textarea } from '../ui/textarea';
import { Loader2 } from 'lucide-react';

const employeeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  address: z.string().min(1, 'Address is required'),
  mobile: z.string().min(1, 'Mobile number is required'),
  notes: z.string().optional(),
});

type AddEmployeeDialogProps = {
  children: React.ReactNode;
  onUpsertEmployee: (employee: Omit<Employee, 'id'>, id?: string) => Promise<boolean>;
  employeeToEdit?: WithId<Employee> | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

export function AddEmployeeDialog({ 
  children, 
  onUpsertEmployee, 
  employeeToEdit, 
  isOpen, 
  onOpenChange 
}: AddEmployeeDialogProps) {
  
  const isEditMode = !!employeeToEdit;
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<z.infer<typeof employeeSchema>>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      name: '', address: '', mobile: '', notes: '',
    },
  });

  useEffect(() => {
    if (isEditMode && employeeToEdit) {
      form.reset(employeeToEdit);
    } else {
      form.reset({
        name: '', address: '', mobile: '', notes: '',
      });
    }
  }, [employeeToEdit, isEditMode, form, isOpen]);


  const onSubmit = async (values: z.infer<typeof employeeSchema>) => {
    setIsSubmitting(true);
    try {
      const success = await onUpsertEmployee(values, employeeToEdit?.id);
      if (success) {
        onOpenChange(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const commonInputStyles = "rounded-none h-11 text-base";
  const commonButtonStyles = "rounded-none uppercase tracking-widest text-xs h-11";

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg rounded-none border-zinc-200">
        <DialogHeader>
          <DialogTitle className="font-light tracking-tight text-2xl">{isEditMode ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
          <DialogDescription className="text-zinc-500">
            {isEditMode ? "Update the employee's details." : 'Add a new employee to your records.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employee Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., John Doe" {...field} className={commonInputStyles} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 123 Main St, Colombo" {...field} className={commonInputStyles} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="mobile"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobile Number</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 0771234567" {...field} className={commonInputStyles}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="e.g., Specializes in transmission repairs." {...field} className="rounded-none text-base" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="mt-6 gap-2">
                <DialogClose asChild>
                  <Button type="button" variant="outline" className={commonButtonStyles}>Cancel</Button>
                </DialogClose>
                <Button type="submit" className={commonButtonStyles} disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isSubmitting ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Add Employee')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
      </DialogContent>
    </Dialog>
  );
}
