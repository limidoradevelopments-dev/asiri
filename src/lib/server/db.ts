import { initializeFirebase } from "@/firebase/server-init";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  DocumentData,
  QuerySnapshot,
  increment,
  Timestamp,
} from "firebase/firestore";
import type { Customer, Vehicle, Invoice, Employee } from "@/lib/data";

/**
 * Minimal types to keep things flexible during migration.
 * Extend these as your domain grows.
 */
export type DBRecord = Record<string, any>;
type WithId<T> = T & { id: string };

function snapshotToArray(snapshot: QuerySnapshot<DocumentData>): DBRecord[] {
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Firestore-based implementation that exposes generic CRUD
 * operations keyed by collection name.
 *
 * When you migrate to another database, you can replace the
 * internals of these functions and keep the same API surface.
 */
export const db = {
  async getAll(collectionName: string): Promise<DBRecord[]> {
    const { firestore } = initializeFirebase();
    if (!firestore) throw new Error("Firestore not initialized");

    const colRef = collection(firestore, collectionName);
    const snap = await getDocs(colRef);
    return snapshotToArray(snap);
  },

  async getOne(collectionName: string, id: string): Promise<DBRecord | null> {
    const { firestore } = initializeFirebase();
    if (!firestore) throw new Error("Firestore not initialized");
    const docRef = doc(firestore, collectionName, id);
    const snap = await getDoc(docRef);
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  },

  async create(collectionName: string, payload: DBRecord) {
    const { firestore } = initializeFirebase();
    if (!firestore) throw new Error("Firestore not initialized");
    
    // Convert any JS Date objects to Firestore Timestamps before writing
    const sanitizedPayload = { ...payload };
    for (const key in sanitizedPayload) {
      if (sanitizedPayload[key] instanceof Date) {
        sanitizedPayload[key] = Timestamp.fromDate(sanitizedPayload[key]);
      }
    }

    const colRef = collection(firestore, collectionName);
    const ref = await addDoc(colRef, sanitizedPayload);
    return { id: ref.id, ...sanitizedPayload };
  },

  async update(collectionName: string, id: string, payload: DBRecord) {
    const { firestore } = initializeFirebase();
    if (!firestore) throw new Error("Firestore not initialized");

    // Convert any JS Date objects to Firestore Timestamps before writing
    const sanitizedPayload = { ...payload };
    for (const key in sanitizedPayload) {
      if (sanitizedPayload[key] instanceof Date) {
        sanitizedPayload[key] = Timestamp.fromDate(sanitizedPayload[key]);
      }
    }

    const docRef = doc(firestore, collectionName, id);
    await updateDoc(docRef, sanitizedPayload);
    return { id, ...sanitizedPayload };
  },

  async remove(collectionName: string, id: string) {
    const { firestore } = initializeFirebase();
    if (!firestore) throw new Error("Firestore not initialized");
    const docRef = doc(firestore, collectionName, id);
    await deleteDoc(docRef);
    return { id };
  },

  async increment(collectionName: string, id: string, field: string, value: number) {
    const { firestore } = initializeFirebase();
    if (!firestore) throw new Error("Firestore not initialized");
    const docRef = doc(firestore, collectionName, id);
    await updateDoc(docRef, {
      [field]: increment(value)
    });
    return { id, success: true };
  },

  async getAllCustomersWithVehicles() {
    const { firestore } = initializeFirebase();
    if (!firestore) throw new Error("Firestore not initialized");

    const [vehicles, customers] = await Promise.all([
      this.getAll('vehicles'),
      this.getAll('customers'),
    ]);

    const customerMap = new Map(customers.map(c => [c.id, c as WithId<Customer>]));

    const combinedData = vehicles
      .map(vehicle => {
        const customer = customerMap.get(vehicle.customerId);
        return customer ? { customer, vehicle: vehicle as WithId<Vehicle> } : null;
      })
      .filter((item): item is { customer: WithId<Customer>; vehicle: WithId<Vehicle>; } => item !== null)
      .sort((a, b) => a.customer.name.localeCompare(b.customer.name));
      
    return combinedData;
  },

  async enrichInvoices(invoices: WithId<Invoice>[]) {
    const { firestore } = initializeFirebase();
    if (!firestore) throw new Error("Firestore not initialized");

    const [customersSnapshot, vehiclesSnapshot, employeesSnapshot] = await Promise.all([
        getDocs(collection(firestore, 'customers')),
        getDocs(collection(firestore, 'vehicles')),
        getDocs(collection(firestore, 'employees'))
    ]);

    const customerMap = new Map(customersSnapshot.docs.map(doc => [doc.id, doc.data() as Customer]));
    const vehicleMap = new Map(vehiclesSnapshot.docs.map(doc => [doc.id, doc.data() as Vehicle]));
    const employeeMap = new Map(employeesSnapshot.docs.map(doc => [doc.id, doc.data() as Employee]));

    return invoices.map(invoice => ({
      ...invoice,
      customerDetails: { id: invoice.customerId, ...customerMap.get(invoice.customerId) },
      vehicleDetails: { id: invoice.vehicleId, ...vehicleMap.get(invoice.vehicleId) },
      employeeDetails: { id: invoice.employeeId, ...employeeMap.get(invoice.employeeId) },
      customerName: customerMap.get(invoice.customerId)?.name,
      vehicleNumberPlate: vehicleMap.get(invoice.vehicleId)?.numberPlate,
      employeeName: employeeMap.get(invoice.employeeId)?.name,
    }));
  }
};
