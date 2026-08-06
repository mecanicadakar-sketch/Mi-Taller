import React from 'react';
import {
  Wrench,
  LayoutDashboard,
  ClipboardList,
  Users,
  Package,
  FileText,
  Building2,
  LogIn,
  LogOut,
  UserPlus,
  Car,
  UserCheck,
  Phone,
  CreditCard,
  ShieldAlert,
  Smartphone,
  Download,
  Sparkles,
  FileSpreadsheet,
  MessageSquare,
  RotateCcw,
} from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { Workshop } from '../types/tallerya';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  workOrdersCount: number;
  lowStockCount: number;
  remindersCount?: number;
  onOpenImportModal: () => void;
  onOpenGoogleSheetsModal?: () => void;
  onOpenWhatsAppReminders?: () => void;
  onResetDemoData?: () => void;
  currentUser: FirebaseUser | null;
  workshop: Workshop | null;
  onOpenAuth: (mode?: 'login' | 'register') => void;
  onSignOut: () => void;
  onOpenClientLookup: () => void;
  onOpenMechanicsModal: () => void;
  onOpenSubscriptionModal: () => void;
  onOpenAdminPanel?: () => void;
  onInstallApp?: () => void;
}

export function Sidebar({
  activeTab,
  setActiveTab,
  workOrdersCount,
  lowStockCount,
  remindersCount = 0,
  onOpenImportModal,
  onOpenGoogleSheetsModal,
  onOpenWhatsAppReminders,
  onResetDemoData,
  currentUser,
  workshop,
  onOpenAuth,
  onSignOut,
  onOpenClientLookup,
  onOpenMechanicsModal,
  onOpenSubscriptionModal,
  onOpenAdminPanel,
  onInstallApp,
}: SidebarProps) {
  const menuItems = [
    {
      id: 'dashboard',
      label: 'Panel Principal',
      icon: LayoutDashboard,
    },
    {
      id: 'orders',
      label: 'Órdenes de Trabajo',
      icon: ClipboardList,
      badge: workOrdersCount > 0 ? workOrdersCount : undefined,
    },
    {
      id: 'clients',
      label: 'Clientes y Vehículos',
      icon: Users,
    },
    {
      id: 'inventory',
      label: 'Inventario / Repuestos',
      icon: Package,
      badge: lowStockCount > 0 ? `${lowStockCount} !` : undefined,
      badgeColor: 'bg-amber-500 text-white',
    },
    {
      id: 'budgets',
      label: 'Presupuestos',
      icon: FileText,
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800">
      {/* Brand Header */}
      <div className="p-4 sm:p-5 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/20">
            <Wrench className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="font-extrabold text-white text-lg tracking-tight leading-none">
              <span className="text-amber-400">Mi</span>Taller
            </h1>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">Gestión Multi-Taller</p>
            <a
              href="https://wa.me/595975635770"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 hover:text-amber-300 mt-1 transition-colors"
            >
              <Phone className="w-3 h-3 shrink-0 text-amber-400" />
              <span>Contacto: +595975635770</span>
            </a>
          </div>
        </div>
      </div>

      {/* Workshop Profile / Cloud Account Card */}
      <div className="p-3 mx-3 mt-3 bg-slate-800/90 border border-slate-700/80 rounded-xl">
        {currentUser ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Nube Sincronizada
              </span>
              <button
                onClick={onSignOut}
                className="text-[11px] text-slate-400 hover:text-red-400 flex items-center gap-1 transition-colors"
                title="Cerrar sesión"
              >
                <LogOut className="w-3 h-3" />
                Salir
              </button>
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-amber-400 shrink-0" />
              <p className="text-xs font-bold text-white truncate">
                {workshop?.nombreTaller || 'Mi Taller Mecánico'}
              </p>
            </div>
            <p className="text-[10px] text-slate-400 truncate">
              {workshop?.nombreOwner ? `Dueño: ${workshop.nombreOwner}` : currentUser.email}
            </p>
          </div>
        ) : (
          <div className="space-y-2 text-center py-0.5">
            <div className="flex items-center justify-center gap-1.5 text-amber-400 font-semibold text-xs">
              <Building2 className="w-4 h-4" />
              <span>¿Tienes tu propio taller?</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              Registra tu taller gratis para guardar tus clientes y datos en tu propia cuenta.
            </p>
            <div className="pt-1">
              <button
                onClick={() => onOpenAuth('login')}
                className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Acceder / Registrar Taller</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
        <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Módulos del Taller
        </div>

        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
                isActive
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow-md shadow-amber-500/10'
                  : 'hover:bg-slate-800/80 text-slate-400 hover:text-slate-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-5 h-5 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`px-2 py-0.5 text-xs rounded-full font-bold ${
                    item.badgeColor || (isActive ? 'bg-slate-950 text-amber-400' : 'bg-slate-800 text-slate-300')
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        <button
          onClick={onOpenMechanicsModal}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm hover:bg-slate-800/80 text-slate-400 hover:text-slate-100 transition-all"
        >
          <UserCheck className="w-5 h-5 text-amber-400" />
          <span>Mecánicos / Personal</span>
        </button>

        {onOpenWhatsAppReminders && (
          <button
            onClick={onOpenWhatsAppReminders}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-sm bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-all shadow-xs"
          >
            <div className="flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-emerald-400" />
              <span>Recordatorios WhatsApp</span>
            </div>
            {remindersCount > 0 ? (
              <span className="px-2 py-0.5 text-[10px] rounded-full font-extrabold bg-emerald-500 text-slate-950 uppercase tracking-wider animate-pulse">
                {remindersCount}
              </span>
            ) : (
              <span className="px-2 py-0.5 text-[10px] rounded-full font-extrabold bg-emerald-500/20 text-emerald-300 uppercase tracking-wider">
                AUTO
              </span>
            )}
          </button>
        )}

        {onOpenGoogleSheetsModal && (
          <button
            onClick={onOpenGoogleSheetsModal}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-sm bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition-all shadow-xs"
          >
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
              <span>Importar Google Drive</span>
            </div>
            <span className="px-2 py-0.5 text-[10px] rounded-full font-extrabold bg-emerald-500 text-slate-950 uppercase tracking-wider">
              SHEETS
            </span>
          </button>
        )}

        <button
          onClick={onOpenSubscriptionModal}
          className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent border border-amber-500/30 text-amber-300 hover:text-amber-200 hover:bg-amber-500/25 transition-all shadow-xs"
        >
          <div className="flex items-center gap-3">
            <CreditCard className="w-5 h-5 text-amber-400" />
            <span className="font-bold">Suscripción & Plan</span>
          </div>
          <span className="px-2 py-0.5 text-[10px] rounded-full font-bold bg-amber-500 text-slate-950 uppercase tracking-wider">
            {workshop?.subscription?.plan === 'pro' ? 'PRO' : 'Pagar / Plan'}
          </span>
        </button>

        {onInstallApp && (
          <button
            onClick={onInstallApp}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-sm bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-all shadow-xs"
          >
            <div className="flex items-center gap-3">
              <Smartphone className="w-5 h-5 text-emerald-400" />
              <span>Instalar App</span>
            </div>
            <span className="px-2 py-0.5 text-[10px] rounded-full font-extrabold bg-emerald-500 text-slate-950 uppercase tracking-wider">
              GRATIS
            </span>
          </button>
        )}

        {onOpenAdminPanel && (
          <button
            onClick={onOpenAdminPanel}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm hover:bg-slate-800 text-slate-400 hover:text-amber-400 border border-slate-800 transition-all shadow-xs"
          >
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
              <span className="font-semibold">Panel Administrador</span>
            </div>
            <span className="px-2 py-0.5 text-[10px] rounded-full font-bold bg-slate-800 text-amber-400 border border-amber-500/30 uppercase tracking-wider">
              Admin
            </span>
          </button>
        )}

        <div className="pt-3 border-t border-slate-800 mt-3 space-y-2">
          {onResetDemoData && (
            <button
              onClick={() => {
                if (confirm('¿Deseas restablecer la app al modo de demostración limpio original? Se eliminarán los datos guardados localmente.')) {
                  onResetDemoData();
                }
              }}
              className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all"
              title="Restablecer app a datos limpios de demostración"
            >
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-amber-500" />
                <span>Restablecer Datos Demo</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">Reset</span>
            </button>
          )}

          <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Portal para Dueños de Vehículos
          </div>
          <button
            onClick={onOpenClientLookup}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-amber-500/10 to-amber-500/5 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 transition-all shadow-xs"
          >
            <Car className="w-5 h-5 text-amber-400 shrink-0" />
            <div className="text-left">
              <span className="block leading-tight">Consulta por Patente</span>
              <span className="text-[10px] text-slate-400 font-normal">Historial online para clientes</span>
            </div>
          </button>
        </div>
      </nav>
    </aside>
  );
}
