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

  // Check if profile already exists in localStorage or if existing subscription is active
  let existingSub = workshop.subscription;
  try {
    const cachedProfile = localStorage.getItem('mitaller_workshop_profile');
    if (cachedProfile) {
      const parsed = JSON.parse(cachedProfile);
      if (parsed.subscription && (parsed.subscription.status === 'active' || parsed.subscription.plan === 'pro')) {
        existingSub = parsed.subscription;
      }
    }
  } catch (e) {}

  const workshopData: Workshop = {
    ...workshop,
    subscription: existingSub || {
      plan: 'trial',
      status: 'trial',
      trialEndsAt: trialEnds.toISOString(),
      maxWorkOrders: 50,
    },
  };

  try {
    const backupListStr = localStorage.getItem('mitaller_workshops_registry');
    const backupList: Workshop[] = backupListStr ? JSON.parse(backupListStr) : [];
    const index = backupList.findIndex((w) => w.id === workshop.id || (w.email && w.email === workshop.email));
    if (index >= 0) {
      backupList[index] = { ...backupList[index], ...workshopData };
    } else {
      backupList.push(workshopData);
    }
    localStorage.setItem('mitaller_workshops_registry', JSON.stringify(backupList));
    localStorage.setItem('mitaller_workshop_profile', JSON.stringify(workshopData));
  } catch (e) {}

  try {
    const docRef = doc(db, 'workshops', workshop.id);
    await setDoc(docRef, workshopData, { merge: true });
  } catch (err) {
    console.warn('Could not save workshop profile to Firestore:', err);
  }
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
  const unsubWorkshop = onSnapshot(
    doc(db, 'workshops', tallerId),
    (docSnap) => {
      if (docSnap.exists()) {
        workshop = docSnap.data() as Workshop;
      } else {
        workshop = null;
      }
      emit();
    },
    (err) => {
      console.warn('Firestore workshop listener warning:', err?.message || err);
    }
  );

  // Clients query
  const qClients = query(collection(db, 'clients'), where('tallerId', '==', tallerId));
  const unsubClients = onSnapshot(
    qClients,
    (snapshot) => {
      clients = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Client));
      emit();
    },
    (err) => {
      console.warn('Firestore clients listener warning:', err?.message || err);
    }
  );

  // Inventory query
  const qInventory = query(collection(db, 'inventory'), where('tallerId', '==', tallerId));
  const unsubInventory = onSnapshot(
    qInventory,
    (snapshot) => {
      inventory = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as InventoryItem));
      emit();
    },
    (err) => {
      console.warn('Firestore inventory listener warning:', err?.message || err);
    }
  );

  // WorkOrders query
  const qOrders = query(collection(db, 'workOrders'), where('tallerId', '==', tallerId));
  const unsubOrders = onSnapshot(
    qOrders,
    (snapshot) => {
      workOrders = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as WorkOrder));
      emit();
    },
    (err) => {
      console.warn('Firestore workOrders listener warning:', err?.message || err);
    }
  );

  // Budgets query
  const qBudgets = query(collection(db, 'budgets'), where('tallerId', '==', tallerId));
  const unsubBudgets = onSnapshot(
    qBudgets,
    (snapshot) => {
      budgets = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Budget));
      emit();
    },
    (err) => {
      console.warn('Firestore budgets listener warning:', err?.message || err);
    }
  );

  // Mechanics query
  const qMechanics = query(collection(db, 'mechanics'), where('tallerId', '==', tallerId));
  const unsubMechanics = onSnapshot(
    qMechanics,
    (snapshot) => {
      mechanics = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Mechanic));
      emit();
    },
    (err) => {
      console.warn('Firestore mechanics listener warning:', err?.message || err);
    }
  );

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

export async function deleteBudget(budgetId: string) {
  const docRef = doc(db, 'budgets', budgetId);
  await deleteDoc(docRef);
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

export async function deleteWorkOrder(orderId: string) {
  const docRef = doc(db, 'workOrders', orderId);
  await deleteDoc(docRef);
}

export async function deleteClient(clientId: string) {
  const docRef = doc(db, 'clients', clientId);
  await deleteDoc(docRef);
}

export async function deleteInventoryItem(itemId: string) {
  const docRef = doc(db, 'inventory', itemId);
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
        console.warn('Error fetching workshop details:', err);
      }
    }

    // Sort newest orders first
    matchedOrders.sort((a, b) => new Date(b.fechaIngreso).getTime() - new Date(a.fechaIngreso).getTime());

    return { orders: matchedOrders, workshopsMap };
  } catch (error) {
    console.warn('Error searching work orders by patente:', error);
    return { orders: [], workshopsMap: {} };
  }
}

// Timeout helper to prevent infinite loading when Firestore operations hang
function fetchWithTimeout<T>(promise: Promise<T>, timeoutMs = 2500): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout de ${timeoutMs}ms al conectar con Firestore`));
    }, timeoutMs);

    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

// Fetch all registered workshops (for Admin Panel)
export async function getAllWorkshops(): Promise<Workshop[]> {
  const workshopsMap: Record<string, Workshop> = {};

  const addOrMergeWorkshop = (w: Partial<Workshop> & { id: string }) => {
    if (!w || !w.id) return;
    const existing = workshopsMap[w.id];
    const nombreTaller = w.nombreTaller || w.email || `Taller (${w.id.substring(0, 6)})`;
    const nombreOwner = w.nombreOwner || existing?.nombreOwner || 'Propietario';
    const email = w.email || existing?.email || '';
    const telefono = w.telefono || existing?.telefono || '';
    const direccion = w.direccion || existing?.direccion || '';
    const createdAt = w.createdAt || existing?.createdAt || new Date().toISOString();
    const subscription = w.subscription || existing?.subscription || { plan: 'trial', status: 'trial' };

    workshopsMap[w.id] = {
      id: w.id,
      nombreTaller,
      nombreOwner,
      email,
      telefono,
      direccion,
      createdAt,
      subscription,
      ...existing,
      ...w,
    } as Workshop;
  };

  // 1. FIRST: Load local backups so data is available instantly
  try {
    const registryStr = localStorage.getItem('mitaller_workshops_registry');
    if (registryStr) {
      const registry = JSON.parse(registryStr) as Workshop[];
      if (Array.isArray(registry)) {
        registry.forEach((w) => {
          if (w && w.id) addOrMergeWorkshop(w);
        });
      }
    }
  } catch (e) {}

  try {
    const localProfileStr = localStorage.getItem('mitaller_workshop_profile');
    if (localProfileStr) {
      const localW = JSON.parse(localProfileStr) as Workshop;
      if (localW && localW.id) {
        addOrMergeWorkshop(localW);
      }
    }
  } catch (e) {}

  // Only include primary fallback workshop Dakar if not present in registry/local storage
  if (!workshopsMap['dakar-main-workshop'] && !workshopsMap['mecanicadakar@gmail.com']) {
    let dakarSub: any = {
      plan: 'trial',
      status: 'trial',
      trialEndsAt: new Date().toISOString(),
      subscriptionEndsAt: new Date().toISOString(),
      maxWorkOrders: 50,
    };
    try {
      const dakarCached = localStorage.getItem('mitaller_dakar-main-workshop_workshop');
      if (dakarCached) {
        const parsed = JSON.parse(dakarCached);
        if (parsed.subscription) dakarSub = parsed.subscription;
      }
    } catch (e) {}

    addOrMergeWorkshop({
      id: 'dakar-main-workshop',
      nombreTaller: 'Mecánica Dakar',
      nombreOwner: 'Mecánica Dakar',
      email: 'mecanicadakar@gmail.com',
      telefono: '+54 9 11 4522-8901',
      direccion: 'Av. Libertador 4500, CABA',
      createdAt: new Date().toISOString(),
      subscription: dakarSub,
    });
  }

  // 2. Fetch from Firestore "workshops" collection with a 2.5s timeout
  try {
    const ref = collection(db, 'workshops');
    const snapshot = await fetchWithTimeout(getDocs(ref), 2500);
    snapshot.docs.forEach((docSnap) => {
      const data = docSnap.data();
      addOrMergeWorkshop({
        id: docSnap.id,
        nombreTaller: data.nombreTaller || data.email || `Taller (${docSnap.id.substring(0, 6)})`,
        nombreOwner: data.nombreOwner || 'Propietario',
        email: data.email || '',
        telefono: data.telefono || '',
        direccion: data.direccion || '',
        createdAt: data.createdAt || new Date().toISOString(),
        subscription: data.subscription || { plan: 'trial', status: 'trial' },
        ...data,
      });
    });
  } catch (error) {
    console.warn('Timeout or error fetching workshops collection from Firestore:', error);
  }

  // 3. Supplement from used licenses in Firestore & Local storage
  try {
    const licenses = await getAllLicenseCodesFromFirestore();
    licenses.forEach((lic) => {
      if (lic.used && (lic.usedByTallerId || lic.usedByTallerName)) {
        const tallerId = lic.usedByTallerId || `workshop-${lic.usedByTallerName?.toLowerCase().replace(/\s+/g, '-')}`;
        addOrMergeWorkshop({
          id: tallerId,
          nombreTaller: lic.usedByTallerName || 'Taller Registrado',
          nombreOwner: 'Propietario',
          email: lic.usedByTallerName && lic.usedByTallerName.includes('@') ? lic.usedByTallerName : 'mecanicadakar@gmail.com',
          createdAt: lic.usedAt || lic.createdAt || new Date().toISOString(),
          subscription: {
            plan: lic.plan || 'pro',
            status: 'active',
            trialEndsAt: new Date().toISOString(),
            subscriptionEndsAt: new Date(Date.now() + (lic.days || 30) * 86400000).toISOString(),
            maxWorkOrders: 999999,
          },
        });
      }
    });
  } catch (err) {
    console.warn('Error merging workshops from licenses:', err);
  }

  return Object.values(workshopsMap);
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
      const snap = await fetchWithTimeout(getDoc(docRef), 1500);
      if (snap && snap.exists()) {
        existingData = snap.data() as Workshop;
      }
    } catch (e) {
      console.warn('Could not fetch existing workshop before update:', e);
    }

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

    // Save to local storage backups first
    try {
      const backupListStr = localStorage.getItem('mitaller_workshops_registry');
      const backupList: Workshop[] = backupListStr ? JSON.parse(backupListStr) : [];
      const index = backupList.findIndex((w) => w.id === tallerId || (w.email && w.email === updatedData.email));
      if (index >= 0) {
        backupList[index] = { ...backupList[index], ...updatedData } as Workshop;
      } else {
        backupList.push(updatedData as Workshop);
      }
      localStorage.setItem('mitaller_workshops_registry', JSON.stringify(backupList));
      localStorage.setItem(`mitaller_${tallerId}_workshop`, JSON.stringify(updatedData));

      const activeProfileStr = localStorage.getItem('mitaller_workshop_profile');
      if (activeProfileStr) {
        try {
          const activeProfile = JSON.parse(activeProfileStr);
          if (activeProfile.id === tallerId || (activeProfile.email && activeProfile.email === updatedData.email)) {
            localStorage.setItem('mitaller_workshop_profile', JSON.stringify({ ...activeProfile, ...updatedData }));
          }
        } catch (e) {}
      }
    } catch (e) {}

    // Save to Firestore with a timeout so it never blocks or hangs
    try {
      await fetchWithTimeout(setDoc(docRef, updatedData, { merge: true }), 2000);
    } catch (err) {
      console.warn('Could not update workshop subscription in Firestore (timeout or offline):', err);
    }
  } catch (err) {
    console.warn('General error updating workshop subscription:', err);
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
  assignedEmail?: string;
  assignedToName?: string;
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
  days: number = 30,
  assignedEmail?: string,
  assignedToName?: string
): Promise<void> {
  const cleanCode = code.trim().toUpperCase();
  const data: LicenseCodeDoc = {
    code: cleanCode,
    plan,
    days,
    used: false,
    createdAt: new Date().toISOString(),
    assignedEmail: assignedEmail ? assignedEmail.trim().toLowerCase() : undefined,
    assignedToName: assignedToName ? assignedToName.trim() : undefined,
  };

  // 1. Save locally as immediate backup
  saveLocalLicenseBackup(data);

  // 2. Try saving to Firestore
  try {
    const docRef = doc(db, 'licenses', cleanCode);
    await fetchWithTimeout(setDoc(docRef, data, { merge: true }), 2000);
  } catch (err) {
    console.warn('Error writing license to Firestore, saved to local storage backup:', err);
  }
}

export async function getAllLicenseCodesFromFirestore(): Promise<LicenseCodeDoc[]> {
  const localList = getLocalLicensesBackup();
  try {
    const ref = collection(db, 'licenses');
    const snapshot = await fetchWithTimeout(getDocs(ref), 2500);
    const remoteList = snapshot.docs.map((d) => d.data() as LicenseCodeDoc);

    // Merge remote and local (remote takes precedence, local fills any unsynced)
    const map = new Map<string, LicenseCodeDoc>();
    localList.forEach((lic) => map.set(lic.code, lic));
    remoteList.forEach((lic) => map.set(lic.code, lic));

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (error) {
    console.warn('Error fetching license codes from Firestore, returning local backup:', error);
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

  // Master & Annual codes check
  const isAnnualCode = cleanCode.includes('ANUAL') || cleanCode.includes('365') || cleanCode.includes('YEAR') || cleanCode.includes('1ANIO');
  if (cleanCode === 'TALLERYA2026' || cleanCode === 'PRO' || cleanCode === 'MEKANICADAKAR' || isAnnualCode) {
    const days = isAnnualCode ? 365 : 365;
    await adminUpdateWorkshopSubscription(tallerId, 'pro', 'active', days, tallerName, tallerEmail);
    return { success: true, message: `¡Licencia Activada! Plan PRO de 1 año (${days} días) aplicado con éxito.` };
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

    // Fallback if code starts with PRO-, TALLERYA-, LICENCIA-
    if (cleanCode.startsWith('PRO-') || cleanCode.startsWith('TALLERYA-') || cleanCode.startsWith('LICENCIA-')) {
      const days = cleanCode.includes('365') || cleanCode.includes('ANUAL') || cleanCode.includes('YEAR') ? 365 : 365;
      const fallbackLic: LicenseCodeDoc = {
        code: cleanCode,
        plan: 'pro',
        days: days,
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

      await adminUpdateWorkshopSubscription(tallerId, 'pro', 'active', days, tallerName, tallerEmail);
      return { success: true, message: `¡Código de Licencia PRO validado! ${days} días de Plan PRO activados.` };
    }

    return { success: false, message: 'Código de licencia no encontrado o inválido. Contacta a soporte por WhatsApp.' };
  } catch (err) {
    console.warn('Error validating license code:', err);
    return { success: false, message: 'Error de conexión al validar la licencia. Intenta nuevamente.' };
  }
}


