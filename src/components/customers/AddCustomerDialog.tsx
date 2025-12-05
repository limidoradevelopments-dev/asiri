
'use client';

import { useEffect } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import type { Customer } from '@/lib/data';
import { WithId } from '@/firebase';

const customerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().min(1, 'Phone is required'),
  address: z.string().optional(),
  nic: z.string().optional(),
});

type AddCustomerDialogProps = {
  children: React.ReactNode;
  onUpsertCustomer: (customer: Omit<Customer, 'id'>, id?: string) => void;
  customerToEdit?: WithId<Customer> | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

export function AddCustomerDialog({ 
  children, 
  onUpsertCustomer, 
  customerToEdit, 
  isOpen, 
  onOpenChange 
}: AddCustomerDialogProps) {
  const { toast } = useToast();
  
  const isEditMode = !!customerToEdit;
  
  const form = useForm<z.infer<typeof customerSchema>>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: '', phone: '', address: '', nic: '',
    },
  });

  useEffect(() => {
    if (isEditMode && customerToEdit) {
      form.reset(customerToEdit);
    } else {
      form.reset({
        name: '', phone: '', address: '', nic: '',
      });
    }
  }, [customerToEdit, isEditMode, form, isOpen]);


  const onSubmit = (values: z.infer<typeof customerSchema>) => {
    onUpsertCustomer(values, customerToEdit?.id);
    toast({ title: isEditMode ? 'Customer Updated' : 'Customer Added', description: `${values.name}'s record has been saved.` });
    onOpenChange(false);
  };

  const commonInputStyles = "rounded-none h-11 text-base";
  const commonButtonStyles = "rounded-none uppercase tracking-widest text-xs h-11";

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg rounded-none border-zinc-200">
        <DialogHeader>
          <DialogTitle className="font-light tracking-tight text-2xl">{isEditMode ? 'Edit Customer' : 'Add New Customer'}</DialogTitle>
          <DialogDescription className="text-zinc-500">
            {isEditMode ? "Update the customer's details." : 'Add a new customer to your records.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., John Doe" {...field} className={commonInputStyles} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 0771234567" {...field} className={commonInputStyles} />
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
                    <FormLabel>Address (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 123 Main St, Colombo" {...field} className={commonInputStyles}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="nic"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>NIC / License No. (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} className={commonInputStyles}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="mt-6 gap-2">
                <DialogClose asChild>
                  <Button type="button" variant="outline" className={commonButtonStyles}>Cancel</Button>
                </DialogClose>
                <Button type="submit" className={commonButtonStyles}>{isEditMode ? 'Save Changes' : 'Add Customer'}</Button>
              </DialogFooter>
            </form>
          </Form>
      </DialogContent>
    </Dialog>
  );
}
