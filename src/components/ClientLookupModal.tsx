import React, { useState } from 'react';
import { WorkOrder, Workshop, OrderStatus } from '../types/tallerya';
import { searchWorkOrdersByPatente } from '../services/tallerService';
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
  Sparkles
} from 'lucide-react';

interface ClientLookupModalProps {
  isOpen: boolean;
  onClose: () => void;
  localWorkOrders?: WorkOrder[];
}

export function ClientLookupModal({ isOpen, onClose, localWorkOrders = [] }: ClientLookupModalProps) {
  const [patenteInput, setPatenteInput] = useState('');
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [results, setResults] = useState<WorkOrder[]>([]);
  const [workshops, setWorkshops] = useState<Record<string, Workshop>>({});

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
        return <span className="px-2.5 py-1 bg-blue-100 text-blue-800 rounded-lg text-xs font-bold">Ingresado al Taller</span>;
      case 'diagnostico':
        return <span className="px-2.5 py-1 bg-purple-100 text-purple-800 rounded-lg text-xs font-bold">En Diagnóstico</span>;
      case 'reparacion':
        return <span className="px-2.5 py-1 bg-orange-100 text-orange-800 rounded-lg text-xs font-bold">En Reparación</span>;
      case 'repuestos':
        return <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-lg text-xs font-bold">Esperando Repuestos</span>;
      case 'listo':
        return <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold flex items-center gap-1">¡Listo para Retirar!</span>;
      case 'entregado':
        return <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold">Trabajo Entregado</span>;
      default:
        return null;
    }
  };

  const vehicleInfo = results.length > 0 ? results[0].vehiculo : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[90vh]">
        {/* Header Banner */}
        <div className="bg-slate-900 text-white p-5 sm:p-6 relative shrink-0 border-b border-slate-800">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500 text-slate-950 rounded-xl font-bold shadow-md">
              <Car className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-tight">Portal de Consulta para Clientes</h2>
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-md border border-emerald-500/30">
                  ONLINE
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Consulta el estado de tu auto y tu libreta de servicios ingresando la patente
              </p>
            </div>
          </div>
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
                <div className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs font-black bg-blue-700 text-white px-1.5 py-0.5 rounded-xs">
                  ARG / PY
                </div>
                <input
                  type="text"
                  required
                  value={patenteInput}
                  onChange={(e) => setPatenteInput(e.target.value)}
                  placeholder="Ej: AB 123 CD  o  AE 456 BB"
                  className="w-full pl-20 pr-4 py-2.5 bg-slate-100 border-2 border-slate-300 focus:border-amber-500 rounded-xl text-base font-extrabold uppercase font-mono tracking-wider text-slate-900 focus:outline-hidden"
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

            {/* Quick Demo Buttons */}
            <div className="flex items-center gap-2 pt-1 text-xs text-slate-600 flex-wrap">
              <span className="font-medium text-[11px]">Prueba con:</span>
              {['AB 123 CD', 'AE 456 BB', 'AA 789 CC'].map((sample) => (
                <button
                  key={sample}
                  type="button"
                  onClick={() => {
                    setPatenteInput(sample);
                    setTimeout(() => handleSearch(), 50);
                  }}
                  className="px-2 py-0.5 bg-slate-200/80 hover:bg-slate-300 text-slate-800 font-mono text-xs rounded-md transition-colors"
                >
                  {sample}
                </button>
              ))}
            </div>
          </form>

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
                                <span>Ingreso: {new Date(order.fechaIngreso).toLocaleDateString('es-ES')}</span>
                                {order.mecanicoAsignado && (
                                  <span className="ml-2 font-medium text-slate-700">| Mecánico: {order.mecanicoAsignado}</span>
                                )}
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

                          {/* Services & Parts */}
                          {order.servicios && order.servicios.length > 0 && (
                            <div>
                              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                                Repuestos y Tareas Realizadas
                              </span>
                              <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden text-xs">
                                <table className="w-full text-left">
                                  <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                                    <tr>
                                      <th className="py-2 px-3">Descripción</th>
                                      <th className="py-2 px-3 text-center">Cant</th>
                                      <th className="py-2 px-3 text-right">Monto</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-200">
                                    {order.servicios.map((s) => (
                                      <tr key={s.id}>
                                        <td className="py-2 px-3 font-medium text-slate-800">
                                          {s.descripcion}
                                          <span className="ml-2 text-[10px] text-slate-600 uppercase">({s.tipo})</span>
                                        </td>
                                        <td className="py-2 px-3 text-center">{s.cantidad}</td>
                                        <td className="py-2 px-3 text-right font-semibold text-slate-900">
                                          ${(s.precioUnitario * s.cantidad).toLocaleString('es-AR')}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                          {/* Total Cost */}
                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                            <span className="text-slate-600 font-bold">Total del Servicio:</span>
                            <span className="text-lg font-black text-slate-900">
                              ${order.totalEstimado.toLocaleString('es-AR')}
                            </span>
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
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Sistema de Verificación Digital MiTaller
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-colors"
          >
            Cerrar Portal
          </button>
        </div>
      </div>
    </div>
  );
}
