import { Search, Plus, Calendar, User, LogIn, LogOut, ShieldCheck, Sparkles, Building2, Car, Smartphone, CreditCard, Menu } from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { Workshop } from '../types/tallerya';

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
  onOpenMobileMenu?: () => void;
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
  onOpenMobileMenu,
}: HeaderProps) {
  const todayFormatted = new Date().toLocaleDateString('es-ES', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-3 sticky top-0 z-20">
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

      {/* Search Input */}
      <div className="relative flex-1 max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar patente, cliente..."
          className="w-full pl-8.5 pr-3 py-1.5 sm:py-2 bg-slate-100/80 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
        />
      </div>

      {/* Header Action Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2">
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
          <div className="hidden sm:flex items-center gap-2 bg-blue-50/80 border border-blue-200/80 px-2.5 py-1.5 rounded-xl">
            <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <div className="hidden lg:block text-left pr-1">
              <p className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[120px]">
                {workshop?.nombreTaller || 'Mi Taller'}
              </p>
              <p className="text-[10px] text-blue-700 font-medium truncate max-w-[120px]">
                {currentUser.email}
              </p>
            </div>
            <button
              onClick={onSignOut}
              title="Cerrar Sesión"
              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-1"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          /* Guest / Not Logged In -> Prompt to Register / Login */
          <div className="hidden sm:flex items-center gap-1.5">
            <button
              onClick={() => onOpenAuth('login')}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-colors flex items-center gap-1"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Ingresar</span>
            </button>
            <button
              onClick={() => onOpenAuth('register')}
              className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Registrar</span>
            </button>
          </div>
        )}

        <button
          onClick={onOpenClientLookup}
          className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 text-xs font-bold rounded-xl border border-slate-700 transition-colors shadow-xs"
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
