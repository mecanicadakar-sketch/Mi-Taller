import React, { useState, useEffect } from 'react';
import { WorkOrder, Workshop, OrderStatus } from '../types/tallerya';
import { searchWorkOrdersByPatente } from '../services/tallerService';
import { formatDateSpanish } from '../utils/dateUtils';
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
  ExternalLink
} from 'lucide-react';

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
              onClick={handleCopyPortalLink}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
              title="Copiar link para enviar a los clientes"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
              <span>{copiedLink ? '¡Link Copiado!' : 'Copiar Link del Portal'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 py-6 flex-1 w-full space-y-6">
        <div className="space-y-6">
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
                                </div>
                              </div>
                            </div>

                            {/* Works Performed if any */}
                            {order.servicios && order.servicios.length > 0 && (
                              <div className="space-y-2">
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Servicios e Intervenciones:</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {order.servicios.map((servicio, idx) => (
                                    <div key={idx} className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60 flex items-center justify-between text-xs">
                                      <span className="text-slate-200 font-medium">{servicio.descripcion}</span>
                                      {servicio.costoManoObra > 0 && (
                                        <span className="font-bold text-slate-400 ml-2">${servicio.costoManoObra.toLocaleString('es-AR')}</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Footer Summary */}
                            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80 text-xs">
                              <span className="text-slate-400">
                                Estado actualizado automáticamente por el sistema de gestión del taller.
                              </span>
                              {order.totalEstimado > 0 && (
                                <div className="text-right">
                                  <span className="text-slate-400 mr-2">Monto Estimado:</span>
                                  <span className="text-lg font-black text-amber-400">${order.totalEstimado.toLocaleString('es-AR')}</span>
                                </div>
                              )}
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
      <footer className="bg-slate-900 border-t border-slate-800 py-4 text-center text-xs text-slate-500">
        <p>© {new Date().getFullYear()} {workshopInfo?.nombreTaller || 'MiTaller'} — Portal para Clientes & Conductores</p>
      </footer>
    </div>
  );
}
