import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  getDoc,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Client, InventoryItem, WorkOrder, Budget, Workshop, OrderStatus, Mechanic } from '../types/tallerya';
import { INITIAL_CLIENTS, INITIAL_INVENTORY, INITIAL_WORK_ORDERS, INITIAL_BUDGETS, INITIAL_MECHANICS } from '../data/mockData';

// Workshop profile
export async function getWorkshopProfile(tallerId: string): Promise<Workshop | null> {
  try {
    const docRef = doc(db, 'workshops', tallerId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as Workshop;
    }
    return null;
  } catch (error) {
    console.error('Error fetching workshop profile:', error);
    return null;
  }
}

export async function createWorkshopProfile(workshop: Workshop): Promise<void> {
  const trialEnds = new Date();
  trialEnds.setDate(trialEnds.getDate() + 14);

  const workshopData: Workshop = {
    ...workshop,
    subscription: workshop.subscription || {
      plan: 'trial',
      status: 'trial',
      trialEndsAt: trialEnds.toISOString(),
      maxWorkOrders: 50,
    },
  };

  const docRef = doc(db, 'workshops', workshop.id);
  await setDoc(docRef, workshopData, { merge: true });
}

export async function updateWorkshopSubscription(
  tallerId: string,
  plan: 'trial' | 'basico' | 'pro' | 'enterprise',
  status: 'active' | 'trial' | 'expired' | 'pending'
): Promise<void> {
  const docRef = doc(db, 'workshops', tallerId);
  const now = new Date();
  const subEnds = new Date();
  subEnds.setDate(subEnds.getDate() + 30);

  await setDoc(
    docRef,
    {
      subscription: {
        plan,
        status,
        trialEndsAt: now.toISOString(),
        subscriptionEndsAt: subEnds.toISOString(),
        maxWorkOrders: plan === 'pro' ? 999999 : 50,
      },
    },
    { merge: true }
  );
}

// Subscribe to real-time workshop collections
export function subscribeToWorkshopCollections(
  tallerId: string,
  onData: (data: {
    clients: Client[];
    inventory: InventoryItem[];
    workOrders: WorkOrder[];
    budgets: Budget[];
    mechanics: Mechanic[];
    workshop: Workshop | null;
  }) => void
) {
  let clients: Client[] = [];
  let inventory: InventoryItem[] = [];
  let workOrders: WorkOrder[] = [];
  let budgets: Budget[] = [];
  let mechanics: Mechanic[] = [];
  let workshop: Workshop | null = null;

  const emit = () => onData({ clients, inventory, workOrders, budgets, mechanics, workshop });

  // Workshop doc listener
  const unsubWorkshop = onSnapshot(doc(db, 'workshops', tallerId), (docSnap) => {
    if (docSnap.exists()) {
      workshop = docSnap.data() as Workshop;
    } else {
      workshop = null;
    }
    emit();
  });

  // Clients query
  const qClients = query(collection(db, 'clients'), where('tallerId', '==', tallerId));
  const unsubClients = onSnapshot(qClients, (snapshot) => {
    clients = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Client));
    emit();
  });

  // Inventory query
  const qInventory = query(collection(db, 'inventory'), where('tallerId', '==', tallerId));
  const unsubInventory = onSnapshot(qInventory, (snapshot) => {
    inventory = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as InventoryItem));
    emit();
  });

  // WorkOrders query
  const qOrders = query(collection(db, 'workOrders'), where('tallerId', '==', tallerId));
  const unsubOrders = onSnapshot(qOrders, (snapshot) => {
    workOrders = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as WorkOrder));
    emit();
  });

  // Budgets query
  const qBudgets = query(collection(db, 'budgets'), where('tallerId', '==', tallerId));
  const unsubBudgets = onSnapshot(qBudgets, (snapshot) => {
    budgets = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Budget));
    emit();
  });

  // Mechanics query
  const qMechanics = query(collection(db, 'mechanics'), where('tallerId', '==', tallerId));
  const unsubMechanics = onSnapshot(qMechanics, (snapshot) => {
    mechanics = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Mechanic));
    emit();
  });

  return () => {
    unsubWorkshop();
    unsubClients();
    unsubInventory();
    unsubOrders();
    unsubBudgets();
    unsubMechanics();
  };
}

// CRUD Operations
export async function saveClient(client: Client, tallerId: string) {
  const clientData = { ...client, tallerId };
  const docRef = doc(db, 'clients', client.id);
  await setDoc(docRef, clientData, { merge: true });
}

export async function saveInventoryItem(item: InventoryItem, tallerId: string) {
  const itemData = { ...item, tallerId };
  const docRef = doc(db, 'inventory', item.id);
  await setDoc(docRef, itemData, { merge: true });
}

export async function updateStock(itemId: string, newStock: number) {
  const docRef = doc(db, 'inventory', itemId);
  await updateDoc(docRef, { stockActual: newStock });
}

export async function saveWorkOrder(order: WorkOrder, tallerId: string) {
  const orderData = { ...order, tallerId };
  const docRef = doc(db, 'workOrders', order.id);
  await setDoc(docRef, orderData, { merge: true });
}

export async function updateWorkOrderStatus(orderId: string, estado: OrderStatus) {
  const docRef = doc(db, 'workOrders', orderId);
  await updateDoc(docRef, { estado });
}

export async function saveBudget(budget: Budget, tallerId: string) {
  const budgetData = { ...budget, tallerId };
  const docRef = doc(db, 'budgets', budget.id);
  await setDoc(docRef, budgetData, { merge: true });
}

export async function saveMechanic(mechanic: Mechanic, tallerId: string) {
  const mechanicData = { ...mechanic, tallerId };
  const docRef = doc(db, 'mechanics', mechanic.id);
  await setDoc(docRef, mechanicData, { merge: true });
}

export async function deleteMechanic(mechanicId: string) {
  const docRef = doc(db, 'mechanics', mechanicId);
  await deleteDoc(docRef);
}

// Seed initial demo data for a newly registered workshop
export async function seedDemoDataForWorkshop(tallerId: string) {
  const batch = writeBatch(db);

  INITIAL_CLIENTS.forEach((c) => {
    const ref = doc(db, 'clients', `c_${tallerId}_${c.id}`);
    batch.set(ref, { ...c, id: `c_${tallerId}_${c.id}`, tallerId });
  });

  INITIAL_INVENTORY.forEach((i) => {
    const ref = doc(db, 'inventory', `inv_${tallerId}_${i.id}`);
    batch.set(ref, { ...i, id: `inv_${tallerId}_${i.id}`, tallerId });
  });

  INITIAL_WORK_ORDERS.forEach((o) => {
    const ref = doc(db, 'workOrders', `wo_${tallerId}_${o.id}`);
    batch.set(ref, {
      ...o,
      id: `wo_${tallerId}_${o.id}`,
      clienteId: `c_${tallerId}_${o.clienteId}`,
      tallerId
    });
  });

  INITIAL_BUDGETS.forEach((b) => {
    const ref = doc(db, 'budgets', `b_${tallerId}_${b.id}`);
    batch.set(ref, { ...b, id: `b_${tallerId}_${b.id}`, tallerId });
  });

  INITIAL_MECHANICS.forEach((m) => {
    const ref = doc(db, 'mechanics', `m_${tallerId}_${m.id}`);
    batch.set(ref, { ...m, id: `m_${tallerId}_${m.id}`, tallerId });
  });

  await batch.commit();
}

// Public Online Lookup: Search Work Orders by vehicle license plate (patente)
export async function searchWorkOrdersByPatente(searchPatente: string): Promise<{
  orders: WorkOrder[];
  workshopsMap: Record<string, Workshop>;
}> {
  const cleanSearch = searchPatente.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (!cleanSearch) return { orders: [], workshopsMap: {} };

  try {
    const ordersRef = collection(db, 'workOrders');
    const snapshot = await getDocs(ordersRef);

    const matchedOrders: WorkOrder[] = [];
    const workshopIdsToFetch = new Set<string>();

    snapshot.docs.forEach((docSnap) => {
      const data = docSnap.data() as WorkOrder;
      const orderPatenteClean = (data.vehiculo?.patente || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

      if (orderPatenteClean.includes(cleanSearch) || cleanSearch.includes(orderPatenteClean)) {
        matchedOrders.push({ id: docSnap.id, ...data });
        if (data.tallerId) {
          workshopIdsToFetch.add(data.tallerId);
        }
      }
    });

    // Fetch workshop profiles for matched orders
    const workshopsMap: Record<string, Workshop> = {};
    for (const tallerId of workshopIdsToFetch) {
      try {
        const wDoc = await getDoc(doc(db, 'workshops', tallerId));
        if (wDoc.exists()) {
          workshopsMap[tallerId] = wDoc.data() as Workshop;
        }
      } catch (err) {
        console.error('Error fetching workshop details:', err);
      }
    }

    // Sort newest orders first
    matchedOrders.sort((a, b) => new Date(b.fechaIngreso).getTime() - new Date(a.fechaIngreso).getTime());

    return { orders: matchedOrders, workshopsMap };
  } catch (error) {
    console.error('Error searching work orders by patente:', error);
    return { orders: [], workshopsMap: {} };
  }
}

// Fetch all registered workshops (for Admin Panel)
export async function getAllWorkshops(): Promise<Workshop[]> {
  try {
    const ref = collection(db, 'workshops');
    const snapshot = await getDocs(ref);
    return snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        nombreTaller: data.nombreTaller || data.email || `Taller (${docSnap.id.substring(0, 6)})`,
        nombreOwner: data.nombreOwner || 'Propietario',
        email: data.email || '',
        telefono: data.telefono || '',
        direccion: data.direccion || '',
        createdAt: data.createdAt || new Date().toISOString(),
        subscription: data.subscription || { plan: 'trial', status: 'trial' },
        ...data,
      } as Workshop;
    });
  } catch (error) {
    console.error('Error fetching all workshops:', error);
    return [];
  }
}

export async function adminUpdateWorkshopSubscription(
  tallerId: string,
  plan: 'trial' | 'basico' | 'pro' | 'enterprise',
  status: 'active' | 'trial' | 'expired',
  daysToAdd: number = 30,
  tallerName?: string,
  tallerEmail?: string
): Promise<void> {
  try {
    const docRef = doc(db, 'workshops', tallerId);
    let existingData: Partial<Workshop> = {};
    try {
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        existingData = snap.data() as Workshop;
      }
    } catch (e) {}

    const now = new Date();
    const subEnds = new Date();
    subEnds.setDate(subEnds.getDate() + daysToAdd);

    const updatedData = {
      ...existingData,
      id: tallerId,
      nombreTaller: existingData.nombreTaller || tallerName || `Taller (${tallerId.substring(0, 6)})`,
      nombreOwner: existingData.nombreOwner || 'Propietario',
      email: existingData.email || tallerEmail || '',
      subscription: {
        plan,
        status,
        trialEndsAt: existingData.subscription?.trialEndsAt || now.toISOString(),
        subscriptionEndsAt: subEnds.toISOString(),
        maxWorkOrders: plan === 'pro' || plan === 'enterprise' ? 999999 : 50,
      },
    };

    await setDoc(docRef, updatedData, { merge: true });
  } catch (err) {
    console.warn('Could not update workshop subscription in Firestore:', err);
  }
}

// License Codes Management
export interface LicenseCodeDoc {
  code: string;
  plan: 'pro' | 'basico';
  days: number;
  used: boolean;
  usedByTallerId?: string;
  usedByTallerName?: string;
  usedAt?: string;
  createdAt: string;
}

const LOCAL_LICENSES_KEY = 'mitaller_created_licenses';

function getLocalLicensesBackup(): LicenseCodeDoc[] {
  try {
    const raw = localStorage.getItem(LOCAL_LICENSES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    return [];
  }
}

function saveLocalLicenseBackup(lic: LicenseCodeDoc) {
  try {
    const list = getLocalLicensesBackup();
    const updated = [lic, ...list.filter((item) => item.code !== lic.code)];
    localStorage.setItem(LOCAL_LICENSES_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Could not save license backup to localStorage:', err);
  }
}

export async function createLicenseCodeInFirestore(
  code: string,
  plan: 'pro' | 'basico' = 'pro',
  days: number = 30
): Promise<void> {
  const cleanCode = code.trim().toUpperCase();
  const data: LicenseCodeDoc = {
    code: cleanCode,
    plan,
    days,
    used: false,
    createdAt: new Date().toISOString(),
  };

  // 1. Save locally as immediate backup
  saveLocalLicenseBackup(data);

  // 2. Try saving to Firestore
  try {
    const docRef = doc(db, 'licenses', cleanCode);
    await setDoc(docRef, data, { merge: true });
  } catch (err) {
    console.error('Error writing license to Firestore, saved to local storage backup:', err);
  }
}

export async function getAllLicenseCodesFromFirestore(): Promise<LicenseCodeDoc[]> {
  const localList = getLocalLicensesBackup();
  try {
    const ref = collection(db, 'licenses');
    const snapshot = await getDocs(ref);
    const remoteList = snapshot.docs.map((d) => d.data() as LicenseCodeDoc);

    // Merge remote and local (remote takes precedence, local fills any unsynced)
    const map = new Map<string, LicenseCodeDoc>();
    localList.forEach((lic) => map.set(lic.code, lic));
    remoteList.forEach((lic) => map.set(lic.code, lic));

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (error) {
    console.error('Error fetching license codes from Firestore, returning local backup:', error);
    return localList;
  }
}

export async function validateAndApplyLicenseCodeInFirestore(
  tallerId: string,
  tallerName: string,
  inputCode: string,
  tallerEmail?: string
): Promise<{ success: boolean; message: string }> {
  const cleanCode = inputCode.trim().toUpperCase();
  if (!cleanCode) {
    return { success: false, message: 'Ingresa un código válido.' };
  }

  // Master codes check
  if (cleanCode === 'TALLERYA2026' || cleanCode === 'PRO' || cleanCode === 'MEKANICADAKAR') {
    await adminUpdateWorkshopSubscription(tallerId, 'pro', 'active', 365, tallerName, tallerEmail);
    return { success: true, message: '¡Licencia Maestra activada! Plan PRO de 1 año aplicado.' };
  }

  try {
    const licenseRef = doc(db, 'licenses', cleanCode);
    let licenseData: LicenseCodeDoc | null = null;

    try {
      const snap = await getDoc(licenseRef);
      if (snap.exists()) {
        licenseData = snap.data() as LicenseCodeDoc;
      }
    } catch (e) {
      console.warn('Error reading license from Firestore:', e);
    }

    if (!licenseData) {
      const localList = getLocalLicensesBackup();
      const matchedLocal = localList.find((l) => l.code === cleanCode);
      if (matchedLocal) {
        licenseData = matchedLocal;
      }
    }

    if (licenseData) {
      if (licenseData.used) {
        return {
          success: false,
          message: `Este código ya fue utilizado por ${licenseData.usedByTallerName || licenseData.usedByTallerId || 'otro taller'}.`
        };
      }

      // Mark license as used both in Firestore and local backup
      const updatedLicense: LicenseCodeDoc = {
        ...licenseData,
        used: true,
        usedByTallerId: tallerId,
        usedByTallerName: tallerName,
        usedAt: new Date().toISOString()
      };

      saveLocalLicenseBackup(updatedLicense);

      try {
        await setDoc(licenseRef, updatedLicense, { merge: true });
      } catch (err) {
        console.warn('Could not update license doc in Firestore:', err);
      }

      // Upgrade workshop in Firestore
      await adminUpdateWorkshopSubscription(
        tallerId,
        licenseData.plan || 'pro',
        'active',
        licenseData.days || 30,
        tallerName,
        tallerEmail
      );

      return {
        success: true,
        message: `¡Licencia activada con éxito! Se han otorgado ${licenseData.days || 30} días de Plan ${(licenseData.plan || 'pro').toUpperCase()}.`,
      };
    }

    // Fallback if code starts with PRO- or TALLERYA-
    if (cleanCode.startsWith('PRO-') || cleanCode.startsWith('TALLERYA-')) {
      const fallbackLic: LicenseCodeDoc = {
        code: cleanCode,
        plan: 'pro',
        days: 30,
        used: true,
        usedByTallerId: tallerId,
        usedByTallerName: tallerName,
        usedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };

      saveLocalLicenseBackup(fallbackLic);
      try {
        await setDoc(licenseRef, fallbackLic, { merge: true });
      } catch (e) {}

      await adminUpdateWorkshopSubscription(tallerId, 'pro', 'active', 30, tallerName, tallerEmail);
      return { success: true, message: '¡Código de Licencia PRO validado! 30 días de Plan PRO activados.' };
    }

    return { success: false, message: 'Código de licencia no encontrado o inválido. Contacta a soporte por WhatsApp.' };
  } catch (err) {
    console.error('Error validating license code:', err);
    return { success: false, message: 'Error de conexión al validar la licencia. Intenta nuevamente.' };
  }
}


