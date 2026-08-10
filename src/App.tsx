import { useState, useEffect, useMemo } from 'react';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { auth } from './lib/firebase';
import {
  subscribeToWorkshopCollections,
  saveClient,
  saveInventoryItem,
  updateStock,
  saveWorkOrder,
  updateWorkOrderStatus,
  saveBudget,
  deleteBudget,
  saveMechanic,
  deleteMechanic,
  deleteWorkOrder,
  deleteClient,
  deleteInventoryItem,
  updateWorkshopSubscription,
  validateAndApplyLicenseCodeInFirestore,
  createWorkshopProfile,
  syncLocalDataToCloud
} from './services/tallerService';

import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { WorkOrdersView } from './components/WorkOrdersView';
import { ClientsView } from './components/ClientsView';
import { InventoryView } from './components/InventoryView';
import { BudgetView } from './components/BudgetView';
import { WorkOrderDetailModal } from './components/WorkOrderDetailModal';
import { NewWorkOrderModal } from './components/NewWorkOrderModal';
import { ImportChatModal } from './components/ImportChatModal';
import { AuthModal } from './components/AuthModal';
import { ClientLookupModal } from './components/ClientLookupModal';
import { MechanicsModal } from './components/MechanicsModal';
import { SubscriptionModal } from './components/SubscriptionModal';
import { AdminPanelModal } from './components/AdminPanelModal';
import { InstallAppBanner } from './components/InstallAppBanner';
import { GoogleSheetsImportModal } from './components/GoogleSheetsImportModal';
import { WhatsAppReminderModal } from './components/WhatsAppReminderModal';
import { DeleteDataModal } from './components/DeleteDataModal';
import { deduplicateClients, deduplicateWorkOrders } from './services/googleDriveImportService';
import { calculateReminders } from './services/whatsappReminderService';

import {
  INITIAL_CLIENTS,
  INITIAL_INVENTORY,
  INITIAL_WORK_ORDERS,
  INITIAL_BUDGETS,
  INITIAL_MECHANICS,
} from './data/mockData';

import { Client, WorkOrder, InventoryItem, Budget, Vehicle, OrderStatus, Workshop, Mechanic } from './types/tallerya';
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  Package,
  FileText,
  Building2,
  Sparkles,
  CloudCheck,
  User,
  Menu,
  X,
  Car,
  CreditCard,
  Smartphone
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Auth & Multi-tenant State
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [workshop, setWorkshop] = useState<Workshop | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  // Auth Modal State
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Client Public Lookup & Subscription Modal State
  const [showClientLookupModal, setShowClientLookupModal] = useState<boolean>(false);
  const [showMechanicsModal, setShowMechanicsModal] = useState<boolean>(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState<boolean>(false);
  const [showAdminPanelModal, setShowAdminPanelModal] = useState<boolean>(false);
  const [showForceInstallModal, setShowForceInstallModal] = useState<boolean>(false);

  // Mobile drawer state
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Core Data State
  const [clients, setClients] = useState<Client[]>(INITIAL_CLIENTS);
  const [inventory, setInventory] = useState<InventoryItem[]>(INITIAL_INVENTORY);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>(INITIAL_WORK_ORDERS);
  const [budgets, setBudgets] = useState<Budget[]>(INITIAL_BUDGETS);
  const [mechanics, setMechanics] = useState<Mechanic[]>(INITIAL_MECHANICS);

  // Syncing status feedback
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Modals State
  const [selectedOrder, setSelectedOrder] = useState<WorkOrder | null>(null);
  const [showNewWorkOrderModal, setShowNewWorkOrderModal] = useState<false | boolean>(false);
  const [showImportModal, setShowImportModal] = useState<false | boolean>(false);
  const [showGoogleSheetsModal, setShowGoogleSheetsModal] = useState<boolean>(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState<boolean>(false);
  const [showDeleteDataModal, setShowDeleteDataModal] = useState<boolean>(false);

  const remindersCount = useMemo(() => {
    return calculateReminders(workOrders, clients, 1000).length;
  }, [workOrders, clients]);

  // Preselected info for launching new work order
  const [preselectedClient, setPreselectedClient] = useState<Client | undefined>();
  const [preselectedVehicle, setPreselectedVehicle] = useState<Vehicle | undefined>();

  // Firebase Auth & Firestore Subscription Listener
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setWorkshop(null);
      const storedClients = localStorage.getItem('mitaller_guest_clients');
      const storedInventory = localStorage.getItem('mitaller_guest_inventory');
      const storedWorkOrders = localStorage.getItem('mitaller_guest_workOrders');
      const storedBudgets = localStorage.getItem('mitaller_guest_budgets');
      const storedMechanics = localStorage.getItem('mitaller_guest_mechanics');

      if (storedClients !== null) {
        try { setClients(JSON.parse(storedClients)); } catch (e) { setClients([]); }
      } else {
        setClients(INITIAL_CLIENTS);
        localStorage.setItem('mitaller_guest_clients', JSON.stringify(INITIAL_CLIENTS));
      }

      if (storedInventory !== null) {
        try { setInventory(JSON.parse(storedInventory)); } catch (e) { setInventory([]); }
      } else {
        setInventory(INITIAL_INVENTORY);
        localStorage.setItem('mitaller_guest_inventory', JSON.stringify(INITIAL_INVENTORY));
      }

      if (storedWorkOrders !== null) {
        try { setWorkOrders(JSON.parse(storedWorkOrders)); } catch (e) { setWorkOrders([]); }
      } else {
        setWorkOrders(INITIAL_WORK_ORDERS);
        localStorage.setItem('mitaller_guest_workOrders', JSON.stringify(INITIAL_WORK_ORDERS));
      }

      if (storedBudgets !== null) {
        try { setBudgets(JSON.parse(storedBudgets)); } catch (e) { setBudgets([]); }
      } else {
        setBudgets(INITIAL_BUDGETS);
        localStorage.setItem('mitaller_guest_budgets', JSON.stringify(INITIAL_BUDGETS));
      }

      if (storedMechanics !== null) {
        try { setMechanics(JSON.parse(storedMechanics)); } catch (e) { setMechanics([]); }
      } else {
        setMechanics(INITIAL_MECHANICS);
        localStorage.setItem('mitaller_guest_mechanics', JSON.stringify(INITIAL_MECHANICS));
      }
      return;
    }

    // Load user cached local data initially so UI responds instantly
    const userClientsKey = `mitaller_${currentUser.uid}_clients`;
    const userInventoryKey = `mitaller_${currentUser.uid}_inventory`;
    const userOrdersKey = `mitaller_${currentUser.uid}_workOrders`;
    const userBudgetsKey = `mitaller_${currentUser.uid}_budgets`;
    const userMechanicsKey = `mitaller_${currentUser.uid}_mechanics`;

    const cClients = localStorage.getItem(userClientsKey);
    if (cClients) { try { setClients(JSON.parse(cClients)); } catch (e) {} }
    const cInventory = localStorage.getItem(userInventoryKey);
    if (cInventory) { try { setInventory(JSON.parse(cInventory)); } catch (e) {} }
    const cOrders = localStorage.getItem(userOrdersKey);
    if (cOrders) { try { setWorkOrders(JSON.parse(cOrders)); } catch (e) {} }
    const cBudgets = localStorage.getItem(userBudgetsKey);
    if (cBudgets) { try { setBudgets(JSON.parse(cBudgets)); } catch (e) {} }
    const cMechanics = localStorage.getItem(userMechanicsKey);
    if (cMechanics) { try { setMechanics(JSON.parse(cMechanics)); } catch (e) {} }

    // Sync any unsynced local/guest items to cloud on login
    syncLocalDataToCloud(currentUser.uid).catch((err) => {
      console.warn('Error syncing initial local data to cloud:', err);
    });

    // Subscribe to Firestore for logged in user's tallerId
    setIsSyncing(true);
    const unsubscribeFirestore = subscribeToWorkshopCollections(
      currentUser.uid,
      async (data) => {
        setIsSyncing(false);

        if (data.clients && Array.isArray(data.clients)) {
          setClients(data.clients);
          localStorage.setItem(userClientsKey, JSON.stringify(data.clients));
        }

        if (data.inventory && Array.isArray(data.inventory)) {
          setInventory(data.inventory);
          localStorage.setItem(userInventoryKey, JSON.stringify(data.inventory));
        }

        if (data.workOrders && Array.isArray(data.workOrders)) {
          setWorkOrders(data.workOrders);
          localStorage.setItem(userOrdersKey, JSON.stringify(data.workOrders));
        }

        if (data.budgets && Array.isArray(data.budgets)) {
          setBudgets(data.budgets);
          localStorage.setItem(userBudgetsKey, JSON.stringify(data.budgets));
        }

        if (data.mechanics && Array.isArray(data.mechanics)) {
          setMechanics(data.mechanics);
          localStorage.setItem(userMechanicsKey, JSON.stringify(data.mechanics));
        }

        if (data.workshop) {
          setWorkshop(data.workshop);
          localStorage.setItem(`mitaller_${currentUser.uid}_workshop`, JSON.stringify(data.workshop));
          localStorage.setItem('mitaller_workshop_profile', JSON.stringify(data.workshop));
        } else {
          // Check cached workshop profile
          const cachedProfileStr = localStorage.getItem(`mitaller_${currentUser.uid}_workshop`) || localStorage.getItem('mitaller_workshop_profile');
          let cachedProfile: Workshop | null = null;
          if (cachedProfileStr) {
            try { cachedProfile = JSON.parse(cachedProfileStr); } catch (e) {}
          }

          if (cachedProfile) {
            setWorkshop(cachedProfile);
            await createWorkshopProfile(cachedProfile);
          } else {
            // Auto-create initial workshop profile doc in Firestore if missing
            const defaultName = currentUser.displayName
              ? `Taller de ${currentUser.displayName}`
              : currentUser.email
              ? `Taller ${currentUser.email.split('@')[0]}`
              : 'Mecanica Dakar';

            const isMasterUser =
              currentUser.email?.toLowerCase() === 'mecanicadakar@gmail.com' ||
              currentUser.uid === '8zOO1dluXNhwYkxQFbAI1KetnQ2' ||
              currentUser.uid === '8zOO1dluXNhwYkxQFbAl1KetnQ2';

            const newWorkshop: Workshop = {
              id: currentUser.uid,
              nombreTaller: defaultName,
              nombreOwner: currentUser.displayName || 'Fabio Torres',
              email: currentUser.email || 'mecanicadakar@gmail.com',
              telefono: '+595975635770',
              direccion: '',
              createdAt: new Date().toISOString(),
              subscription: isMasterUser
                ? {
                    plan: 'pro',
                    status: 'active',
                    trialEndsAt: new Date().toISOString(),
                    subscriptionEndsAt: new Date(Date.now() + 3650 * 24 * 60 * 60 * 1000).toISOString(),
                    maxWorkOrders: 999999,
                  }
                : {
                    plan: 'trial',
                    status: 'trial',
                    trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
                    maxWorkOrders: 50,
                  },
            };
            setWorkshop(newWorkshop);
            try {
              await createWorkshopProfile(newWorkshop);
            } catch (err) {
              console.warn('Could not auto-create workshop profile:', err);
            }
          }
        }
      }
    );

    return () => unsubscribeFirestore();
  }, [currentUser]);

  // Auth Action Handlers
  const handleOpenAuth = (mode: 'login' | 'register' = 'login') => {
    setAuthMode(mode);
    setShowAuthModal(true);
  };

  const handleResetDemoData = () => {
    localStorage.removeItem('mitaller_guest_clients');
    localStorage.removeItem('mitaller_guest_inventory');
    localStorage.removeItem('mitaller_guest_workOrders');
    localStorage.removeItem('mitaller_guest_budgets');
    localStorage.removeItem('mitaller_guest_mechanics');

    setClients(INITIAL_CLIENTS);
    setInventory(INITIAL_INVENTORY);
    setWorkOrders(INITIAL_WORK_ORDERS);
    setBudgets(INITIAL_BUDGETS);
    setMechanics(INITIAL_MECHANICS);
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setWorkshop(null);
    handleResetDemoData();
  };

  const handleDeleteWorkOrder = async (orderId: string) => {
    setWorkOrders((prev) => {
      const next = prev.filter((o) => o.id !== orderId);
      const key = currentUser ? `mitaller_${currentUser.uid}_workOrders` : 'mitaller_guest_workOrders';
      localStorage.setItem(key, JSON.stringify(next));
      return next;
    });
    try {
      const guestRaw = localStorage.getItem('mitaller_guest_workOrders');
      if (guestRaw) {
        const guestItems = JSON.parse(guestRaw);
        if (Array.isArray(guestItems)) {
          localStorage.setItem('mitaller_guest_workOrders', JSON.stringify(guestItems.filter((o: any) => o.id !== orderId)));
        }
      }
    } catch (e) {}

    if (currentUser) {
      await deleteWorkOrder(orderId);
    }
  };

  const handleDeleteMultipleWorkOrders = async (orderIds: string[]) => {
    if (!orderIds || orderIds.length === 0) return;
    const idsSet = new Set(orderIds);
    setWorkOrders((prev) => {
      const next = prev.filter((o) => !idsSet.has(o.id));
      const key = currentUser ? `mitaller_${currentUser.uid}_workOrders` : 'mitaller_guest_workOrders';
      localStorage.setItem(key, JSON.stringify(next));
      return next;
    });
    try {
      const guestRaw = localStorage.getItem('mitaller_guest_workOrders');
      if (guestRaw) {
        const guestItems = JSON.parse(guestRaw);
        if (Array.isArray(guestItems)) {
          localStorage.setItem('mitaller_guest_workOrders', JSON.stringify(guestItems.filter((o: any) => !idsSet.has(o.id))));
        }
      }
    } catch (e) {}

    if (currentUser) {
      for (const id of orderIds) {
        try { await deleteWorkOrder(id); } catch (e) {}
      }
    }
  };

  const handleDeleteMultipleClients = async (clientIds: string[]) => {
    if (!clientIds || clientIds.length === 0) return;
    const idsSet = new Set(clientIds);
    setClients((prev) => {
      const next = prev.filter((c) => !idsSet.has(c.id));
      const key = currentUser ? `mitaller_${currentUser.uid}_clients` : 'mitaller_guest_clients';
      localStorage.setItem(key, JSON.stringify(next));
      return next;
    });
    try {
      const guestRaw = localStorage.getItem('mitaller_guest_clients');
      if (guestRaw) {
        const guestItems = JSON.parse(guestRaw);
        if (Array.isArray(guestItems)) {
          localStorage.setItem('mitaller_guest_clients', JSON.stringify(guestItems.filter((c: any) => !idsSet.has(c.id))));
        }
      }
    } catch (e) {}

    if (currentUser) {
      for (const id of clientIds) {
        try { await deleteClient(id); } catch (e) {}
      }
    }
  };

  const handleDeleteMultipleBudgets = async (budgetIds: string[]) => {
    if (!budgetIds || budgetIds.length === 0) return;
    const idsSet = new Set(budgetIds);
    setBudgets((prev) => {
      const next = prev.filter((b) => !idsSet.has(b.id));
      const key = currentUser ? `mitaller_${currentUser.uid}_budgets` : 'mitaller_guest_budgets';
      localStorage.setItem(key, JSON.stringify(next));
      return next;
    });
    try {
      const guestRaw = localStorage.getItem('mitaller_guest_budgets');
      if (guestRaw) {
        const guestItems = JSON.parse(guestRaw);
        if (Array.isArray(guestItems)) {
          localStorage.setItem('mitaller_guest_budgets', JSON.stringify(guestItems.filter((b: any) => !idsSet.has(b.id))));
        }
      }
    } catch (e) {}

    if (currentUser) {
      for (const id of budgetIds) {
        try { await deleteBudget(id); } catch (e) {}
      }
    }
  };

  const handleDeleteMultipleInventory = async (inventoryIds: string[]) => {
    if (!inventoryIds || inventoryIds.length === 0) return;
    const idsSet = new Set(inventoryIds);
    setInventory((prev) => {
      const next = prev.filter((i) => !idsSet.has(i.id));
      const key = currentUser ? `mitaller_${currentUser.uid}_inventory` : 'mitaller_guest_inventory';
      localStorage.setItem(key, JSON.stringify(next));
      return next;
    });
    try {
      const guestRaw = localStorage.getItem('mitaller_guest_inventory');
      if (guestRaw) {
        const guestItems = JSON.parse(guestRaw);
        if (Array.isArray(guestItems)) {
          localStorage.setItem('mitaller_guest_inventory', JSON.stringify(guestItems.filter((i: any) => !idsSet.has(i.id))));
        }
      }
    } catch (e) {}

    if (currentUser) {
      for (const id of inventoryIds) {
        try { await deleteInventoryItem(id); } catch (e) {}
      }
    }
  };

  const handleDeleteMultipleMechanics = async (mechanicIds: string[]) => {
    if (!mechanicIds || mechanicIds.length === 0) return;
    const idsSet = new Set(mechanicIds);
    setMechanics((prev) => {
      const next = prev.filter((m) => !idsSet.has(m.id));
      const key = currentUser ? `mitaller_${currentUser.uid}_mechanics` : 'mitaller_guest_mechanics';
      localStorage.setItem(key, JSON.stringify(next));
      return next;
    });
    try {
      const guestRaw = localStorage.getItem('mitaller_guest_mechanics');
      if (guestRaw) {
        const guestItems = JSON.parse(guestRaw);
        if (Array.isArray(guestItems)) {
          localStorage.setItem('mitaller_guest_mechanics', JSON.stringify(guestItems.filter((m: any) => !idsSet.has(m.id))));
        }
      }
    } catch (e) {}

    if (currentUser) {
      for (const id of mechanicIds) {
        try { await deleteMechanic(id); } catch (e) {}
      }
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    setClients((prev) => {
      const next = prev.filter((c) => c.id !== clientId);
      const key = currentUser ? `mitaller_${currentUser.uid}_clients` : 'mitaller_guest_clients';
      localStorage.setItem(key, JSON.stringify(next));
      return next;
    });
    try {
      const guestRaw = localStorage.getItem('mitaller_guest_clients');
      if (guestRaw) {
        const guestItems = JSON.parse(guestRaw);
        if (Array.isArray(guestItems)) {
          localStorage.setItem('mitaller_guest_clients', JSON.stringify(guestItems.filter((c: any) => c.id !== clientId)));
        }
      }
    } catch (e) {}

    if (currentUser) {
      await deleteClient(clientId);
    }
  };

  const handleBulkClearData = async (options: {
    deleteWorkOrders: boolean;
    deleteClients: boolean;
    deleteBudgets: boolean;
    deleteInventory: boolean;
    deleteMechanics: boolean;
  }) => {
    if (options.deleteWorkOrders) {
      if (currentUser) {
        for (const wo of workOrders) {
          try { await deleteWorkOrder(wo.id); } catch (e) {}
        }
      }
      setWorkOrders([]);
      const key = currentUser ? `mitaller_${currentUser.uid}_workOrders` : 'mitaller_guest_workOrders';
      localStorage.setItem(key, JSON.stringify([]));
      localStorage.setItem('mitaller_guest_workOrders', JSON.stringify([]));
    }

    if (options.deleteClients) {
      if (currentUser) {
        for (const c of clients) {
          try { await deleteClient(c.id); } catch (e) {}
        }
      }
      setClients([]);
      const key = currentUser ? `mitaller_${currentUser.uid}_clients` : 'mitaller_guest_clients';
      localStorage.setItem(key, JSON.stringify([]));
      localStorage.setItem('mitaller_guest_clients', JSON.stringify([]));
    }

    if (options.deleteBudgets) {
      if (currentUser) {
        for (const b of budgets) {
          try { await deleteBudget(b.id); } catch (e) {}
        }
      }
      setBudgets([]);
      const key = currentUser ? `mitaller_${currentUser.uid}_budgets` : 'mitaller_guest_budgets';
      localStorage.setItem(key, JSON.stringify([]));
      localStorage.setItem('mitaller_guest_budgets', JSON.stringify([]));
    }

    if (options.deleteInventory) {
      if (currentUser) {
        for (const item of inventory) {
          try { await deleteInventoryItem(item.id); } catch (e) {}
        }
      }
      setInventory([]);
      const key = currentUser ? `mitaller_${currentUser.uid}_inventory` : 'mitaller_guest_inventory';
      localStorage.setItem(key, JSON.stringify([]));
      localStorage.setItem('mitaller_guest_inventory', JSON.stringify([]));
    }

    if (options.deleteMechanics) {
      if (currentUser) {
        for (const m of mechanics) {
          try { await deleteMechanic(m.id); } catch (e) {}
        }
      }
      setMechanics([]);
      const key = currentUser ? `mitaller_${currentUser.uid}_mechanics` : 'mitaller_guest_mechanics';
      localStorage.setItem(key, JSON.stringify([]));
      localStorage.setItem('mitaller_guest_mechanics', JSON.stringify([]));
    }
  };

  // Handlers
  const handleAddClient = async (newClient: Client) => {
    setClients((prev) => {
      const idx = prev.findIndex((c) => c.id === newClient.id);
      const next = idx >= 0 ? prev.map((c, i) => (i === idx ? newClient : c)) : [newClient, ...prev];
      const key = currentUser ? `mitaller_${currentUser.uid}_clients` : 'mitaller_guest_clients';
      localStorage.setItem(key, JSON.stringify(next));
      return next;
    });
    if (currentUser) {
      await saveClient(newClient, currentUser.uid);
    }
  };

  const handleAddInventoryItem = async (newItem: InventoryItem) => {
    setInventory((prev) => {
      const idx = prev.findIndex((i) => i.id === newItem.id);
      const next = idx >= 0 ? prev.map((item, i) => (i === idx ? newItem : item)) : [newItem, ...prev];
      const key = currentUser ? `mitaller_${currentUser.uid}_inventory` : 'mitaller_guest_inventory';
      localStorage.setItem(key, JSON.stringify(next));
      return next;
    });
    if (currentUser) {
      await saveInventoryItem(newItem, currentUser.uid);
    }
  };

  const handleUpdateStock = async (itemId: string, newStock: number) => {
    setInventory((prev) => {
      const next = prev.map((item) => (item.id === itemId ? { ...item, stockActual: newStock } : item));
      const key = currentUser ? `mitaller_${currentUser.uid}_inventory` : 'mitaller_guest_inventory';
      localStorage.setItem(key, JSON.stringify(next));
      return next;
    });
    if (currentUser) {
      await updateStock(itemId, newStock);
    }
  };

  const handleDeleteInventoryItem = async (itemId: string) => {
    setInventory((prev) => {
      const next = prev.filter((i) => i.id !== itemId);
      const key = currentUser ? `mitaller_${currentUser.uid}_inventory` : 'mitaller_guest_inventory';
      localStorage.setItem(key, JSON.stringify(next));
      return next;
    });
    try {
      const guestRaw = localStorage.getItem('mitaller_guest_inventory');
      if (guestRaw) {
        const guestItems = JSON.parse(guestRaw);
        if (Array.isArray(guestItems)) {
          localStorage.setItem('mitaller_guest_inventory', JSON.stringify(guestItems.filter((i: any) => i.id !== itemId)));
        }
      }
    } catch (e) {}

    if (currentUser) {
      await deleteInventoryItem(itemId);
    }
  };

  const handleCreateWorkOrder = async (newOrder: WorkOrder) => {
    setWorkOrders((prev) => {
      const idx = prev.findIndex((o) => o.id === newOrder.id);
      const next = idx >= 0 ? prev.map((o, i) => (i === idx ? newOrder : o)) : [newOrder, ...prev];
      const key = currentUser ? `mitaller_${currentUser.uid}_workOrders` : 'mitaller_guest_workOrders';
      localStorage.setItem(key, JSON.stringify(next));
      return next;
    });

    // Check client vehicle update locally
    setClients((prev) => {
      const existingClientIndex = prev.findIndex((c) => c.id === newOrder.clienteId);
      let updatedClients = [...prev];
      if (existingClientIndex >= 0) {
        const client = { ...updatedClients[existingClientIndex] };
        const vehicleExists = client.vehiculos.some((v) => v.patente === newOrder.vehiculo.patente);
        if (!vehicleExists) {
          client.vehiculos = [...client.vehiculos, newOrder.vehiculo];
          updatedClients[existingClientIndex] = client;
        }
      } else {
        const newClient: Client = {
          id: newOrder.clienteId,
          nombre: newOrder.clienteNombre,
          telefono: newOrder.clienteTelefono,
          email: '',
          vehiculos: [newOrder.vehiculo],
        };
        updatedClients = [newClient, ...prev];
      }
      const key = currentUser ? `mitaller_${currentUser.uid}_clients` : 'mitaller_guest_clients';
      localStorage.setItem(key, JSON.stringify(updatedClients));
      return updatedClients;
    });

    if (currentUser) {
      await saveWorkOrder(newOrder, currentUser.uid);
      const existingClient = clients.find((c) => c.id === newOrder.clienteId);
      if (existingClient) {
        const vehicleExists = existingClient.vehiculos.some((v) => v.patente === newOrder.vehiculo.patente);
        if (!vehicleExists) {
          const updatedClient = {
            ...existingClient,
            vehiculos: [...existingClient.vehiculos, newOrder.vehiculo],
          };
          await saveClient(updatedClient, currentUser.uid);
        }
      } else {
        const newClient: Client = {
          id: newOrder.clienteId,
          nombre: newOrder.clienteNombre,
          telefono: newOrder.clienteTelefono,
          email: '',
          vehiculos: [newOrder.vehiculo],
        };
        await saveClient(newClient, currentUser.uid);
      }
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    setWorkOrders((prev) => {
      const next = prev.map((o) => (o.id === orderId ? { ...o, estado: newStatus } : o));
      const key = currentUser ? `mitaller_${currentUser.uid}_workOrders` : 'mitaller_guest_workOrders';
      localStorage.setItem(key, JSON.stringify(next));
      return next;
    });
    if (currentUser) {
      await updateWorkOrderStatus(orderId, newStatus);
    }
  };

  const handleUpdateOrderDetails = async (updated: WorkOrder) => {
    setWorkOrders((prev) => {
      const next = prev.map((o) => (o.id === updated.id ? updated : o));
      const key = currentUser ? `mitaller_${currentUser.uid}_workOrders` : 'mitaller_guest_workOrders';
      localStorage.setItem(key, JSON.stringify(next));
      return next;
    });
    if (currentUser) {
      await saveWorkOrder(updated, currentUser.uid);
    }
  };

  const handleAddBudget = async (newBudget: Budget) => {
    setBudgets((prev) => {
      const idx = prev.findIndex((b) => b.id === newBudget.id);
      const next = idx >= 0 ? prev.map((b, i) => (i === idx ? newBudget : b)) : [newBudget, ...prev];
      const key = currentUser ? `mitaller_${currentUser.uid}_budgets` : 'mitaller_guest_budgets';
      localStorage.setItem(key, JSON.stringify(next));
      return next;
    });
    if (currentUser) {
      await saveBudget(newBudget, currentUser.uid);
    }
  };

  const handleUpdateBudget = async (updated: Budget) => {
    setBudgets((prev) => {
      const next = prev.map((b) => (b.id === updated.id ? updated : b));
      const key = currentUser ? `mitaller_${currentUser.uid}_budgets` : 'mitaller_guest_budgets';
      localStorage.setItem(key, JSON.stringify(next));
      return next;
    });
    if (currentUser) {
      await saveBudget(updated, currentUser.uid);
    }
  };

  const handleDeleteBudget = async (budgetId: string) => {
    setBudgets((prev) => {
      const next = prev.filter((b) => b.id !== budgetId);
      const key = currentUser ? `mitaller_${currentUser.uid}_budgets` : 'mitaller_guest_budgets';
      localStorage.setItem(key, JSON.stringify(next));
      return next;
    });
    try {
      const guestRaw = localStorage.getItem('mitaller_guest_budgets');
      if (guestRaw) {
        const guestItems = JSON.parse(guestRaw);
        if (Array.isArray(guestItems)) {
          localStorage.setItem('mitaller_guest_budgets', JSON.stringify(guestItems.filter((b: any) => b.id !== budgetId)));
        }
      }
    } catch (e) {}

    if (currentUser) {
      await deleteBudget(budgetId);
    }
  };

  const handleAddMechanic = async (newMechanic: Mechanic) => {
    setMechanics((prev) => {
      const idx = prev.findIndex((m) => m.id === newMechanic.id);
      const next = idx >= 0 ? prev.map((m, i) => (i === idx ? newMechanic : m)) : [newMechanic, ...prev];
      const key = currentUser ? `mitaller_${currentUser.uid}_mechanics` : 'mitaller_guest_mechanics';
      localStorage.setItem(key, JSON.stringify(next));
      return next;
    });
    if (currentUser) {
      await saveMechanic(newMechanic, currentUser.uid);
    }
  };

  const handleDeleteMechanic = async (mechanicId: string) => {
    setMechanics((prev) => {
      const next = prev.filter((m) => m.id !== mechanicId);
      const key = currentUser ? `mitaller_${currentUser.uid}_mechanics` : 'mitaller_guest_mechanics';
      localStorage.setItem(key, JSON.stringify(next));
      return next;
    });
    try {
      const guestRaw = localStorage.getItem('mitaller_guest_mechanics');
      if (guestRaw) {
        const guestItems = JSON.parse(guestRaw);
        if (Array.isArray(guestItems)) {
          localStorage.setItem('mitaller_guest_mechanics', JSON.stringify(guestItems.filter((m: any) => m.id !== mechanicId)));
        }
      }
    } catch (e) {}

    if (currentUser) {
      await deleteMechanic(mechanicId);
    }
  };

  const handleToggleMechanicStatus = async (mechanicId: string, currentStatus: boolean) => {
    const target = mechanics.find((m) => m.id === mechanicId);
    if (target) {
      const updated = { ...target, activo: !currentStatus };
      setMechanics((prev) => {
        const next = prev.map((m) => (m.id === mechanicId ? updated : m));
        const key = currentUser ? `mitaller_${currentUser.uid}_mechanics` : 'mitaller_guest_mechanics';
        localStorage.setItem(key, JSON.stringify(next));
        return next;
      });
      if (currentUser) {
        await saveMechanic(updated, currentUser.uid);
      }
    }
  };

  const handleActivateLicense = async (code: string): Promise<boolean> => {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) return false;

    const tallerId = currentUser?.uid || 'demo-taller';
    const tallerName = workshop?.nombreTaller || currentUser?.displayName || currentUser?.email || 'Mi Taller';
    const tallerEmail = currentUser?.email || workshop?.email || undefined;

    const result = await validateAndApplyLicenseCodeInFirestore(tallerId, tallerName, cleanCode, tallerEmail);

    if (result.success) {
      if (workshop) {
        setWorkshop({
          ...workshop,
          subscription: {
            plan: 'pro',
            status: 'active',
            trialEndsAt: new Date().toISOString(),
            subscriptionEndsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            maxWorkOrders: 999999,
          },
        });
      } else {
        setWorkshop({
          id: tallerId,
          nombreTaller: tallerName,
          nombreOwner: currentUser?.displayName || 'Propietario',
          email: currentUser?.email || 'taller@mitaller.com',
          telefono: '',
          direccion: '',
          createdAt: new Date().toISOString(),
          subscription: {
            plan: 'pro',
            status: 'active',
            trialEndsAt: new Date().toISOString(),
            subscriptionEndsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            maxWorkOrders: 999999,
          },
        });
      }
      return true;
    }
    return false;
  };

  const handleNewOrderForVehicle = (client: Client, vehicle: Vehicle) => {
    setPreselectedClient(client);
    setPreselectedVehicle(vehicle);
    setShowNewWorkOrderModal(true);
  };

  const handleImportContent = async (pastedText: string) => {
    const customOrder: WorkOrder = {
      id: 'wo_imported_' + Date.now(),
      numeroOrden: 'OT-IMPORTADA',
      fechaIngreso: new Date().toISOString(),
      clienteId: 'c_imp',
      clienteNombre: 'Proyecto Importado desde Chat',
      clienteTelefono: '+54 9 11 0000-0000',
      vehiculo: {
        id: 'v_imp',
        patente: 'IMPORT',
        marca: 'Personalizado',
        modelo: 'MiTaller',
        anio: 2026,
        kilometraje: 0,
        nivelCombustible: 'Lleno',
        observacionesVisuales: 'Migrado desde chat previo.',
      },
      fallaReportada: `Contenido Importado: "${pastedText.slice(0, 150)}..."`,
      diagnosticoTecnico: pastedText,
      estado: 'ingresado',
      mecanicoAsignado: 'Asistente IA',
      servicios: [],
      totalEstimado: 0,
    };

    if (currentUser) {
      await saveWorkOrder(customOrder, currentUser.uid);
    } else {
      setWorkOrders((prev) => [customOrder, ...prev]);
    }
    setActiveTab('orders');
  };

  const activeWorkOrdersCount = workOrders.filter((o) => o.estado !== 'entregado').length;
  const lowStockCount = inventory.filter((i) => i.stockActual <= i.stockMinimo).length;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans antialiased text-slate-900 flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          workOrdersCount={activeWorkOrdersCount}
          lowStockCount={lowStockCount}
          remindersCount={remindersCount}
          onOpenImportModal={() => setShowImportModal(true)}
          onOpenGoogleSheetsModal={() => setShowGoogleSheetsModal(true)}
          onOpenWhatsAppReminders={() => setShowWhatsAppModal(true)}
          onResetDemoData={handleResetDemoData}
          currentUser={currentUser}
          workshop={workshop}
          onOpenAuth={handleOpenAuth}
          onSignOut={handleSignOut}
          onOpenClientLookup={() => setShowClientLookupModal(true)}
          onOpenMechanicsModal={() => setShowMechanicsModal(true)}
          onOpenSubscriptionModal={() => setShowSubscriptionModal(true)}
          onOpenAdminPanel={() => setShowAdminPanelModal(true)}
          onOpenDeleteData={() => setShowDeleteDataModal(true)}
          onInstallApp={() => setShowForceInstallModal(true)}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto pb-16 md:pb-0">
        {/* Guest Mode Cloud Banner */}
        {!currentUser && (
          <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white px-4 py-2 text-xs flex items-center justify-between shadow-xs z-30">
            <div className="flex items-center gap-2">
              <span className="p-1 bg-blue-500/20 rounded-md text-amber-400">
                <Building2 className="w-3.5 h-3.5" />
              </span>
              <span>
                <strong>Modo Demostración:</strong> Registra tu taller gratis para guardar tus clientes, stock y órdenes en tu propia cuenta en la nube.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleOpenAuth('login')}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1 rounded-md transition-colors flex items-center gap-1.5 text-[11px] shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Acceder / Registrar Taller
              </button>
            </div>
          </div>
        )}

        <Header
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          onNewWorkOrder={() => {
            setPreselectedClient(undefined);
            setPreselectedVehicle(undefined);
            setShowNewWorkOrderModal(true);
          }}
          onNewBudget={() => setActiveTab('budgets')}
          currentUser={currentUser}
          workshop={workshop}
          onOpenAuth={handleOpenAuth}
          onSignOut={handleSignOut}
          onOpenClientLookup={() => setShowClientLookupModal(true)}
          onInstallApp={() => setShowForceInstallModal(true)}
          onOpenSubscriptionModal={() => setShowSubscriptionModal(true)}
          onOpenGoogleSheetsModal={() => setShowGoogleSheetsModal(true)}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          workOrders={workOrders}
          clients={clients}
          inventory={inventory}
          budgets={budgets}
          onSelectOrder={setSelectedOrder}
          onNavigateTab={setActiveTab}
          isSyncing={isSyncing}
        />

        <main className="flex-1">
          {activeTab === 'dashboard' && (
            <DashboardView
              workOrders={workOrders}
              inventory={inventory}
              onSelectOrder={setSelectedOrder}
              onNewWorkOrder={() => {
                setPreselectedClient(undefined);
                setPreselectedVehicle(undefined);
                setShowNewWorkOrderModal(true);
              }}
              onNavigateTab={setActiveTab}
              onOpenGoogleSheetsModal={() => setShowGoogleSheetsModal(true)}
              onOpenWhatsAppReminders={() => setShowWhatsAppModal(true)}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              isSyncing={isSyncing}
            />
          )}

          {activeTab === 'orders' && (
            <WorkOrdersView
              workOrders={workOrders}
              onSelectOrder={setSelectedOrder}
              onNewWorkOrder={() => {
                setPreselectedClient(undefined);
                setPreselectedVehicle(undefined);
                setShowNewWorkOrderModal(true);
              }}
              onUpdateStatus={handleUpdateOrderStatus}
              onDeleteOrder={handleDeleteWorkOrder}
              onDeleteMultipleOrders={handleDeleteMultipleWorkOrders}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              isSyncing={isSyncing}
            />
          )}

          {activeTab === 'clients' && (
            <ClientsView
              clients={clients}
              onAddClient={handleAddClient}
              onUpdateClient={handleAddClient}
              onDeleteClient={handleDeleteClient}
              onNewWorkOrderForVehicle={handleNewOrderForVehicle}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
            />
          )}

          {activeTab === 'inventory' && (
            <InventoryView
              inventory={inventory}
              onAddItem={handleAddInventoryItem}
              onUpdateStock={handleUpdateStock}
              onDeleteItem={handleDeleteInventoryItem}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
            />
          )}

          {activeTab === 'budgets' && (
            <BudgetView
              budgets={budgets}
              workshop={workshop}
              onAddBudget={handleAddBudget}
              onUpdateBudget={handleUpdateBudget}
              onDeleteBudget={handleDeleteBudget}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
            />
          )}
        </main>
      </div>

      {/* Mobile Sidebar Slide-Over Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex">
          <div className="w-72 max-w-[85vw] bg-slate-900 h-full flex flex-col relative shadow-2xl overflow-y-auto">
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="absolute top-3 right-3 z-10 p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/80 border border-slate-700"
              title="Cerrar Menú"
            >
              <X className="w-5 h-5" />
            </button>
            <Sidebar
              activeTab={activeTab}
              setActiveTab={(tab) => {
                setActiveTab(tab);
                setMobileMenuOpen(false);
              }}
              workOrdersCount={activeWorkOrdersCount}
              lowStockCount={lowStockCount}
              remindersCount={remindersCount}
              onOpenImportModal={() => {
                setShowImportModal(true);
                setMobileMenuOpen(false);
              }}
              onOpenGoogleSheetsModal={() => {
                setShowGoogleSheetsModal(true);
                setMobileMenuOpen(false);
              }}
              onOpenWhatsAppReminders={() => {
                setShowWhatsAppModal(true);
                setMobileMenuOpen(false);
              }}
              currentUser={currentUser}
              workshop={workshop}
              onOpenAuth={(mode) => {
                handleOpenAuth(mode);
                setMobileMenuOpen(false);
              }}
              onSignOut={() => {
                handleSignOut();
                setMobileMenuOpen(false);
              }}
              onOpenClientLookup={() => {
                setShowClientLookupModal(true);
                setMobileMenuOpen(false);
              }}
              onOpenMechanicsModal={() => {
                setShowMechanicsModal(true);
                setMobileMenuOpen(false);
              }}
              onOpenSubscriptionModal={() => {
                setShowSubscriptionModal(true);
                setMobileMenuOpen(false);
              }}
              onOpenAdminPanel={() => {
                setShowAdminPanelModal(true);
                setMobileMenuOpen(false);
              }}
              onInstallApp={() => {
                setShowForceInstallModal(true);
                setMobileMenuOpen(false);
              }}
            />
          </div>
          <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
        </div>
      )}

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 z-40 px-1.5 py-1.5 flex items-center justify-around text-slate-400 text-[10px] font-medium">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center gap-0.5 p-1 rounded-lg ${
            activeTab === 'dashboard' ? 'text-amber-400 font-bold' : 'hover:text-white'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span>Inicio</span>
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`flex flex-col items-center gap-0.5 p-1 rounded-lg relative ${
            activeTab === 'orders' ? 'text-amber-400 font-bold' : 'hover:text-white'
          }`}
        >
          <ClipboardList className="w-5 h-5" />
          <span>Órdenes</span>
          {activeWorkOrdersCount > 0 && (
            <span className="absolute -top-1 right-1 bg-amber-500 text-slate-950 font-bold px-1 rounded-full text-[9px]">
              {activeWorkOrdersCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('clients')}
          className={`flex flex-col items-center gap-0.5 p-1 rounded-lg ${
            activeTab === 'clients' ? 'text-amber-400 font-bold' : 'hover:text-white'
          }`}
        >
          <Users className="w-5 h-5" />
          <span>Clientes</span>
        </button>

        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex flex-col items-center gap-0.5 p-1 rounded-lg relative ${
            activeTab === 'inventory' ? 'text-amber-400 font-bold' : 'hover:text-white'
          }`}
        >
          <Package className="w-5 h-5" />
          <span>Stock</span>
          {lowStockCount > 0 && (
            <span className="absolute -top-1 right-1 bg-red-500 text-white font-bold px-1 rounded-full text-[9px]">
              !
            </span>
          )}
        </button>

        {/* Subscription Plan Button for Mobile */}
        <button
          onClick={() => setShowSubscriptionModal(true)}
          className="flex flex-col items-center gap-0.5 p-1 rounded-lg text-amber-400 font-extrabold hover:text-amber-300"
        >
          <CreditCard className="w-5 h-5 text-amber-400" />
          <span>Plan</span>
        </button>

        {/* Install App Button for Mobile */}
        <button
          onClick={() => setShowForceInstallModal(true)}
          className="flex flex-col items-center gap-0.5 p-1 rounded-lg text-emerald-400 font-extrabold hover:text-emerald-300"
        >
          <Smartphone className="w-5 h-5 text-emerald-400" />
          <span>Instalar</span>
        </button>

        {/* Mobile Full Menu Drawer Trigger */}
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="flex flex-col items-center gap-0.5 p-1 rounded-lg text-slate-300 hover:text-white font-bold"
        >
          <Menu className="w-5 h-5 text-slate-300" />
          <span>Menú</span>
        </button>
      </div>

      {/* MODALS */}
      <SubscriptionModal
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        workshop={workshop}
        onActivateLicense={handleActivateLicense}
      />

      <AdminPanelModal
        isOpen={showAdminPanelModal}
        onClose={() => setShowAdminPanelModal(false)}
        currentUserEmail={currentUser?.email}
      />

      <MechanicsModal
        isOpen={showMechanicsModal}
        onClose={() => setShowMechanicsModal(false)}
        mechanics={mechanics}
        onAddMechanic={handleAddMechanic}
        onDeleteMechanic={handleDeleteMechanic}
        onToggleStatus={handleToggleMechanicStatus}
      />

      <ClientLookupModal
        isOpen={showClientLookupModal}
        onClose={() => setShowClientLookupModal(false)}
        localWorkOrders={workOrders}
      />

      {selectedOrder && (
        <WorkOrderDetailModal
          order={selectedOrder}
          inventory={inventory}
          mechanics={mechanics}
          onClose={() => setSelectedOrder(null)}
          onUpdateOrder={handleUpdateOrderDetails}
          onDeleteOrder={handleDeleteWorkOrder}
          onOpenMechanicsModal={() => setShowMechanicsModal(true)}
        />
      )}

      {showNewWorkOrderModal && (
        <NewWorkOrderModal
          clients={clients}
          mechanics={mechanics}
          inventory={inventory}
          preselectedClient={preselectedClient}
          preselectedVehicle={preselectedVehicle}
          onClose={() => setShowNewWorkOrderModal(false)}
          onCreateOrder={handleCreateWorkOrder}
          onOpenMechanicsModal={() => setShowMechanicsModal(true)}
        />
      )}

      {showImportModal && (
        <ImportChatModal
          onClose={() => setShowImportModal(false)}
          onImportContent={handleImportContent}
        />
      )}

      {showGoogleSheetsModal && (
        <GoogleSheetsImportModal
          tallerId={currentUser?.uid || workshop?.id || 'demo-taller'}
          onClose={() => setShowGoogleSheetsModal(false)}
          onImportSuccess={async (data) => {
            if (data) {
              const activeUid = currentUser?.uid;

              if (data.clients.length > 0) {
                setClients((prev) => {
                  const updated = deduplicateClients([...data.clients, ...prev]);
                  try {
                    localStorage.setItem('mitaller_guest_clients', JSON.stringify(updated));
                    if (activeUid) {
                      localStorage.setItem(`mitaller_${activeUid}_clients`, JSON.stringify(updated));
                    }
                  } catch (e) {}
                  return updated;
                });
              }
              if (data.inventory.length > 0) {
                setInventory((prev) => {
                  const invMap = new Map<string, InventoryItem>();
                  prev.forEach((i) => invMap.set(i.id, i));
                  data.inventory.forEach((i) => invMap.set(i.id, i));
                  const updated = Array.from(invMap.values());
                  try {
                    localStorage.setItem('mitaller_guest_inventory', JSON.stringify(updated));
                    if (activeUid) {
                      localStorage.setItem(`mitaller_${activeUid}_inventory`, JSON.stringify(updated));
                    }
                  } catch (e) {}
                  return updated;
                });
              }
              if (data.workOrders.length > 0) {
                setWorkOrders((prev) => {
                  const updated = deduplicateWorkOrders([...data.workOrders, ...prev]);
                  try {
                    localStorage.setItem('mitaller_guest_workOrders', JSON.stringify(updated));
                    if (activeUid) {
                      localStorage.setItem(`mitaller_${activeUid}_workOrders`, JSON.stringify(updated));
                    }
                  } catch (e) {}
                  return updated;
                });
              }

              if (activeUid) {
                try {
                  await syncLocalDataToCloud(activeUid, data);
                } catch (e) {
                  console.error('Error sincronizando datos importados con Firebase:', e);
                }
              }
            }
          }}
        />
      )}

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode={authMode}
      />

      <InstallAppBanner
        forceShow={showForceInstallModal}
        onCloseForceShow={() => setShowForceInstallModal(false)}
      />

      <WhatsAppReminderModal
        isOpen={showWhatsAppModal}
        onClose={() => setShowWhatsAppModal(false)}
        workOrders={workOrders}
        clients={clients}
        tallerNombre={workshop?.nombreTaller || 'MiTaller Mecánico'}
      />

      <DeleteDataModal
        isOpen={showDeleteDataModal}
        onClose={() => setShowDeleteDataModal(false)}
        workOrders={workOrders}
        clients={clients}
        budgets={budgets}
        inventory={inventory}
        mechanics={mechanics}
        workOrdersCount={workOrders.length}
        clientsCount={clients.length}
        budgetsCount={budgets.length}
        inventoryCount={inventory.length}
        mechanicsCount={mechanics.length}
        onClearData={handleBulkClearData}
        onDeleteSpecificWorkOrders={handleDeleteMultipleWorkOrders}
        onDeleteSpecificClients={handleDeleteMultipleClients}
        onDeleteSpecificBudgets={handleDeleteMultipleBudgets}
        onDeleteSpecificInventory={handleDeleteMultipleInventory}
        onDeleteSpecificMechanics={handleDeleteMultipleMechanics}
      />
    </div>
  );
}
