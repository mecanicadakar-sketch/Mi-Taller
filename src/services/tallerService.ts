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
import { Client, InventoryItem, WorkOrder, Budget, Workshop, OrderStatus, Mechanic, PricingSettings } from '../types/tallerya';
import { INITIAL_CLIENTS, INITIAL_INVENTORY, INITIAL_WORK_ORDERS, INITIAL_BUDGETS, INITIAL_MECHANICS } from '../data/mockData';
import { parseAndNormalizeDate } from '../utils/dateUtils';

// Workshop profile
export async function getWorkshopProfile(tallerId: string): Promise<Workshop | null> {
  try {
    const docRef = doc(db, 'workshops', tallerId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as Workshop;
      const isMasterUser =
        data.email?.toLowerCase() === 'mecanicadakar@gmail.com' ||
        tallerId === '8zOO1dluXNhwYkxQFbAI1KetnQ2' ||
        tallerId === '8zOO1dluXNhwYkxQFbAl1KetnQ2' ||
        tallerId === 'mecanicadakar@gmail.com' ||
        data.nombreOwner?.toLowerCase() === 'mecanicadakar';

      const licenseCode = data.licenseCode || data.subscription?.licenseCode || 'PRO-XZ6EM-2026';
      data.licenseCode = licenseCode;

      if (isMasterUser && data.subscription?.plan !== 'pro') {
        const proSub = {
          plan: 'pro' as const,
          status: 'active' as const,
          trialEndsAt: data.subscription?.trialEndsAt || new Date().toISOString(),
          subscriptionEndsAt: new Date(Date.now() + 3650 * 24 * 60 * 60 * 1000).toISOString(),
          maxWorkOrders: 999999,
          licenseCode,
        };
        data.subscription = proSub;
        setDoc(docRef, { subscription: sanitizeForFirestore(proSub), licenseCode }, { merge: true }).catch(() => {});
      } else if (data.subscription) {
        data.subscription.licenseCode = licenseCode;
      }
      return data;
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

  const isMasterUser =
    workshop.email?.toLowerCase() === 'mecanicadakar@gmail.com' ||
    workshop.id === '8zOO1dluXNhwYkxQFbAI1KetnQ2' ||
    workshop.id === '8zOO1dluXNhwYkxQFbAl1KetnQ2' ||
    workshop.id === 'mecanicadakar@gmail.com' ||
    workshop.nombreOwner?.toLowerCase() === 'mecanicadakar';

  let existingSub = workshop.subscription;

  let isLocallyPro = false;
  try {
    const userW = localStorage.getItem(`mitaller_${workshop.id}_workshop`);
    const cachedProfile = localStorage.getItem('mitaller_workshop_profile');
    const sourceStr = userW || cachedProfile;
    if (sourceStr) {
      const parsed = JSON.parse(sourceStr);
      if (parsed.subscription?.plan === 'pro') isLocallyPro = true;
    }
  } catch (e) {}

  if (isMasterUser || isLocallyPro || existingSub?.plan === 'pro') {
    existingSub = {
      plan: 'pro',
      status: 'active',
      trialEndsAt: workshop.subscription?.trialEndsAt || new Date().toISOString(),
      subscriptionEndsAt: new Date(Date.now() + 3650 * 24 * 60 * 60 * 1000).toISOString(),
      maxWorkOrders: 999999,
    };
  }

  // 1. Check if profile already exists in Firestore
  try {
    const docRef = doc(db, 'workshops', workshop.id);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const remoteData = snap.data() as Workshop;
      if (remoteData.subscription && (remoteData.subscription.status === 'active' || remoteData.subscription.plan === 'pro')) {
        existingSub = remoteData.subscription;
      }
    }
  } catch (e) {}

  const workshopData: Workshop = {
    ...workshop,
    subscription: existingSub || {
      plan: isMasterUser || isLocallyPro ? 'pro' : 'trial',
      status: isMasterUser || isLocallyPro ? 'active' : 'trial',
      trialEndsAt: trialEnds.toISOString(),
      maxWorkOrders: isMasterUser || isLocallyPro ? 999999 : 50,
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
    localStorage.setItem(`mitaller_${workshop.id}_workshop`, JSON.stringify(workshopData));
    localStorage.setItem('mitaller_workshop_profile', JSON.stringify(workshopData));
  } catch (e) {}

  try {
    const docRef = doc(db, 'workshops', workshop.id);
    const sanitized = sanitizeForFirestore(workshopData);
    await setDoc(docRef, sanitized, { merge: true });
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
  subEnds.setDate(subEnds.getDate() + 365);

  const subData = {
    plan,
    status,
    trialEndsAt: now.toISOString(),
    subscriptionEndsAt: subEnds.toISOString(),
    maxWorkOrders: plan === 'pro' || plan === 'enterprise' ? 999999 : 50,
  };

  await setDoc(
    docRef,
    { subscription: subData },
    { merge: true }
  );

  // Keep local backups in sync
  try {
    const cachedProfileStr = localStorage.getItem(`mitaller_${tallerId}_workshop`) || localStorage.getItem('mitaller_workshop_profile');
    if (cachedProfileStr) {
      const parsed = JSON.parse(cachedProfileStr);
      parsed.subscription = subData;
      localStorage.setItem(`mitaller_${tallerId}_workshop`, JSON.stringify(parsed));
      localStorage.setItem('mitaller_workshop_profile', JSON.stringify(parsed));
    }
  } catch (e) {}
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
  let workOrders: WorkOrder[];
  let budgets: Budget[] = [];
  let mechanics: Mechanic[] = [];
  let workshop: Workshop | null = null;

  const emit = () => onData({ clients, inventory, workOrders, budgets, mechanics, workshop });

  // Workshop doc listener
  const unsubWorkshop = onSnapshot(
    doc(db, 'workshops', tallerId),
    (docSnap) => {
      if (docSnap.exists()) {
        const remoteW = docSnap.data() as Workshop;
        const isMaster =
          remoteW.email?.toLowerCase() === 'mecanicadakar@gmail.com' ||
          tallerId === '8zOO1dluXNhwYkxQFbAI1KetnQ2' ||
          tallerId === '8zOO1dluXNhwYkxQFbAl1KetnQ2' ||
          tallerId === 'mecanicadakar@gmail.com' ||
          remoteW.nombreOwner?.toLowerCase() === 'mecanicadakar';

        let isLocallyPro = false;
        try {
          const cachedStr = localStorage.getItem(`mitaller_${tallerId}_workshop`) || localStorage.getItem('mitaller_workshop_profile');
          if (cachedStr) {
            const parsed = JSON.parse(cachedStr);
            if (parsed.subscription?.plan === 'pro') isLocallyPro = true;
          }
        } catch (e) {}

        if (!remoteW.licenseCode) {
          remoteW.licenseCode = remoteW.subscription?.licenseCode || 'PRO-XZ6EM-2026';
        }
        if (remoteW.subscription && !remoteW.subscription.licenseCode) {
          remoteW.subscription.licenseCode = remoteW.licenseCode;
        }

        if ((isMaster || isLocallyPro) && remoteW.subscription?.plan !== 'pro') {
          remoteW.subscription = {
            plan: 'pro',
            status: 'active',
            trialEndsAt: remoteW.subscription?.trialEndsAt || new Date().toISOString(),
            subscriptionEndsAt: new Date(Date.now() + 3650 * 24 * 60 * 60 * 1000).toISOString(),
            maxWorkOrders: 999999,
            licenseCode: remoteW.licenseCode,
          };
          // Persist back to Firestore immediately so Firestore shows PRO
          const sanitizedSub = sanitizeForFirestore(remoteW.subscription);
          setDoc(doc(db, 'workshops', tallerId), { subscription: sanitizedSub, licenseCode: remoteW.licenseCode }, { merge: true }).catch(() => {});
          try {
            localStorage.setItem(`mitaller_${tallerId}_workshop`, JSON.stringify(remoteW));
            localStorage.setItem('mitaller_workshop_profile', JSON.stringify(remoteW));
          } catch (e) {}
        }

        workshop = remoteW;
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
  const clientData = sanitizeForFirestore({ ...client, tallerId });
  const docRef = doc(db, 'clients', client.id);
  await setDoc(docRef, clientData, { merge: true });
}

export async function saveInventoryItem(item: InventoryItem, tallerId: string) {
  const itemData = sanitizeForFirestore({ ...item, tallerId });
  const docRef = doc(db, 'inventory', item.id);
  await setDoc(docRef, itemData, { merge: true });
}

export async function updateStock(itemId: string, newStock: number) {
  const docRef = doc(db, 'inventory', itemId);
  await updateDoc(docRef, { stockActual: newStock });
}

export async function saveWorkOrder(order: WorkOrder, tallerId: string) {
  const orderData = sanitizeForFirestore({ ...order, tallerId });
  const docRef = doc(db, 'workOrders', order.id);
  await setDoc(docRef, orderData, { merge: true });
}

export async function updateWorkOrderStatus(orderId: string, estado: OrderStatus) {
  const docRef = doc(db, 'workOrders', orderId);
  await updateDoc(docRef, { estado });
}

export async function saveBudget(budget: Budget, tallerId: string) {
  const budgetData = sanitizeForFirestore({ ...budget, tallerId });
  const docRef = doc(db, 'budgets', budget.id);
  await setDoc(docRef, budgetData, { merge: true });
}

export async function deleteBudget(budgetId: string) {
  const docRef = doc(db, 'budgets', budgetId);
  await deleteDoc(docRef);
}

export async function saveMechanic(mechanic: Mechanic, tallerId: string) {
  const mechanicData = sanitizeForFirestore({ ...mechanic, tallerId });
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

function sanitizeForFirestore<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeForFirestore(item)) as any;
  }
  if (typeof obj === 'object') {
    const newObj: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        newObj[key] = sanitizeForFirestore(value);
      }
    }
    return newObj;
  }
  return obj;
}

// Sync local guest data or offline items to Cloud Firestore
export async function syncLocalDataToCloud(
  tallerId: string,
  localData?: {
    clients?: Client[];
    inventory?: InventoryItem[];
    workOrders?: WorkOrder[];
    budgets?: Budget[];
    mechanics?: Mechanic[];
  }
) {
  let clients = localData?.clients;
  let inventory = localData?.inventory;
  let workOrders = localData?.workOrders;
  let budgets = localData?.budgets;
  let mechanics = localData?.mechanics;

  if (!clients) {
    const s = localStorage.getItem('mitaller_guest_clients');
    if (s) { try { clients = JSON.parse(s); } catch (e) {} }
  }
  if (!inventory) {
    const s = localStorage.getItem('mitaller_guest_inventory');
    if (s) { try { inventory = JSON.parse(s); } catch (e) {} }
  }
  if (!workOrders) {
    const s = localStorage.getItem('mitaller_guest_workOrders');
    if (s) { try { workOrders = JSON.parse(s); } catch (e) {} }
  }
  if (!budgets) {
    const s = localStorage.getItem('mitaller_guest_budgets');
    if (s) { try { budgets = JSON.parse(s); } catch (e) {} }
  }
  if (!mechanics) {
    const s = localStorage.getItem('mitaller_guest_mechanics');
    if (s) { try { mechanics = JSON.parse(s); } catch (e) {} }
  }

  const itemsToWrite: Array<{ collectionName: string; id: string; data: any }> = [];

  if (clients && clients.length > 0) {
    clients.forEach((c) => itemsToWrite.push({ collectionName: 'clients', id: c.id, data: { ...c, tallerId } }));
  }
  if (inventory && inventory.length > 0) {
    inventory.forEach((i) => itemsToWrite.push({ collectionName: 'inventory', id: i.id, data: { ...i, tallerId } }));
  }
  if (workOrders && workOrders.length > 0) {
    workOrders.forEach((w) => itemsToWrite.push({ collectionName: 'workOrders', id: w.id, data: { ...w, tallerId } }));
  }
  if (budgets && budgets.length > 0) {
    budgets.forEach((b) => itemsToWrite.push({ collectionName: 'budgets', id: b.id, data: { ...b, tallerId } }));
  }
  if (mechanics && mechanics.length > 0) {
    mechanics.forEach((m) => itemsToWrite.push({ collectionName: 'mechanics', id: m.id, data: { ...m, tallerId } }));
  }

  if (itemsToWrite.length === 0) return 0;

  const BATCH_SIZE = 50;
  for (let i = 0; i < itemsToWrite.length; i += BATCH_SIZE) {
    const chunk = itemsToWrite.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);

    for (const item of chunk) {
      const ref = doc(db, item.collectionName, item.id);
      const sanitized = sanitizeForFirestore(item.data);
      batch.set(ref, sanitized, { merge: true });
    }

    try {
      await batch.commit();
    } catch (err) {
      console.warn('Error sincronizando lote a Firestore, intentando uno a uno:', err);
      for (const item of chunk) {
        try {
          const ref = doc(db, item.collectionName, item.id);
          const sanitized = sanitizeForFirestore(item.data);
          await setDoc(ref, sanitized, { merge: true });
        } catch (singleErr) {
          console.warn(`Could not sync doc ${item.id} to Firestore:`, singleErr);
        }
      }
    }
  }

  // Clear guest storage after successful migration to prevent resurrected deleted items
  try {
    localStorage.removeItem('mitaller_guest_clients');
    localStorage.removeItem('mitaller_guest_inventory');
    localStorage.removeItem('mitaller_guest_workOrders');
    localStorage.removeItem('mitaller_guest_budgets');
    localStorage.removeItem('mitaller_guest_mechanics');
  } catch (e) {}

  return itemsToWrite.length;
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
    matchedOrders.sort((a, b) => new Date(parseAndNormalizeDate(b.fechaIngreso)).getTime() - new Date(parseAndNormalizeDate(a.fechaIngreso)).getTime());

    return { orders: matchedOrders, workshopsMap };
  } catch (error) {
    console.warn('Error searching work orders by patente:', error);
    return { orders: [], workshopsMap: {} };
  }
}

// Helper function to safely fetch from Firestore without cutting off network calls
async function fetchFromFirestore<T>(promise: Promise<T>, timeoutMs = 10000): Promise<T> {
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

  // Load blacklist of deleted workshops
  let deletedList: string[] = [];
  try {
    const deletedStr = localStorage.getItem('mitaller_deleted_workshops');
    if (deletedStr) deletedList = JSON.parse(deletedStr);
  } catch (e) {}

  const addOrMergeWorkshop = (w: Partial<Workshop> & { id: string }) => {
    if (!w || !w.id) return;

    const isMaster =
      w.email?.toLowerCase() === 'mecanicadakar@gmail.com' ||
      w.id === '8zOO1dluXNhwYkxQFbAI1KetnQ2' ||
      w.id === '8zOO1dluXNhwYkxQFbAl1KetnQ2' ||
      w.id === 'dakar-main-workshop' ||
      w.id === 'mecanicadakar@gmail.com' ||
      w.nombreOwner?.toLowerCase() === 'mecanicadakar';

    if (
      deletedList.includes(w.id) ||
      (w.email && deletedList.includes(w.email.toLowerCase()))
    ) {
      return;
    }

    const existing = workshopsMap[w.id];
    const nombreTaller = w.nombreTaller || w.email || `Taller (${w.id.substring(0, 6)})`;
    const nombreOwner = w.nombreOwner || existing?.nombreOwner || 'Propietario';
    const email = w.email || existing?.email || '';
    const telefono = w.telefono || existing?.telefono || '';
    const direccion = w.direccion || existing?.direccion || '';
    const createdAt = w.createdAt || existing?.createdAt || new Date().toISOString();

    const licenseCode = w.licenseCode || existing?.licenseCode || (isMaster ? 'PRO-XZ6EM-2026' : undefined);

    const subscription = w.subscription || existing?.subscription || (
      isMaster
        ? {
            plan: 'pro' as const,
            status: 'active' as const,
            trialEndsAt: w.subscription?.trialEndsAt || new Date().toISOString(),
            subscriptionEndsAt: new Date(Date.now() + 3650 * 24 * 60 * 60 * 1000).toISOString(),
            maxWorkOrders: 999999,
            licenseCode: 'PRO-XZ6EM-2026',
          }
        : { plan: 'trial' as const, status: 'trial' as const, trialEndsAt: new Date().toISOString() }
    );

    workshopsMap[w.id] = {
      id: w.id,
      nombreTaller,
      nombreOwner,
      email,
      telefono,
      direccion,
      createdAt,
      ...existing,
      ...w,
      subscription,
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
      plan: 'pro',
      status: 'active',
      trialEndsAt: new Date().toISOString(),
      subscriptionEndsAt: new Date(Date.now() + 3650 * 24 * 60 * 60 * 1000).toISOString(),
      maxWorkOrders: 999999,
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

  // 2. Fetch from Firestore "workshops" collection
  try {
    const ref = collection(db, 'workshops');
    const snapshot = await fetchFromFirestore(getDocs(ref), 8000);
    snapshot.docs.forEach((docSnap) => {
      const data = docSnap.data() as Workshop;
      const workshopId = docSnap.id;
      addOrMergeWorkshop({
        id: workshopId,
        nombreTaller: data.nombreTaller || data.email || `Taller (${workshopId.substring(0, 6)})`,
        nombreOwner: data.nombreOwner || 'Propietario',
        email: data.email || '',
        telefono: data.telefono || '',
        direccion: data.direccion || '',
        createdAt: data.createdAt || new Date().toISOString(),
        subscription: data.subscription || { plan: 'trial', status: 'trial', trialEndsAt: new Date().toISOString() },
        ...data,
      });

      // If master user or should be PRO, sync back to Firestore if currently trial
      const isMaster =
        data.email?.toLowerCase() === 'mecanicadakar@gmail.com' ||
        workshopId === '8zOO1dluXNhwYkxQFbAI1KetnQ2' ||
        workshopId === '8zOO1dluXNhwYkxQFbAl1KetnQ2' ||
        workshopId === 'mecanicadakar@gmail.com' ||
        data.nombreOwner?.toLowerCase() === 'mecanicadakar';

      if (isMaster && !data.subscription) {
        const proSub = {
          plan: 'pro' as const,
          status: 'active' as const,
          trialEndsAt: new Date().toISOString(),
          subscriptionEndsAt: new Date(Date.now() + 3650 * 24 * 60 * 60 * 1000).toISOString(),
          maxWorkOrders: 999999,
          licenseCode: 'PRO-XZ6EM-2026',
        };
        setDoc(doc(db, 'workshops', workshopId), { subscription: sanitizeForFirestore(proSub), licenseCode: 'PRO-XZ6EM-2026' }, { merge: true }).catch(() => {});
      }
    });
  } catch (error) {
    console.warn('Error fetching workshops collection from Firestore:', error);
  }

  // 3. Supplement from used licenses in Firestore & Local storage (only for workshops not already loaded)
  try {
    const licenses = await getAllLicenseCodesFromFirestore();
    licenses.forEach((lic) => {
      if (lic.used && (lic.usedByTallerId || lic.usedByTallerName)) {
        const tallerId = lic.usedByTallerId || `workshop-${lic.usedByTallerName?.toLowerCase().replace(/\s+/g, '-')}`;
        if (!workshopsMap[tallerId]) {
          addOrMergeWorkshop({
            id: tallerId,
            nombreTaller: lic.usedByTallerName || 'Taller Registrado',
            nombreOwner: 'Propietario',
            email: lic.usedByTallerName && lic.usedByTallerName.includes('@') ? lic.usedByTallerName : '',
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
  tallerEmail?: string,
  licenseCode?: string
): Promise<void> {
  try {
    const docRef = doc(db, 'workshops', tallerId);
    let existingData: Partial<Workshop> = {};
    try {
      const snap = await getDoc(docRef);
      if (snap && snap.exists()) {
        existingData = snap.data() as Workshop;
      }
    } catch (e) {
      console.warn('Could not fetch existing workshop before update:', e);
    }

    const now = new Date();
    const subEnds = new Date();
    subEnds.setDate(subEnds.getDate() + daysToAdd);

    const codeToSet =
      licenseCode ||
      existingData.licenseCode ||
      existingData.subscription?.licenseCode ||
      (plan === 'pro' ? 'PRO-XZ6EM-2026' : 'TRIAL-DEMO');

    const updatedData = {
      ...existingData,
      id: tallerId,
      nombreTaller: existingData.nombreTaller || tallerName || `Taller (${tallerId.substring(0, 6)})`,
      nombreOwner: existingData.nombreOwner || 'Propietario',
      email: existingData.email || tallerEmail || '',
      licenseCode: codeToSet,
      subscription: {
        plan,
        status,
        trialEndsAt: existingData.subscription?.trialEndsAt || now.toISOString(),
        subscriptionEndsAt: subEnds.toISOString(),
        maxWorkOrders: plan === 'pro' || plan === 'enterprise' ? 999999 : 50,
        licenseCode: codeToSet,
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

    // Save to Firestore directly
    const sanitized = sanitizeForFirestore(updatedData);
    await setDoc(docRef, sanitized, { merge: true });
  } catch (err) {
    console.error('Error updating workshop subscription in Firestore:', err);
    throw err;
  }
}

export async function adminDeleteWorkshop(tallerId: string, email?: string): Promise<void> {
  if (!tallerId) return;

  // 1. Remove from local storage backups & add to deleted list
  try {
    const deletedStr = localStorage.getItem('mitaller_deleted_workshops');
    const deletedList: string[] = deletedStr ? JSON.parse(deletedStr) : [];
    if (!deletedList.includes(tallerId)) deletedList.push(tallerId);
    if (email && !deletedList.includes(email.toLowerCase())) deletedList.push(email.toLowerCase());
    localStorage.setItem('mitaller_deleted_workshops', JSON.stringify(deletedList));

    const backupListStr = localStorage.getItem('mitaller_workshops_registry');
    if (backupListStr) {
      const backupList: Workshop[] = JSON.parse(backupListStr);
      const filtered = backupList.filter(
        (w) => w.id !== tallerId && w.email?.toLowerCase() !== email?.toLowerCase()
      );
      localStorage.setItem('mitaller_workshops_registry', JSON.stringify(filtered));
    }
    localStorage.removeItem(`mitaller_${tallerId}_workshop`);
    if (email) localStorage.removeItem(`mitaller_${email}_workshop`);
  } catch (e) {
    console.warn('Error deleting workshop from local storage:', e);
  }

  // 2. Delete from Firestore workshops collection
  try {
    const docRef = doc(db, 'workshops', tallerId);
    await deleteDoc(docRef);

    if (email) {
      const qByEmail = query(collection(db, 'workshops'), where('email', '==', email));
      const snap = await getDocs(qByEmail);
      snap.docs.forEach((d) => {
        deleteDoc(d.ref).catch(() => {});
      });
    }
  } catch (err) {
    console.error('Error deleting workshop from Firestore:', err);
  }

  // 3. Reset any license codes used by or assigned to this workshop
  try {
    const ref = collection(db, 'licenses');
    const snap = await getDocs(ref);
    snap.docs.forEach((d) => {
      const lic = d.data() as LicenseCodeDoc;
      if (
        lic.usedByTallerId === tallerId ||
        (email && lic.assignedEmail?.toLowerCase() === email.toLowerCase())
      ) {
        setDoc(d.ref, { used: false, usedByTallerId: '', usedByTallerName: '' }, { merge: true }).catch(() => {});
      }
    });
  } catch (err) {
    console.warn('Error resetting licenses for deleted workshop:', err);
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
    await setDoc(docRef, data, { merge: true });
  } catch (err) {
    console.warn('Error writing license to Firestore, saved to local storage backup:', err);
  }
}

export async function getAllLicenseCodesFromFirestore(): Promise<LicenseCodeDoc[]> {
  const localList = getLocalLicensesBackup();
  try {
    const ref = collection(db, 'licenses');
    const snapshot = await fetchFromFirestore(getDocs(ref), 8000);
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
    await adminUpdateWorkshopSubscription(tallerId, 'pro', 'active', days, tallerName, tallerEmail, cleanCode);
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
        tallerEmail,
        cleanCode
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

      await adminUpdateWorkshopSubscription(tallerId, 'pro', 'active', days, tallerName, tallerEmail, cleanCode);
      return { success: true, message: `¡Código de Licencia PRO validado! ${days} días de Plan PRO activados.` };
    }

    return { success: false, message: 'Código de licencia no encontrado o inválido. Contacta a soporte por WhatsApp.' };
  } catch (err) {
    console.warn('Error validating license code:', err);
    return { success: false, message: 'Error de conexión al validar la licencia. Intenta nuevamente.' };
  }
}

// ---------------------------------------------------------
// PRICING & PLAN CONFIGURATION (USD & PYG Exchange Rate)
// ---------------------------------------------------------
export const DEFAULT_PRICING_SETTINGS: PricingSettings = {
  exchangeRateUsdToPyg: 7500,
  basicoPriceUsd: 15,
  basicoPricePyg: 100000,
  proPriceUsd: 29,
  proPricePyg: 200000,
  anualPriceUsd: 290,
  anualPricePyg: 2000000,
};

export async function getPricingSettings(): Promise<PricingSettings> {
  const LOCAL_KEY = 'mitaller_pricing_settings';
  let localData: PricingSettings = DEFAULT_PRICING_SETTINGS;
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (raw) {
      localData = { ...DEFAULT_PRICING_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (e) {}

  try {
    const docRef = doc(db, 'settings', 'pricing');
    const snap = await fetchFromFirestore(getDoc(docRef), 5000);
    if (snap.exists()) {
      const remote = snap.data() as PricingSettings;
      const merged = { ...DEFAULT_PRICING_SETTINGS, ...remote };
      try {
        localStorage.setItem(LOCAL_KEY, JSON.stringify(merged));
      } catch (e) {}
      return merged;
    }
  } catch (err) {
    console.warn('Could not fetch pricing settings from Firestore, using local fallback:', err);
  }

  return localData;
}

export async function savePricingSettings(settings: PricingSettings): Promise<void> {
  const LOCAL_KEY = 'mitaller_pricing_settings';
  const dataToSave = {
    ...settings,
    updatedAt: new Date().toISOString()
  };

  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(dataToSave));
  } catch (e) {}

  try {
    const docRef = doc(db, 'settings', 'pricing');
    await setDoc(docRef, sanitizeForFirestore(dataToSave), { merge: true });
  } catch (err) {
    console.warn('Error saving pricing settings to Firestore:', err);
  }
}


