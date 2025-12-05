
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import type { Customer, Vehicle } from '@/lib/data';
import { WithId } from '@/firebase';

type CustomerWithVehicle = {
  customer: WithId<Customer>;
  vehicle: WithId<Vehicle>;
};

type DetailsDialogProps = {
  item: CustomerWithVehicle | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

const DetailItem = ({ label, value }: { label: string; value?: string | number | null }) => (
  <div>
    <p className="text-xs text-zinc-500 uppercase tracking-wider">{label}</p>
    <p className="text-base text-zinc-900">{value || 'N/A'}</p>
  </div>
);

export function CustomerVehicleDetailsDialog({ item, isOpen, onOpenChange }: DetailsDialogProps) {
  if (!item) return null;

  const { customer, vehicle } = item;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl rounded-none border-zinc-200">
        <DialogHeader>
          <DialogTitle className="font-light tracking-tight text-2xl">
            {customer.name}
          </DialogTitle>
          <DialogDescription className="text-zinc-500">
            Details for customer and their vehicle ({vehicle.numberPlate}).
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-6 max-h-[70vh] overflow-y-auto pr-4">
          <div>
            <h3 className="text-lg font-medium tracking-tight border-b pb-2 mb-4">Customer Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <DetailItem label="Full Name" value={customer.name} />
              <DetailItem label="Phone Number" value={customer.phone} />
              <DetailItem label="Address" value={customer.address} />
              <DetailItem label="NIC / License No." value={customer.nic} />
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium tracking-tight border-b pb-2 mb-4">Vehicle Details</h3>
            <div className="grid grid-cols-3 gap-4">
              <DetailItem label="Number Plate" value={vehicle.numberPlate} />
              <DetailItem label="Make" value={vehicle.make} />
              <DetailItem label="Model" value={vehicle.model} />
              <DetailItem label="Year" value={vehicle.year} />
              <DetailItem label="Mileage" value={vehicle.mileage?.toLocaleString()} />
              <DetailItem label="Fuel Type" value={vehicle.fuelType} />
              <DetailItem label="Transmission" value={vehicle.transmission} />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
