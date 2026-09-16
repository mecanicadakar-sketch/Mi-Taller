import React, { useState, useEffect } from 'react';
import { WorkOrder, Workshop, OrderStatus, Mechanic } from '../types/tallerya';
import { searchWorkOrdersByPatente } from '../services/tallerService';
import { resolveProximoKm } from '../services/whatsappReminderService';
import { formatDateSpanish } from '../utils/dateUtils';
import { extractOrderFinancials, resolveAssignedMechanic } from '../utils/orderShareUtils';
import {
  Car,
  Search,
  X,
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
  ChevronRight,
  Printer,
  Sparkles,
  Globe,
  ExternalLink,
  Package,
  Download,
  Smartphone
} from 'lucide-react';
import { QuickInstallGuideModal } from './QuickInstallGuideModal';

interface ClientLookupModalProps {
  isOpen: boolean;
  onClose: () => void;
  localWorkOrders?: WorkOrder[];
  mechanics?: Mechanic[];
  onOpenAuxilioIA?: () => void;
  onInstallApp?: () => void;
}

export function ClientLookupModal({ isOpen, onClose, localWorkOrders = [], mechanics = [], onOpenAuxilioIA, onInstallApp }: ClientLookupModalProps) {
  const [patenteInput, setPatenteInput] = useState('');
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [results, setResults] = useState<WorkOrder[]>([]);
  const [workshops, setWorkshops] = useState<Record<string, Workshop>>({});
  const [showInstallGuideModal, setShowInstallGuideModal] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (navigator as any).standalone === true;
      setIsStandalone(standalone);

      // If modal is open, ensure the client manifest is active for any install action
      if (isOpen) {
        const manifestLink = document.querySelector('link[rel="manifest"]');
        if (manifestLink) {
          manifestLink.setAttribute('href', '/manifest-cliente.json');
        }
      }

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
        if (isOpen) {
          const manifestLink = document.querySelector('link[rel="manifest"]');
          if (manifestLink) {
            manifestLink.setAttribute('href', '/manifest.json');
          }
        }
      };
    }
  }, [isOpen]);

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

  if (!isOpen) return null;

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanSearch = patenteInput.trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (!cleanSearch) return;

    setSearching(true);
    setHasSearched(true);

    try {
      // Search online Firestore
      const { orders: cloudOrders, workshopsMap } = await searchWorkOrdersByPatente(cleanSearch);

      // Merge local orders if any matched local state
      const matchedLocal = localWorkOrders.filter((o) => {
        const localClean = (o.vehiculo?.patente || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        return localClean.includes(cleanSearch) || cleanSearch.includes(localClean);
      });

      // Combine results removing duplicates by id
      const combinedMap = new Map<string, WorkOrder>();
      matchedLocal.forEach((o) => combinedMap.set(o.id, o));
      cloudOrders.forEach((o) => combinedMap.set(o.id, o));

      const finalOrders = Array.from(combinedMap.values()).sort(
        (a, b) => new Date(b.fechaIngreso).getTime() - new Date(a.fechaIngreso).getTime()
      );

      setResults(finalOrders);
      setWorkshops(workshopsMap);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setSearching(false);
    }
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'ingresado':
      case 'diagnostico':
        return <span className="px-2.5 py-1 bg-blue-100 text-blue-800 rounded-lg text-xs font-bold">Ingresado al Taller</span>;
      case 'reparacion':
      case 'repuestos':
        return <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-lg text-xs font-bold">En Reparación</span>;
      case 'listo':
      case 'entregado':
        return <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold flex items-center gap-1">¡Listo / Entregado!</span>;
      default:
        return <span className="px-2.5 py-1 bg-blue-100 text-blue-800 rounded-lg text-xs font-bold">Ingresado al Taller</span>;
    }
  };

  const vehicleInfo = results.length > 0 ? results[0].vehiculo : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[90vh]">
        {/* Header Banner */}
        <div className="bg-slate-900 text-white p-4 sm:p-6 relative shrink-0 border-b border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-10 sm:pr-12">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-500 text-slate-950 rounded-xl font-bold shadow-md shrink-0">
                <Car className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                    Consulta por Patente
                  </h2>
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-md border border-emerald-500/30">
                    ONLINE
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Consulta el estado de tu auto y tu libreta de servicios ingresando la patente
                </p>
              </div>
            </div>

            {/* Install Quick Access Button in Header */}
            <button
              type="button"
              onClick={handleInstallClick}
              className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-md shadow-amber-500/10 transition-all flex items-center justify-center gap-2 shrink-0 active:scale-95 cursor-pointer border border-amber-400/80"
              title="Instalar acceso rápido en Celular, Tablet o PC"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              <span>Instalar Acceso Rápido</span>
              <span className="hidden md:inline-block px-1.5 py-0.5 bg-slate-950/15 text-slate-950 rounded text-[9px] font-black uppercase">
                Móvil / PC
              </span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Container */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50">
          {/* Search Bar Input */}
          <form onSubmit={handleSearch} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Ingresa la Patente de tu Vehículo
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  required
                  value={patenteInput}
                  onChange={(e) => setPatenteInput(e.target.value)}
                  placeholder="ABCD123"
                  className="w-full px-4 py-2.5 bg-slate-100 border-2 border-slate-300 focus:border-amber-500 rounded-xl text-base font-extrabold uppercase font-mono tracking-wider text-slate-900 placeholder:text-slate-400/50 placeholder:font-normal focus:outline-hidden"
                />
              </div>
              <button
                type="submit"
                disabled={searching}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl shadow-sm transition-colors text-sm flex items-center gap-2 shrink-0 disabled:opacity-60"
              >
                {searching ? (
                  <span>Buscando...</span>
                ) : (
                  <>
                    <Search className="w-4 h-4 stroke-[2.5]" />
                    <span>Buscar</span>
                  </>
                )}
              </button>
            </div>

            <div className="pt-3 border-t border-slate-200/80 mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <p className="text-xs text-slate-500 font-medium">
                Ingrese el Numero de patente Aui.
              </p>
              <a
                href="https://tallerya.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 border border-amber-500/30 rounded-xl text-xs font-extrabold transition-all shadow-2xs self-start sm:self-auto"
              >
                <Globe className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Directorio de Servicio Para Vehículos</span>
                <ExternalLink className="w-3 h-3 text-amber-600 shrink-0" />
              </a>
            </div>
          </form>

          {/* Quick Access Card */}
          <div className="bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-amber-500/5 border border-amber-500/30 rounded-2xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-700 flex items-center justify-center shrink-0">
                <Smartphone className="w-5 h-5 stroke-[2]" />
              </div>
              <div>
                <p className="text-xs font-black text-slate-900 flex flex-wrap items-center gap-1.5">
                  <span>Acceso Rápido en tu Celular, Tablet o PC</span>
                  <span className="text-[10px] bg-amber-500 text-slate-950 font-bold px-1.5 py-0.2 rounded-full">
                    Sin escribir la web
                  </span>
                </p>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Guarda la consulta en tu pantalla de inicio para verificar el estado de tu vehículo con un solo toque.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleInstallClick}
              className="w-full sm:w-auto px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 shrink-0 active:scale-95 cursor-pointer"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              <span>Instalar en Dispositivo</span>
            </button>
          </div>

          {/* Results Area */}
          {hasSearched && !searching && (
            <div>
              {results.length === 0 ? (
                <div className="bg-white p-8 rounded-xl border border-slate-200 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-base">No se encontraron trabajos para esa patente</h3>
                  <p className="text-xs text-slate-600 max-w-md mx-auto">
                    Verifica que la patente esté escrita correctamente. Si tu auto acaba de ingresar al taller, el taller puede tardar unos minutos en registrar la órden.
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Vehicle Header Card */}
                  {vehicleInfo && (
                    <div className="bg-slate-900 text-white rounded-xl p-4 sm:p-5 flex items-center justify-between shadow-md">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                          Vehículo Consultado
                        </span>
                        <h3 className="text-xl font-black text-white flex items-center gap-2">
                          {vehicleInfo.marca} {vehicleInfo.modelo} ({vehicleInfo.anio})
                        </h3>
                        <p className="text-xs text-slate-300 mt-1 flex items-center gap-3">
                          <span>Km: <strong>{vehicleInfo.kilometraje.toLocaleString()} km</strong></span>
                          <span>Combustible: <strong>{vehicleInfo.nivelCombustible}</strong></span>
                        </p>
                      </div>
                      <div className="bg-white text-slate-900 font-mono font-black text-lg px-3 py-1.5 rounded-lg border-2 border-amber-400 tracking-wider shadow-inner">
                        {vehicleInfo.patente}
                      </div>
                    </div>
                  )}

                  {/* Work Orders List */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center justify-between">
                      <span>Historial de Servicios ({results.length})</span>
                      <span className="text-[11px] font-normal text-slate-600">Ordenado por fecha</span>
                    </h4>

                    {results.map((order) => {
                      const workshopInfo = order.tallerId ? workshops[order.tallerId] : null;
                      const financials = extractOrderFinancials(order);

                      return (
                        <div
                          key={order.id}
                          className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 sm:p-5 space-y-4 transition-all hover:border-slate-300"
                        >
                          {/* Order Header */}
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-slate-900 text-base">{order.numeroOrden}</span>
                                {getStatusBadge(order.estado)}
                              </div>
                              <p className="text-xs text-slate-600 flex items-center gap-1 mt-1">
                                <Calendar className="w-3.5 h-3.5" />
                                <span>Ingreso: {formatDateSpanish(order.fechaIngreso)}</span>
                                {(() => {
                                  const displayMechanic = resolveAssignedMechanic(order.mecanicoAsignado, mechanics);
                                  return displayMechanic ? (
                                    <span className="ml-2 font-medium text-slate-700">| Mecánico: {displayMechanic}</span>
                                  ) : null;
                                })()}
                              </p>
                            </div>

                            {/* Workshop contact info */}
                            {workshopInfo && (
                              <div className="text-right text-xs">
                                <p className="font-bold text-slate-900 flex items-center justify-end gap-1">
                                  <Building2 className="w-3.5 h-3.5 text-blue-600" />
                                  {workshopInfo.nombreTaller}
                                </p>
                                {workshopInfo.telefono && (
                                  <a
                                    href={`https://wa.me/${workshopInfo.telefono.replace(/[^0-9]/g, '')}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:underline mt-0.5"
                                  >
                                    <Phone className="w-3 h-3" />
                                    Contactar por WhatsApp
                                  </a>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Fault / Reason */}
                          <div>
                            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                              Falla Reportada / Motivo de Ingreso
                            </span>
                            <p className="text-xs text-slate-800 bg-slate-50 p-2.5 rounded-lg border border-slate-100 font-medium">
                              {order.fallaReportada}
                            </p>
                          </div>

                          {/* Technical Diagnosis */}
                          {order.diagnosticoTecnico && (
                            <div>
                              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                                Diagnóstico del Mecánico
                              </span>
                              <p className="text-xs text-slate-800 bg-amber-50/50 p-2.5 rounded-lg border border-amber-100 font-medium">
                                {order.diagnosticoTecnico}
                              </p>
                            </div>
                          )}

                          {/* Mantenimiento Preventivo & Service Log */}
                          {order.mantenimiento && (
                            <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3.5 space-y-2 text-xs">
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <span className="font-extrabold text-emerald-950 flex items-center gap-1.5 text-xs">
                                  <Sparkles className="w-4 h-4 text-emerald-600" />
                                  Service de Mantenimiento Preventivo ({order.mantenimiento.intervaloKm?.toLocaleString() || 10000} km)
                                </span>
                                {order.mantenimiento && (
                                  <span className="bg-emerald-700 text-white font-extrabold text-[10px] px-2.5 py-1 rounded-lg shadow-xs">
                                    Próximo Service: {resolveProximoKm(
                                      order.vehiculo?.kilometraje || 0,
                                      order.mantenimiento.proximoKmService,
                                      order.mantenimiento.intervaloKm
                                    ).toLocaleString()} km
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {order.mantenimiento.aceiteMotor && (
                                  <span className="bg-white border border-emerald-300 text-emerald-900 font-semibold px-2 py-0.5 rounded-md text-[11px]">
                                    ✓ Aceite Motor ({order.mantenimiento.tipoAceiteMotor || 'Sintético'})
                                  </span>
                                )}
                                {order.mantenimiento.filtroAceite && (
                                  <span className="bg-white border border-emerald-300 text-emerald-900 font-semibold px-2 py-0.5 rounded-md text-[11px]">
                                    ✓ Filtro Aceite
                                  </span>
                                )}
                                {order.mantenimiento.filtroAire && (
                                  <span className="bg-white border border-emerald-300 text-emerald-900 font-semibold px-2 py-0.5 rounded-md text-[11px]">
                                    ✓ Filtro Aire
                                  </span>
                                )}
                                {order.mantenimiento.filtroCombustible && (
                                  <span className="bg-white border border-emerald-300 text-emerald-900 font-semibold px-2 py-0.5 rounded-md text-[11px]">
                                    ✓ Filtro Combustible
                                  </span>
                                )}
                                {order.mantenimiento.filtroHabitaculo && (
                                  <span className="bg-white border border-emerald-300 text-emerald-900 font-semibold px-2 py-0.5 rounded-md text-[11px]">
                                    ✓ Filtro Habitáculo (A/A)
                                  </span>
                                )}
                                {order.mantenimiento.filtroCajaATF && (
                                  <span className="bg-amber-100 border border-amber-300 text-amber-950 font-bold px-2 py-0.5 rounded-md text-[11px]">
                                    ✓ Filtro Caja ATF
                                  </span>
                                )}
                                {order.mantenimiento.aceiteCajaAutomatica && (
                                  <span className="bg-amber-100 border border-amber-300 text-amber-950 font-bold px-2 py-0.5 rounded-md text-[11px]">
                                    ⚡ Aceite Caja Auto (ATF)
                                  </span>
                                )}
                                {order.mantenimiento.correaDistribucion && (
                                  <span className="bg-rose-100 border border-rose-300 text-rose-950 font-bold px-2 py-0.5 rounded-md text-[11px]">
                                    ⚡ Kit Correa Distribución
                                  </span>
                                )}
                                {order.mantenimiento.bujias && (
                                  <span className="bg-white border border-emerald-300 text-emerald-900 font-semibold px-2 py-0.5 rounded-md text-[11px]">
                                    ✓ Bujías de Encendido
                                  </span>
                                )}
                                {order.mantenimiento.pastillasFreno && (
                                  <span className="bg-white border border-emerald-300 text-emerald-900 font-semibold px-2 py-0.5 rounded-md text-[11px]">
                                    ✓ Pastillas de Freno
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Services (Mano de Obra) */}
                          {financials.servicios.length > 0 && (
                            <div className="space-y-1.5">
                              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                <Wrench className="w-3.5 h-3.5 text-blue-600" />
                                <span>Tareas Realizadas / Mano de Obra</span>
                              </span>
                              <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden text-xs">
                                <table className="w-full text-left">
                                  <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                                    <tr>
                                      <th className="py-2 px-3">Descripción del Trabajo</th>
                                      <th className="py-2 px-3 text-right">Mano de Obra</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-200">
                                    {financials.servicios.map((s, idx) => (
                                      <tr key={idx} className="hover:bg-slate-100/50">
                                        <td className="py-2 px-3 font-medium text-slate-800">
                                          {s.descripcion}
                                        </td>
                                        <td className="py-2 px-3 text-right font-semibold text-slate-900">
                                          {s.costoManoObra > 0
                                            ? `$${s.costoManoObra.toLocaleString('es-AR')}`
                                            : <span className="text-slate-600 font-normal">Incluido</span>}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                          {/* Repuestos e Insumos Utilizados */}
                          {financials.repuestos.length > 0 ? (
                            <div className="space-y-1.5">
                              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                <Package className="w-3.5 h-3.5 text-amber-600" />
                                <span>Repuestos e Insumos Utilizados ({financials.repuestos.length})</span>
                              </span>
                              <div className="bg-amber-50/40 rounded-lg border border-amber-200/80 overflow-hidden text-xs">
                                <table className="w-full text-left">
                                  <thead className="bg-amber-100/70 text-amber-900 font-bold border-b border-amber-200">
                                    <tr>
                                      <th className="py-2 px-3">Repuesto / Insumo</th>
                                      <th className="py-2 px-3 text-center">Cant</th>
                                      <th className="py-2 px-3 text-right">P. Unitario</th>
                                      <th className="py-2 px-3 text-right">Subtotal</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-amber-200/60 bg-white/60">
                                    {financials.repuestos.map((r, rIdx) => (
                                      <tr key={rIdx} className="hover:bg-amber-50/80">
                                        <td className="py-2 px-3 font-semibold text-slate-900">
                                          <div className="flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                                            <span>{r.nombre}</span>
                                          </div>
                                          {r.servicioDescripcion && r.servicioDescripcion !== 'Repuestos e Insumos' && (
                                            <span className="text-[10px] text-slate-600 block pl-3">
                                              Asociado a: {r.servicioDescripcion}
                                            </span>
                                          )}
                                        </td>
                                        <td className="py-2 px-3 text-center font-bold text-slate-700">
                                          {r.cantidad}
                                        </td>
                                        <td className="py-2 px-3 text-right text-slate-600">
                                          ${r.precioUnitario.toLocaleString('es-AR')}
                                        </td>
                                        <td className="py-2 px-3 text-right font-bold text-slate-900">
                                          ${r.subtotal.toLocaleString('es-AR')}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          ) : (
                            <div className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex items-center justify-between">
                              <span className="flex items-center gap-1.5">
                                <Package className="w-3.5 h-3.5 text-slate-600" />
                                <span>Repuestos e Insumos:</span>
                              </span>
                              <span className="font-medium text-slate-600">No se registraron repuestos para este servicio</span>
                            </div>
                          )}

                          {/* Cost Breakdown & Total */}
                          <div className="pt-3 border-t border-slate-200 space-y-1.5 bg-slate-50/60 p-3 rounded-xl border">
                            <div className="flex items-center justify-between text-xs text-slate-600">
                              <span>Subtotal Mano de Obra:</span>
                              <span className="font-semibold text-slate-700">
                                ${financials.totalManoObra.toLocaleString('es-AR')}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs text-slate-600">
                              <span>Subtotal Repuestos e Insumos:</span>
                              <span className="font-semibold text-amber-700">
                                ${financials.totalRepuestos.toLocaleString('es-AR')}
                              </span>
                            </div>
                            <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                              <span className="text-xs font-extrabold text-slate-900">Total del Servicio:</span>
                              <span className="text-lg font-black text-slate-900">
                                ${financials.totalGeneral.toLocaleString('es-AR')}
                              </span>
                            </div>
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

        {/* Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Sistema de Verificación Digital MiTaller
            </span>
            <button
              type="button"
              onClick={handleInstallClick}
              className="text-amber-800 hover:text-amber-900 font-extrabold flex items-center gap-1 hover:underline cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Instalar Acceso Rápido</span>
            </button>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-colors cursor-pointer"
          >
            Cerrar Portal
          </button>
        </div>
      </div>

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
