import { useState, useRef, useEffect } from 'react';
import {
  Search,
  Plus,
  LogIn,
  LogOut,
  Building2,
  Car,
  Smartphone,
  CreditCard,
  Menu,
  X,
  ClipboardList,
  Users,
  Package,
  FileText,
  FileSpreadsheet,
  RefreshCw,
  Sparkles,
  Share2,
  Settings,
} from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { Workshop, WorkOrder, Client, InventoryItem, Budget } from '../types/tallerya';
import { matchesQuery } from '../utils/searchUtils';

interface HeaderProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onNewWorkOrder: () => void;
  onNewBudget: () => void;
  currentUser: FirebaseUser | null;
  workshop: Workshop | null;
  onOpenAuth: (mode?: 'login' | 'register') => void;
  onSignOut: () => void;
  onOpenClientLookup: () => void;
  onInstallApp?: () => void;
  onOpenSubscriptionModal: () => void;
  onOpenGoogleSheetsModal?: () => void;
  onOpenMobileMenu?: () => void;
  workOrders?: WorkOrder[];
  clients?: Client[];
  inventory?: InventoryItem[];
  budgets?: Budget[];
  onSelectOrder?: (order: WorkOrder) => void;
  onNavigateTab?: (tab: string) => void;
  isSyncing?: boolean;
  onOpenGuideAssistant?: () => void;
  onCopyClientPortalLink?: () => void;
  onOpenClientPortal?: () => void;
}

export function Header({
  searchTerm,
  setSearchTerm,
  onNewWorkOrder,
  onNewBudget,
  currentUser,
  workshop,
  onOpenAuth,
  onSignOut,
  onOpenClientLookup,
  onInstallApp,
  onOpenSubscriptionModal,
  onOpenGoogleSheetsModal,
  onOpenMobileMenu,
  workOrders = [],
  clients = [],
  inventory = [],
  budgets = [],
  onSelectOrder,
  onNavigateTab,
  isSyncing = false,
  onOpenGuideAssistant,
  onCopyClientPortalLink,
  onOpenClientPortal,
}: HeaderProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const cleanQuery = searchTerm.trim();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter matches
  const matchingOrders = cleanQuery
    ? workOrders.filter(
        (o) =>
          matchesQuery(o.numeroOrden, cleanQuery) ||
          matchesQuery(o.vehiculo?.patente, cleanQuery) ||
          matchesQuery(o.clienteNombre, cleanQuery) ||
          matchesQuery(o.vehiculo?.marca, cleanQuery) ||
          matchesQuery(o.vehiculo?.modelo, cleanQuery) ||
          matchesQuery(o.fallaReportada, cleanQuery)
      )
    : [];

  const matchingClients = cleanQuery
    ? clients.filter(
        (c) =>
          matchesQuery(c.nombre, cleanQuery) ||
          matchesQuery(c.telefono, cleanQuery) ||
          matchesQuery(c.email, cleanQuery) ||
          c.vehiculos?.some(
            (v) =>
              matchesQuery(v.patente, cleanQuery) ||
              matchesQuery(v.marca, cleanQuery) ||
              matchesQuery(v.modelo, cleanQuery)
          )
      )
    : [];

  const matchingInventory = cleanQuery
    ? inventory.filter(
        (i) =>
          matchesQuery(i.nombre, cleanQuery) ||
          matchesQuery(i.codigo, cleanQuery) ||
          matchesQuery(i.categoria, cleanQuery) ||
          matchesQuery(i.ubicacion, cleanQuery)
      )
    : [];

  const matchingBudgets = cleanQuery
    ? budgets.filter(
        (b) =>
          matchesQuery(b.numeroPresupuesto, cleanQuery) ||
          matchesQuery(b.clienteNombre, cleanQuery) ||
          matchesQuery(b.vehiculoInfo, cleanQuery) ||
          b.items?.some((it) => matchesQuery(it.descripcion, cleanQuery))
      )
    : [];

  const totalResults =
    matchingOrders.length +
    matchingClients.length +
    matchingInventory.length +
    matchingBudgets.length;

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-3 sticky top-0 z-30">
      {/* Mobile Menu Toggle Button */}
      {onOpenMobileMenu && (
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 text-slate-700 hover:bg-slate-100 rounded-xl border border-slate-200 shrink-0"
          title="Abrir Menú de Opciones"
        >
          <Menu className="w-5 h-5 text-slate-800" />
        </button>
      )}

      {/* Search Input Container */}
      <div ref={searchContainerRef} className="relative flex-1 max-w-md">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onFocus={() => setShowDropdown(true)}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setShowDropdown(true);
            }}
            placeholder="Buscar patente, cliente, orden..."
            className="w-full pl-9 pr-8 py-1.5 sm:py-2 bg-slate-100/80 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm('');
                setShowDropdown(false);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-200"
              title="Limpiar búsqueda"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Live Search Results Popover Dropdown */}
        {showDropdown && cleanQuery.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden max-h-[80vh] sm:max-h-96 overflow-y-auto divide-y divide-slate-100">
            {totalResults === 0 ? (
              <div className="p-4 text-center text-slate-500 text-xs">
                No se encontraron resultados para "<span className="font-semibold text-slate-800">{cleanQuery}</span>".
              </div>
            ) : (
              <>
                {/* Work Orders Section */}
                {matchingOrders.length > 0 && (
                  <div className="p-2 space-y-1">
                    <div className="px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <ClipboardList className="w-3.5 h-3.5 text-blue-500" />
                        Órdenes de Trabajo ({matchingOrders.length})
                      </span>
                      {onNavigateTab && (
                        <button
                          onClick={() => {
                            onNavigateTab('orders');
                            setShowDropdown(false);
                          }}
                          className="text-amber-600 hover:underline capitalize"
                        >
                          Ver todas
                        </button>
                      )}
                    </div>
                    {matchingOrders.slice(0, 4).map((order) => (
                      <div
                        key={order.id}
                        onClick={() => {
                          if (onSelectOrder) onSelectOrder(order);
                          setShowDropdown(false);
                        }}
                        className="p-2 hover:bg-slate-50 rounded-xl cursor-pointer flex items-center justify-between text-xs transition-colors"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{order.numeroOrden}</span>
                            <span className="px-1.5 py-0.2 bg-slate-900 text-amber-400 font-mono font-bold text-[10px] rounded">
                              {order.vehiculo?.patente}
                            </span>
                          </div>
                          <p className="text-slate-600 text-[11px] line-clamp-1">
                            {order.vehiculo?.marca} {order.vehiculo?.modelo} — {order.clienteNombre}
                          </p>
                        </div>
                        <span className="px-2 py-0.5 text-[10px] font-semibold bg-blue-50 text-blue-700 rounded-full border border-blue-200 uppercase">
                          {order.estado}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Clients Section */}
                {matchingClients.length > 0 && (
                  <div className="p-2 space-y-1">
                    <div className="px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-emerald-500" />
                        Clientes ({matchingClients.length})
                      </span>
                      {onNavigateTab && (
                        <button
                          onClick={() => {
                            onNavigateTab('clients');
                            setShowDropdown(false);
                          }}
                          className="text-amber-600 hover:underline capitalize"
                        >
                          Ver todos
                        </button>
                      )}
                    </div>
                    {matchingClients.slice(0, 3).map((client) => (
                      <div
                        key={client.id}
                        onClick={() => {
                          if (onNavigateTab) onNavigateTab('clients');
                          setShowDropdown(false);
                        }}
                        className="p-2 hover:bg-slate-50 rounded-xl cursor-pointer flex items-center justify-between text-xs transition-colors"
                      >
                        <div>
                          <p className="font-bold text-slate-900">{client.nombre}</p>
                          <p className="text-slate-500 text-[11px]">{client.telefono || 'Sin teléfono'}</p>
                        </div>
                        {client.vehiculos && client.vehiculos.length > 0 && (
                          <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-lg font-mono">
                            {client.vehiculos[0].patente}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Inventory Section */}
                {matchingInventory.length > 0 && (
                  <div className="p-2 space-y-1">
                    <div className="px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-amber-500" />
                        Repuestos ({matchingInventory.length})
                      </span>
                      {onNavigateTab && (
                        <button
                          onClick={() => {
                            onNavigateTab('inventory');
                            setShowDropdown(false);
                          }}
                          className="text-amber-600 hover:underline capitalize"
                        >
                          Ver todos
                        </button>
                      )}
                    </div>
                    {matchingInventory.slice(0, 3).map((item) => (
                      <div
                        key={item.id}
                        onClick={() => {
                          if (onNavigateTab) onNavigateTab('inventory');
                          setShowDropdown(false);
                        }}
                        className="p-2 hover:bg-slate-50 rounded-xl cursor-pointer flex items-center justify-between text-xs transition-colors"
                      >
                        <div>
                          <p className="font-bold text-slate-900">{item.nombre}</p>
                          <p className="text-slate-500 text-[11px]">Cód: {item.codigo}</p>
                        </div>
                        <span className="font-bold text-slate-800 text-[11px]">
                          Stock: {item.stockActual}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Budgets Section */}
                {matchingBudgets.length > 0 && (
                  <div className="p-2 space-y-1">
                    <div className="px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-purple-500" />
                        Presupuestos ({matchingBudgets.length})
                      </span>
                      {onNavigateTab && (
                        <button
                          onClick={() => {
                            onNavigateTab('budgets');
                            setShowDropdown(false);
                          }}
                          className="text-amber-600 hover:underline capitalize"
                        >
                          Ver todos
                        </button>
                      )}
                    </div>
                    {matchingBudgets.slice(0, 3).map((budget) => (
                      <div
                        key={budget.id}
                        onClick={() => {
                          if (onNavigateTab) onNavigateTab('budgets');
                          setShowDropdown(false);
                        }}
                        className="p-2 hover:bg-slate-50 rounded-xl cursor-pointer flex items-center justify-between text-xs transition-colors"
                      >
                        <div>
                          <p className="font-bold text-slate-900">{budget.numeroPresupuesto}</p>
                          <p className="text-slate-500 text-[11px]">{budget.clienteNombre}</p>
                        </div>
                        <span className="font-bold text-emerald-700 text-[11px]">
                          ${budget.total?.toLocaleString('es-AR')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Header Action Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Syncing Indicator Badge */}
        {isSyncing && (
          <div
            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50/90 border border-blue-300 text-blue-900 font-bold text-[11px] sm:text-xs rounded-xl shadow-2xs shrink-0 animate-pulse"
            title="Sincronizando datos con Firebase..."
          >
            <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin shrink-0" />
            <span className="hidden sm:inline">Sincronizando...</span>
          </div>
        )}

        {/* Guide Assistant Button */}
        {onOpenGuideAssistant && (
          <button
            onClick={onOpenGuideAssistant}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 font-bold text-xs rounded-xl border border-amber-500/40 transition-colors shadow-xs shrink-0"
            title="Guía de uso de la aplicación"
          >
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="hidden sm:inline">Guía Asistente</span>
            <span className="sm:hidden font-extrabold text-[11px] text-amber-800">Guía</span>
          </button>
        )}

        {/* Subscription Button (Visible on Mobile & Desktop) */}
        <button
          onClick={onOpenSubscriptionModal}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 font-bold text-xs rounded-xl border border-amber-500/40 transition-colors shadow-xs shrink-0"
          title="Suscripción & Plan"
        >
          <CreditCard className="w-4 h-4 text-amber-600 shrink-0" />
          <span className="hidden sm:inline">Suscripción</span>
          <span className="sm:hidden font-extrabold text-[11px] text-amber-700">Plan</span>
        </button>

        {/* Install App Button (Visible on Mobile & Desktop) */}
        {onInstallApp && (
          <button
            onClick={onInstallApp}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-900 font-bold text-xs rounded-xl border border-emerald-500/40 transition-colors shadow-xs shrink-0"
            title="Instala MiTaller en tu Celular o PC"
          >
            <Smartphone className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="hidden sm:inline">Instalar App</span>
            <span className="sm:hidden font-extrabold text-[11px] text-emerald-700">App</span>
          </button>
        )}

        {/* Workshop Profile / Multi-Tenant Auth Header Controls */}
        {currentUser ? (
          /* Logged In Workshop Badge */
          <div className="hidden sm:flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2.5 py-1.5 rounded-xl">
            <button
              type="button"
              onClick={() => onNavigateTab?.('settings')}
              className="flex items-center gap-2 text-left hover:opacity-90 transition-opacity cursor-pointer"
              title="Configurar Taller y Logo"
            >
              {workshop?.logoUrl ? (
                <img
                  src={workshop.logoUrl}
                  alt="Logo Taller"
                  className="w-7 h-7 object-contain rounded-lg border border-slate-700 bg-slate-950 p-0.5 shrink-0"
                />
              ) : (
                <div className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-black text-xs shrink-0">
                  <Building2 className="w-4 h-4" />
                </div>
              )}
              <div className="hidden lg:block text-left pr-1">
                <p className="text-xs font-bold text-white leading-tight truncate max-w-[110px]">
                  {workshop?.nombreTaller || 'Mi Taller'}
                </p>
                <p className="text-[10px] text-amber-400 font-medium truncate max-w-[110px]">
                  Configurar Taller
                </p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab?.('settings')}
              className="p-1 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Ajustes del Taller"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onSignOut}
              title="Cerrar Sesión"
              className="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors ml-0.5 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          /* Single unified Access / Register button */
          <div className="hidden sm:flex items-center">
            <button
              onClick={() => onOpenAuth('login')}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Acceder / Registrarse</span>
            </button>
          </div>
        )}

        {onCopyClientPortalLink && (
          <button
            onClick={onCopyClientPortalLink}
            className="hidden xl:inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-400 text-xs font-bold rounded-xl border border-emerald-800 transition-colors shadow-xs"
            title="Copiar link para enviar a clientes por WhatsApp"
          >
            <Share2 className="w-4 h-4 text-emerald-400" />
            <span>Link Clientes</span>
          </button>
        )}

        <button
          onClick={onOpenClientLookup}
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 text-xs font-bold rounded-xl border border-slate-700 transition-colors shadow-xs"
          title="Consulta el estado de tu auto por patente"
        >
          <Car className="w-4 h-4 text-amber-400" />
          <span>Patente</span>
        </button>

        <button
          onClick={onNewWorkOrder}
          className="inline-flex items-center gap-1 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-all active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span className="hidden xs:inline">Nueva Órden</span>
          <span className="xs:hidden font-extrabold">+OT</span>
        </button>
      </div>
    </header>
  );
}

