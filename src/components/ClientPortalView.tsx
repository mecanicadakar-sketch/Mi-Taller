import React, { useState, useEffect } from 'react';
import { WorkOrder, Workshop, OrderStatus } from '../types/tallerya';
import { searchWorkOrdersByPatente } from '../services/tallerService';
import { resolveProximoKm } from '../services/whatsappReminderService';
import { formatDateSpanish } from '../utils/dateUtils';
import { extractOrderFinancials, isDemoMechanicName } from '../utils/orderShareUtils';
import {
  Car,
  Search,
  Wrench,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building2,
  Phone,
  Calendar,
  FileText,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Share2,
  Copy,
  Check,
  ArrowRight,
  UserCheck,
  ChevronRight,
  ShieldAlert,
  HelpCircle,
  Globe,
  ExternalLink,
  Package,
  Download,
  Smartphone
} from 'lucide-react';
import { QuickInstallGuideModal } from './QuickInstallGuideModal';

interface ClientPortalViewProps {
  initialPatente?: string;
  localWorkOrders?: WorkOrder[];
  workshopInfo?: Workshop | null;
}

export function ClientPortalView({
  initialPatente = '',
  localWorkOrders = [],
  workshopInfo,
}: ClientPortalViewProps) {
  const [activePortalTab, setActivePortalTab] = useState<'consulta' | 'auxilio'>('consulta');
  const [patenteInput, setPatenteInput] = useState(initialPatente);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [results, setResults] = useState<WorkOrder[]>([]);
  const [workshops, setWorkshops] = useState<Record<string, Workshop>>({});
  const [copiedLink, setCopiedLink] = useState(false);
  const [showInstallGuideModal, setShowInstallGuideModal] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Ensure client portal manifest is active
      const manifestLink = document.querySelector('link[rel="manifest"]');
      if (manifestLink) {
        manifestLink.setAttribute('href', '/manifest-cliente.json');
      }
      document.title = 'Consulta por Patente - MiTaller';

      if ((window as any).__pwaInstallPrompt) {
        setDeferredPrompt((window as any).__pwaInstallPrompt);
      }

      const handleBeforeInstall = (e: Event) => {
        e.preventDefault();
        (window as any).__pwaInstallPrompt = e;
        setDeferredPrompt(e);
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstall);
      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      };
    }
  }, []);

  const handleTriggerInstallPrompt = async (): Promise<boolean> => {
    const promptEvent = deferredPrompt || (typeof window !== 'undefined' ? (window as any).__pwaInstallPrompt : null);
    if (promptEvent && promptEvent.prompt) {
      promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        if (typeof window !== 'undefined') {
          (window as any).__pwaInstallPrompt = null;
        }
        return true;
      }
      return false;
    }
    return false;
  };

  const handleInstallClick = async () => {
    const promptEvent = deferredPrompt || (typeof window !== 'undefined' ? (window as any).__pwaInstallPrompt : null);
    if (promptEvent && promptEvent.prompt) {
      try {
        promptEvent.prompt();
        const { outcome } = await promptEvent.userChoice;
        if (outcome === 'accepted') {
          setDeferredPrompt(null);
          if (typeof window !== 'undefined') {
            (window as any).__pwaInstallPrompt = null;
          }
          return;
        }
      } catch (err) {
        console.warn('Install prompt error:', err);
      }
    }
    setShowInstallGuideModal(true);
  };

  useEffect(() => {
    if (initialPatente && initialPatente.trim().length >= 3) {
      executeSearch(initialPatente);
    }
  }, [initialPatente]);

  const executeSearch = async (term: string) => {
    const cleanSearch = term.trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (!cleanSearch) return;

    setSearching(true);
    setHasSearched(true);

    try {
      // Search Cloud Firestore
      const { orders: cloudOrders, workshopsMap } = await searchWorkOrdersByPatente(cleanSearch);

      // Merge local orders if matching
      const matchedLocal = localWorkOrders.filter((o) => {
        const localClean = (o.vehiculo?.patente || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        return localClean.includes(cleanSearch) || cleanSearch.includes(localClean);
      });

      const combinedMap = new Map<string, WorkOrder>();
      matchedLocal.forEach((o) => combinedMap.set(o.id, o));
      cloudOrders.forEach((o) => combinedMap.set(o.id, o));

      const finalOrders = Array.from(combinedMap.values()).sort(
        (a, b) => new Date(b.fechaIngreso).getTime() - new Date(a.fechaIngreso).getTime()
      );

      setResults(finalOrders);
      setWorkshops(workshopsMap);
    } catch (error) {
      console.error('Error searching patente:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleFormSearch = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(patenteInput);
  };

  const handleCopyPortalLink = () => {
    const baseUrl = window.location.origin + window.location.pathname;
    const cleanPat = patenteInput.trim().toUpperCase();
    const shareUrl = cleanPat ? `${baseUrl}?portal=cliente&patente=${cleanPat}` : `${baseUrl}?portal=cliente`;

    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'ingresado':
      case 'diagnostico':
        return (
          <span className="px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded-full text-xs font-bold flex items-center gap-1.5 shrink-0">
            <Clock className="w-3.5 h-3.5" /> En Diagnóstico / Ingresado
          </span>
        );
      case 'reparacion':
      case 'repuestos':
        return (
          <span className="px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-full text-xs font-bold flex items-center gap-1.5 shrink-0">
            <Wrench className="w-3.5 h-3.5 animate-spin" /> En Reparación
          </span>
        );
      case 'listo':
      case 'entregado':
        return (
          <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-bold flex items-center gap-1.5 shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5" /> ¡Vehículo Listo!
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 bg-slate-800 text-slate-300 border border-slate-700 rounded-full text-xs font-bold shrink-0">
            En Proceso
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Client Portal Header Banner */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {workshopInfo?.logoUrl ? (
              <img
                src={workshopInfo.logoUrl}
                alt="Logo Taller"
                className="h-11 max-w-[120px] object-contain rounded-2xl bg-slate-900 border border-slate-700/80 p-1 shrink-0 shadow-md"
              />
            ) : (
              <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/30 shadow-inner">
                <Car className="w-6 h-6" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-black text-lg text-white tracking-tight flex items-center gap-1.5">
                  <span className="text-amber-400 font-extrabold">MiTaller</span>
                  <span className="text-slate-500 font-light">•</span>
                  <span>{workshopInfo?.nombreTaller || 'Portal del Cliente'}</span>
                </h1>
                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold rounded-full uppercase tracking-wider">
                  Portal Seguro
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Consulta de Estado de Vehículos
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleInstallClick}
              className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 border border-amber-400"
              title="Instalar acceso rápido en Celular, Tablet o PC"
            >
              <Download className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Instalar Acceso Rápido</span>
            </button>

            <button
              type="button"
              onClick={handleCopyPortalLink}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              title="Copiar link para enviar a los clientes"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
              <span className="hidden sm:inline">{copiedLink ? '¡Link Copiado!' : 'Copiar Link del Portal'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 py-6 flex-1 w-full space-y-6">
        <div className="space-y-6">
            {/* Quick Access Card */}
            <div className="bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                  <Smartphone className="w-5 h-5 stroke-[2]" />
                </div>
                <div>
                  <p className="text-xs font-black text-white flex flex-wrap items-center gap-1.5">
                    <span>Instalá el Acceso Rápido en tu Celular, Tablet o PC</span>
                    <span className="text-[10px] bg-amber-500 text-slate-950 font-bold px-1.5 py-0.2 rounded-full">
                      PWA Gratis
                    </span>
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Agrega esta app a tu pantalla de inicio para consultar tus vehículos y servicios en cualquier momento con un solo toque.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleInstallClick}
                className="w-full sm:w-auto px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 shrink-0 active:scale-95 cursor-pointer"
              >
                <Download className="w-4 h-4 stroke-[2.5]" />
                <span>Instalar Acceso Rápido</span>
              </button>
            </div>

            {/* Search Card */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
              <div className="max-w-2xl space-y-4">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-bold border border-amber-500/20">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Consulta Directa y Segura</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Verifica el estado de tu vehículo en tiempo real
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Ingresa el dominio o patente de tu auto para conocer el historial de reparaciones, repuestos instalados y el avance actual en el taller.
                </p>

                <form onSubmit={handleFormSearch} className="flex flex-col sm:flex-row gap-2 pt-2">
                  <div className="relative flex-1">
                    <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={patenteInput}
                      onChange={(e) => setPatenteInput(e.target.value.toUpperCase())}
                      placeholder="ABCD123"
                      className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-700 text-white placeholder:text-slate-500/60 placeholder:font-normal rounded-2xl text-sm font-bold uppercase tracking-wider focus:outline-hidden focus:border-amber-400 transition-colors"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={searching}
                    className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 shrink-0"
                  >
                    {searching ? (
                      <span className="animate-pulse">Buscando...</span>
                    ) : (
                      <>
                        <Search className="w-4 h-4" />
                        <span>Buscar Estado</span>
                      </>
                    )}
                  </button>
                </form>
                <div className="pt-3 border-t border-slate-800/80 mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <p className="text-xs text-slate-400 font-medium">
                    Ingrese el Numero de patente Aui.
                  </p>
                  <a
                    href="https://tallerya.vercel.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-extrabold transition-all shadow-2xs self-start sm:self-auto"
                  >
                    <Globe className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Directorio de Servicio Para Vehículos</span>
                    <ExternalLink className="w-3 h-3 text-amber-400 shrink-0" />
                  </a>
                </div>
              </div>
            </div>

            {/* Results Section */}
            {hasSearched && (
              <div className="space-y-4">
                {searching ? (
                  <div className="text-center py-12 bg-slate-900/50 border border-slate-800 rounded-3xl">
                    <Wrench className="w-8 h-8 text-amber-400 animate-spin mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-300">Consultando registros del taller...</p>
                  </div>
                ) : results.length === 0 ? (
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-3">
                    <div className="w-12 h-12 bg-slate-800 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-white text-base">No se encontraron órdenes para la patente "{patenteInput}"</h3>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      Verifica haber ingresado la patente correctamente sin espacios ni guiones. Si tu vehículo acaba de ingresar, consulta al taller.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                      <h3 className="font-extrabold text-white text-base flex items-center gap-2">
                        <Car className="w-5 h-5 text-amber-400" />
                        <span>Resultados para Dominio {results[0]?.vehiculo?.patente?.toUpperCase()}</span>
                      </h3>
                      <span className="text-xs font-semibold text-slate-400">
                        {results.length} orden{results.length > 1 ? 'es' : ''} encontrada{results.length > 1 ? 's' : ''}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      {results.map((order) => {
                        const taller = workshops[order.tallerId] || workshopInfo;
                        const financials = extractOrderFinancials(order);
                        return (
                          <div
                            key={order.id}
                            className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-lg hover:border-slate-700 transition-all"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-mono font-bold text-slate-400">Orden #{order.id.slice(-6)}</span>
                                  {getStatusBadge(order.estado)}
                                </div>
                                <h4 className="text-lg font-black text-white mt-1">
                                  {order.vehiculo?.marca} {order.vehiculo?.modelo} {order.vehiculo?.anio ? `(${order.vehiculo.anio})` : ''}
                                </h4>
                              </div>

                              {taller && (
                                <div className="text-right text-xs text-slate-400 space-y-0.5">
                                  <p className="font-bold text-slate-200 flex items-center gap-1 justify-end">
                                    <Building2 className="w-3.5 h-3.5 text-amber-400" />
                                    <span>{taller.nombreTaller || (taller as any).nombre || 'Taller'}</span>
                                  </p>
                                  {taller.telefono && (
                                    <a
                                      href={`https://wa.me/${taller.telefono.replace(/[^0-9]/g, '')}?text=Hola,%20quisiera%20consultar%20por%20la%20orden%20${order.id.slice(-6)}%20del%20auto%20patente%20${order.vehiculo?.patente}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1 text-emerald-400 hover:underline font-medium text-[11px]"
                                    >
                                      <MessageSquare className="w-3 h-3" />
                                      <span>Enviar WhatsApp al Taller</span>
                                    </a>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Main Details Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                              <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800/80 space-y-2">
                                <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1">
                                  <FileText className="w-3 h-3 text-amber-400" />
                                  <span>Falla reportada / Diagnóstico</span>
                                </p>
                                <p className="text-slate-200 font-medium leading-relaxed">
                                  {order.fallaReportada || 'Mantenimiento preventivo / Revisión general'}
                                </p>
                              </div>

                              <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800/80 space-y-2">
                                <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-amber-400" />
                                  <span>Fechas del servicio</span>
                                </p>
                                <div className="space-y-1 text-slate-300">
                                  <p><strong className="text-slate-400">Ingreso:</strong> {formatDateSpanish(order.fechaIngreso)}</p>
                                  {order.fechaEntregaEstimada && (
                                    <p><strong className="text-slate-400">Estimado entrega:</strong> {formatDateSpanish(order.fechaEntregaEstimada)}</p>
                                  )}
                                  {order.mecanicoAsignado && !isDemoMechanicName(order.mecanicoAsignado) && (
                                    <p><strong className="text-slate-400">Mecánico asignado:</strong> <span className="text-amber-400 font-semibold">{order.mecanicoAsignado}</span></p>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Mantenimiento Preventivo Checklist if present */}
                            {order.mantenimiento && (
                              <div className="bg-emerald-950/30 border border-emerald-800/50 rounded-2xl p-4 space-y-2 text-xs">
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                  <span className="font-extrabold text-emerald-300 flex items-center gap-1.5 text-xs">
                                    <Sparkles className="w-4 h-4 text-emerald-400" />
                                    <span>Service de Mantenimiento Preventivo ({order.mantenimiento.intervaloKm?.toLocaleString() || 10000} km)</span>
                                  </span>
                                  <span className="bg-emerald-800/80 text-emerald-100 font-extrabold text-[10px] px-2.5 py-1 rounded-lg border border-emerald-600/40">
                                    Próximo Service: {resolveProximoKm(
                                      order.vehiculo?.kilometraje || 0,
                                      order.mantenimiento.proximoKmService,
                                      order.mantenimiento.intervaloKm
                                    ).toLocaleString()} km
                                  </span>
                                </div>

                                <div className="flex flex-wrap gap-1.5 pt-1">
                                  {order.mantenimiento.aceiteMotor && (
                                    <span className="bg-emerald-900/60 border border-emerald-700/60 text-emerald-200 font-medium px-2 py-0.5 rounded-md text-[11px]">
                                      ✓ Aceite Motor ({order.mantenimiento.tipoAceiteMotor || 'Sintético'})
                                    </span>
                                  )}
                                  {order.mantenimiento.filtroAceite && (
                                    <span className="bg-emerald-900/60 border border-emerald-700/60 text-emerald-200 font-medium px-2 py-0.5 rounded-md text-[11px]">
                                      ✓ Filtro Aceite
                                    </span>
                                  )}
                                  {order.mantenimiento.filtroAire && (
                                    <span className="bg-emerald-900/60 border border-emerald-700/60 text-emerald-200 font-medium px-2 py-0.5 rounded-md text-[11px]">
                                      ✓ Filtro Aire
                                    </span>
                                  )}
                                  {order.mantenimiento.filtroCombustible && (
                                    <span className="bg-emerald-900/60 border border-emerald-700/60 text-emerald-200 font-medium px-2 py-0.5 rounded-md text-[11px]">
                                      ✓ Filtro Combustible
                                    </span>
                                  )}
                                  {order.mantenimiento.filtroHabitaculo && (
                                    <span className="bg-emerald-900/60 border border-emerald-700/60 text-emerald-200 font-medium px-2 py-0.5 rounded-md text-[11px]">
                                      ✓ Filtro Habitáculo (A/A)
                                    </span>
                                  )}
                                  {order.mantenimiento.filtroCajaATF && (
                                    <span className="bg-amber-950/60 border border-amber-700/60 text-amber-200 font-medium px-2 py-0.5 rounded-md text-[11px]">
                                      ✓ Filtro Caja ATF
                                    </span>
                                  )}
                                  {order.mantenimiento.aceiteCajaAutomatica && (
                                    <span className="bg-amber-950/60 border border-amber-700/60 text-amber-200 font-medium px-2 py-0.5 rounded-md text-[11px]">
                                      ⚡ Aceite Caja Auto (ATF)
                                    </span>
                                  )}
                                  {order.mantenimiento.correaDistribucion && (
                                    <span className="bg-rose-950/60 border border-rose-700/60 text-rose-200 font-medium px-2 py-0.5 rounded-md text-[11px]">
                                      ⚡ Kit Correa Distribución
                                    </span>
                                  )}
                                  {order.mantenimiento.bujias && (
                                    <span className="bg-emerald-900/60 border border-emerald-700/60 text-emerald-200 font-medium px-2 py-0.5 rounded-md text-[11px]">
                                      ✓ Bujías de Encendido
                                    </span>
                                  )}
                                  {order.mantenimiento.pastillasFreno && (
                                    <span className="bg-emerald-900/60 border border-emerald-700/60 text-emerald-200 font-medium px-2 py-0.5 rounded-md text-[11px]">
                                      ✓ Pastillas de Freno
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Works Performed (Mano de Obra) */}
                            {financials.servicios.length > 0 && (
                              <div className="space-y-2">
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                  <Wrench className="w-3.5 h-3.5 text-amber-400" />
                                  <span>Tareas Realizadas / Mano de Obra:</span>
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {financials.servicios.map((servicio, idx) => (
                                    <div key={idx} className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60 flex items-center justify-between text-xs">
                                      <span className="text-slate-200 font-medium">{servicio.descripcion}</span>
                                      {servicio.costoManoObra > 0 ? (
                                        <span className="font-bold text-slate-300 ml-2">${servicio.costoManoObra.toLocaleString('es-AR')}</span>
                                      ) : (
                                        <span className="text-slate-500 ml-2">Incluido</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Spare parts used (Repuestos Utilizados) */}
                            {financials.repuestos.length > 0 && (
                              <div className="space-y-2">
                                <p className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                                  <Package className="w-3.5 h-3.5 text-amber-400" />
                                  <span>Repuestos e Insumos Utilizados ({financials.repuestos.length}):</span>
                                </p>
                                <div className="bg-slate-950/70 rounded-2xl border border-slate-800/80 overflow-hidden text-xs">
                                  <table className="w-full text-left">
                                    <thead className="bg-slate-800/50 text-slate-400 font-bold border-b border-slate-800">
                                      <tr>
                                        <th className="py-2.5 px-3">Repuesto / Detalle</th>
                                        <th className="py-2.5 px-3 text-center">Cant</th>
                                        <th className="py-2.5 px-3 text-right">P. Unitario</th>
                                        <th className="py-2.5 px-3 text-right">Subtotal</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/60">
                                      {financials.repuestos.map((r, rIdx) => (
                                        <tr key={rIdx} className="hover:bg-slate-900/50">
                                          <td className="py-2.5 px-3 text-slate-200 font-semibold">
                                            <div className="flex items-center gap-1.5">
                                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                                              <span>{r.nombre}</span>
                                            </div>
                                            {r.servicioDescripcion && r.servicioDescripcion !== 'Repuestos e Insumos' && (
                                              <span className="text-[10px] text-slate-400 block pl-3">
                                                Para: {r.servicioDescripcion}
                                              </span>
                                            )}
                                          </td>
                                          <td className="py-2.5 px-3 text-center font-bold text-amber-400">
                                            {r.cantidad}
                                          </td>
                                          <td className="py-2.5 px-3 text-right text-slate-400">
                                            ${r.precioUnitario.toLocaleString('es-AR')}
                                          </td>
                                          <td className="py-2.5 px-3 text-right font-bold text-white">
                                            ${r.subtotal.toLocaleString('es-AR')}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}

                            {/* Footer Summary with Discriminated Totals */}
                            <div className="space-y-2 pt-3 border-t border-slate-800/80 text-xs">
                              <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950/60 p-3 rounded-2xl border border-slate-800/60">
                                <div className="space-y-1 text-slate-400">
                                  {financials.totalManoObra > 0 && (
                                    <p>Mano de Obra: <strong className="text-slate-200">${financials.totalManoObra.toLocaleString('es-AR')}</strong></p>
                                  )}
                                  {financials.totalRepuestos > 0 && (
                                    <p>Repuestos e Insumos: <strong className="text-amber-400">${financials.totalRepuestos.toLocaleString('es-AR')}</strong></p>
                                  )}
                                </div>

                                {financials.totalGeneral > 0 && (
                                  <div className="text-right">
                                    <span className="text-slate-400 mr-2 text-xs">Total del Servicio:</span>
                                    <span className="text-xl font-black text-amber-400">${financials.totalGeneral.toLocaleString('es-AR')}</span>
                                  </div>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500">
                                Estado e información sincronizados en tiempo real por el sistema de gestión del taller.
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 py-4 px-4 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-3 max-w-6xl mx-auto w-full">
        <p>© {new Date().getFullYear()} {workshopInfo?.nombreTaller || 'MiTaller'} — Portal para Clientes & Conductores</p>
        <button
          type="button"
          onClick={handleInstallClick}
          className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Instalar Acceso Rápido (Celular, Tablet o PC)</span>
        </button>
      </footer>

      <QuickInstallGuideModal
        isOpen={showInstallGuideModal}
        onClose={() => setShowInstallGuideModal(false)}
        onTriggerInstallPrompt={handleTriggerInstallPrompt}
        canPromptDirectly={Boolean(deferredPrompt || (typeof window !== 'undefined' && (window as any).__pwaInstallPrompt))}
        customUrl={typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}?portal=cliente` : 'https://mitallerpy.vercel.app/?portal=cliente'}
        portalOnly={true}
      />
    </div>
  );
}
