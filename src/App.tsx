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
  saveMechanic,
  deleteMechanic,
  deleteWorkOrder,
  deleteClient,
  deleteInventoryItem,
  updateWorkshopSubscription,
  validateAndApplyLicenseCodeInFirestore,
  createWorkshopProfile
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

  // Modals State
  const [selectedOrder, setSelectedOrder] = useState<WorkOrder | null>(null);
  const [showNewWorkOrderModal, setShowNewWorkOrderModal] = useState<false | boolean>(false);
  const [showImportModal, setShowImportModal] = useState<false | boolean>(false);
  const [showGoogleSheetsModal, setShowGoogleSheetsModal] = useState<boolean>(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState<boolean>(false);

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

      if (storedClients) {
        try { setClients(JSON.parse(storedClients)); } catch (e) { setClients(INITIAL_CLIENTS); }
      } else {
        setClients(INITIAL_CLIENTS);
      }

      if (storedInventory) {
        try { setInventory(JSON.parse(storedInventory)); } catch (e) { setInventory(INITIAL_INVENTORY); }
      } else {
        setInventory(INITIAL_INVENTORY);
      }

      if (storedWorkOrders) {
        try { setWorkOrders(JSON.parse(storedWorkOrders)); } catch (e) { setWorkOrders(INITIAL_WORK_ORDERS); }
      } else {
        setWorkOrders(INITIAL_WORK_ORDERS);
      }

      if (storedBudgets) {
        try { setBudgets(JSON.parse(storedBudgets)); } catch (e) { setBudgets(INITIAL_BUDGETS); }
      } else {
        setBudgets(INITIAL_BUDGETS);
      }

      if (storedMechanics) {
        try { setMechanics(JSON.parse(storedMechanics)); } catch (e) { setMechanics(INITIAL_MECHANICS); }
      } else {
        setMechanics(INITIAL_MECHANICS);
      }
      return;
    }

    // Subscribe to Firestore for logged in user's tallerId
    const unsubscribeFirestore = subscribeToWorkshopCollections(
      currentUser.uid,
      async (data) => {
        if (data.clients.length > 0) {
          setClients(data.clients);
          localStorage.setItem(`mitaller_${currentUser.uid}_clients`, JSON.stringify(data.clients));
        } else {
          const cached = localStorage.getItem(`mitaller_${currentUser.uid}_clients`) || localStorage.getItem('mitaller_guest_clients');
          if (cached) {
            try { setClients(JSON.parse(cached)); } catch (e) {}
          }
        }

        if (data.inventory.length > 0) {
          setInventory(data.inventory);
          localStorage.setItem(`mitaller_${currentUser.uid}_inventory`, JSON.stringify(data.inventory));
        } else {
          const cached = localStorage.getItem(`mitaller_${currentUser.uid}_inventory`) || localStorage.getItem('mitaller_guest_inventory');
          if (cached) {
            try { setInventory(JSON.parse(cached)); } catch (e) {}
          }
        }

        if (data.workOrders.length > 0) {
          setWorkOrders(data.workOrders);
          localStorage.setItem(`mitaller_${currentUser.uid}_workOrders`, JSON.stringify(data.workOrders));
        } else {
          const cached = localStorage.getItem(`mitaller_${currentUser.uid}_workOrders`) || localStorage.getItem('mitaller_guest_workOrders');
          if (cached) {
            try { setWorkOrders(JSON.parse(cached)); } catch (e) {}
          }
        }

        if (data.budgets.length > 0) {
          setBudgets(data.budgets);
        }

        if (data.mechanics && data.mechanics.length > 0) {
          setMechanics(data.mechanics);
        }

        if (data.workshop) {
          setWorkshop(data.workshop);
        } else {
          // Auto-create initial workshop profile doc in Firestore if missing
          const defaultName = currentUser.displayName
            ? `Taller de ${currentUser.displayName}`
            : currentUser.email
            ? `Taller ${currentUser.email.split('@')[0]}`
            : 'Mecanica Dakar';

          const newWorkshop: Workshop = {
            id: currentUser.uid,
            nombreTaller: defaultName,
            nombreOwner: currentUser.displayName || 'Fabio Torres',
            email: currentUser.email || 'mecanicadakar@gmail.com',
            telefono: '+595975635770',
            direccion: '',
            createdAt: new Date().toISOString(),
            subscription: {
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
    if (currentUser) {
      await deleteWorkOrder(orderId);
    }
    setWorkOrders((prev) => prev.filter((o) => o.id !== orderId));
  };

  const handleDeleteClient = async (clientId: string) => {
    if (currentUser) {
      await deleteClient(clientId);
    }
    setClients((prev) => prev.filter((c) => c.id !== clientId));
  };

  // Handlers
  const handleAddClient = async (newClient: Client) => {
    if (currentUser) {
      await saveClient(newClient, currentUser.uid);
    } else {
      setClients((prev) => [newClient, ...prev]);
    }
  };

  const handleAddInventoryItem = async (newItem: InventoryItem) => {
    if (currentUser) {
      await saveInventoryItem(newItem, currentUser.uid);
    } else {
      setInventory((prev) => [newItem, ...prev]);
    }
  };

  const handleUpdateStock = async (itemId: string, newStock: number) => {
    if (currentUser) {
      await updateStock(itemId, newStock);
    } else {
      setInventory((prev) =>
        prev.map((item) => (item.id === itemId ? { ...item, stockActual: newStock } : item))
      );
    }
  };

  const handleCreateWorkOrder = async (newOrder: WorkOrder) => {
    if (currentUser) {
      await saveWorkOrder(newOrder, currentUser.uid);

      // Check client vehicle update
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
    } else {
      setWorkOrders((prev) => [newOrder, ...prev]);
      setClients((prev) => {
        const existingClientIndex = prev.findIndex((c) => c.id === newOrder.clienteId);
        if (existingClientIndex >= 0) {
          const updated = [...prev];
          const client = updated[existingClientIndex];
          const vehicleExists = client.vehiculos.some((v) => v.patente === newOrder.vehiculo.patente);
          if (!vehicleExists) {
            client.vehiculos.push(newOrder.vehiculo);
          }
          return updated;
        } else {
          const newClient: Client = {
            id: newOrder.clienteId,
            nombre: newOrder.clienteNombre,
            telefono: newOrder.clienteTelefono,
            email: '',
            vehiculos: [newOrder.vehiculo],
          };
          return [newClient, ...prev];
        }
      });
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    if (currentUser) {
      await updateWorkOrderStatus(orderId, newStatus);
    } else {
      setWorkOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, estado: newStatus } : o))
      );
    }
  };

  const handleUpdateOrderDetails = async (updated: WorkOrder) => {
    if (currentUser) {
      await saveWorkOrder(updated, currentUser.uid);
    } else {
      setWorkOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
    }
  };

  const handleAddBudget = async (newBudget: Budget) => {
    if (currentUser) {
      await saveBudget(newBudget, currentUser.uid);
    } else {
      setBudgets((prev) => [newBudget, ...prev]);
    }
  };

  const handleAddMechanic = async (newMechanic: Mechanic) => {
    if (currentUser) {
      await saveMechanic(newMechanic, currentUser.uid);
    } else {
      setMechanics((prev) => [newMechanic, ...prev]);
    }
  };

  const handleDeleteMechanic = async (mechanicId: string) => {
    if (currentUser) {
      await deleteMechanic(mechanicId);
    } else {
      setMechanics((prev) => prev.filter((m) => m.id !== mechanicId));
    }
  };

  const handleToggleMechanicStatus = async (mechanicId: string, currentStatus: boolean) => {
    const target = mechanics.find((m) => m.id === mechanicId);
    if (target) {
      const updated = { ...target, activo: !currentStatus };
      if (currentUser) {
        await saveMechanic(updated, currentUser.uid);
      } else {
        setMechanics((prev) => prev.map((m) => (m.id === mechanicId ? updated : m)));
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
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
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
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
            />
          )}

          {activeTab === 'budgets' && (
            <BudgetView
              budgets={budgets}
              onAddBudget={handleAddBudget}
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
          tallerId={workshop?.id || currentUser?.uid || 'taller_demo'}
          onClose={() => setShowGoogleSheetsModal(false)}
          onImportSuccess={(data) => {
            if (data) {
              if (data.clients.length > 0) {
                setClients((prev) => {
                  const updated = deduplicateClients([...data.clients, ...prev]);
                  try {
                    localStorage.setItem('mitaller_guest_clients', JSON.stringify(updated));
                    if (currentUser) {
                      localStorage.setItem(`mitaller_${currentUser.uid}_clients`, JSON.stringify(updated));
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
                    if (currentUser) {
                      localStorage.setItem(`mitaller_${currentUser.uid}_inventory`, JSON.stringify(updated));
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
                    if (currentUser) {
                      localStorage.setItem(`mitaller_${currentUser.uid}_workOrders`, JSON.stringify(updated));
                    }
                  } catch (e) {}
                  return updated;
                });
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
    </div>
  );
}
