
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import type { Employee } from '@/lib/data';
import { WithId } from '@/firebase';

type DetailsDialogProps = {
  employee: WithId<Employee> | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

const DetailItem = ({ label, value }: { label: string; value?: string | number | null }) => (
  <div>
    <p className="text-xs text-zinc-500 uppercase tracking-wider">{label}</p>
    <p className="text-base text-zinc-900">{value || 'N/A'}</p>
  </div>
);

export function EmployeeDetailsDialog({ employee, isOpen, onOpenChange }: DetailsDialogProps) {
  if (!employee) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl rounded-none border-zinc-200">
        <DialogHeader>
          <DialogTitle className="font-light tracking-tight text-2xl">
            {employee.name}
          </DialogTitle>
          <DialogDescription className="text-zinc-500">
            Full details for the selected employee.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-6 max-h-[70vh] overflow-y-auto pr-4">
          <div className="grid grid-cols-2 gap-4">
            <DetailItem label="Full Name" value={employee.name} />
            <DetailItem label="Mobile Number" value={employee.mobile} />
            <DetailItem label="Address" value={employee.address} />
            <DetailItem label="NIC" value={employee.nic} />
          </div>
          <div>
            <DetailItem label="Notes" value={employee.notes} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
