import { z } from 'zod';

export const employeeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  address: z.string().min(1, 'Address is required'),
  mobile: z.string().min(1, 'Mobile number is required'),
  notes: z.string().optional(),
});
