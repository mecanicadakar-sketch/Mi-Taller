import React, { useState } from 'react';
import {
  FileText,
  Printer,
  Download,
  X,
  Car,
  User,
  Phone,
  Calendar,
  Wrench,
  CheckCircle2,
  ShieldCheck,
  DollarSign,
  Info,
  MapPin,
  Mail,
} from 'lucide-react';
import { Client, Vehicle, WorkOrder, Workshop, OrderStatus } from '../types/tallerya';
import { formatDateSpanish } from '../utils/dateUtils';
import { downloadVehicleHistoryPDF } from '../utils/vehicleReportUtils';

interface VehicleReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client;
  vehicle: Vehicle;
  workOrders: WorkOrder[];
  workshop?: Workshop | null;
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  ingresado: 'Ingresado',
  diagnostico: 'En Diagnóstico',
  reparacion: 'En Reparación',
  repuestos: 'Esp. Repuestos',
  listo: 'Listo p/ Entrega',
  entregado: 'Entregado',
};

export function VehicleReportModal({
  isOpen,
  onClose,
  client,
  vehicle,
  workOrders,
  workshop,
}: VehicleReportModalProps) {
  const [includeCosts, setIncludeCosts] = useState(true);

  if (!isOpen) return null;

  const tallerNombre = workshop?.nombreTaller || 'MiTaller Mecánico';
  const tallerDireccion = workshop?.direccion
    ? `${workshop.direccion}${workshop.ciudad ? `, ${workshop.ciudad}` : ''}`
    : '';
  const tallerTelefono = workshop?.telefono || '';
  const tallerEmail = workshop?.email || '';

  const vehPatente = (vehicle.patente || '').toUpperCase().trim();

  // Filter orders for this vehicle
  const vehicleOrders = (workOrders || [])
    .filter((wo) => {
      const woPat = wo.vehiculo?.patente?.toUpperCase().trim() || '';
      return (
        (woPat && vehPatente && woPat === vehPatente) ||
        (wo.vehiculo?.id && vehicle.id && wo.vehiculo.id === vehicle.id)
      );
    })
    .sort((a, b) => new Date(b.fechaIngreso || 0).getTime() - new Date(a.fechaIngreso || 0).getTime());

  const totalInvertido = vehicleOrders.reduce((acc, wo) => acc + (wo.totalEstimado || 0), 0);
  const latestOrder = vehicleOrders[0];
  const earliestOrder = vehicleOrders[vehicleOrders.length - 1];
  const proximoKm = latestOrder?.mantenimiento?.proximoKmService || (vehicle.kilometraje ? vehicle.kilometraje + 10000 : 0);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    downloadVehicleHistoryPDF({
      client,
      vehicle,
      workOrders,
      workshop,
      includeCosts,
    });
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
      {/* Container */}
      <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl sm:rounded-3xl max-w-5xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Control Bar (Hidden on Print) */}
        <div className="print:hidden p-4 sm:px-6 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>Reporte de Historial de Mantenimiento</span>
                <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 font-mono text-xs font-black">
                  {vehPatente}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {vehicle.marca} {vehicle.modelo} ({vehicle.anio}) • {client.nombre}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Toggle Include Costs */}
            <label className="flex items-center gap-2 text-xs text-slate-300 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 cursor-pointer hover:bg-slate-800/80 select-none">
              <input
                type="checkbox"
                checked={includeCosts}
                onChange={(e) => setIncludeCosts(e.target.checked)}
                className="w-3.5 h-3.5 accent-amber-500 rounded cursor-pointer"
              />
              <span>Incluir Precios</span>
            </label>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition flex items-center gap-1.5 cursor-pointer active:scale-95"
              title="Abrir diálogo de impresión para imprimir o guardar como PDF del sistema"
            >
              <Printer className="w-4 h-4 text-slate-300" />
              <span className="hidden sm:inline">Imprimir</span>
            </button>

            {/* Download PDF Button */}
            <button
              type="button"
              onClick={handleDownloadPDF}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition flex items-center gap-1.5 cursor-pointer active:scale-95"
              title="Generar y descargar documento PDF profesional"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              <span>Descargar PDF</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Paper Sheet Preview (Printable Area) */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-900/60">
          <div className="printable-area max-w-4xl mx-auto bg-white text-slate-900 p-6 sm:p-8 rounded-2xl shadow-xl border border-slate-200 space-y-6">
            {/* Header with Workshop Brand */}
            <div className="border-b-2 border-slate-900 pb-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-black text-sm">
                    <Wrench className="w-4 h-4" />
                  </div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    {tallerNombre}
                  </h1>
                </div>
                <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">
                  Historial de Mantenimientos e Intervenciones Técnicas
                </p>
                <div className="text-xs text-slate-500 flex flex-wrap gap-x-4 gap-y-1 pt-1">
                  {tallerDireccion && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {tallerDireccion}
                    </span>
                  )}
                  {tallerTelefono && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      {tallerTelefono}
                    </span>
                  )}
                  {tallerEmail && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      {tallerEmail}
                    </span>
                  )}
                </div>
              </div>

              <div className="text-right sm:self-center shrink-0 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                <p className="text-slate-500">Fecha de Emisión:</p>
                <p className="font-bold text-slate-800">{formatDateSpanish(new Date().toISOString())}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Reporte N° {vehPatente || 'GEN'}-{Date.now().toString().slice(-4)}</p>
              </div>
            </div>

            {/* Vehicle & Owner Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Vehicle Card */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/90 space-y-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Car className="w-3.5 h-3.5 text-amber-600" />
                  <span>Datos del Vehículo</span>
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Vehículo</span>
                    <strong className="text-slate-800">{vehicle.marca} {vehicle.modelo}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Año</span>
                    <strong className="text-slate-800">{vehicle.anio || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Patente / Dominio</span>
                    <strong className="px-2 py-0.5 bg-slate-900 text-amber-400 rounded-md font-mono text-xs inline-block">
                      {vehPatente}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Kilometraje Actual</span>
                    <strong className="text-slate-800">{vehicle.kilometraje?.toLocaleString('es-AR') || 0} km</strong>
                  </div>
                </div>
              </div>

              {/* Owner Card */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/90 space-y-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-amber-600" />
                  <span>Datos del Propietario</span>
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Cliente</span>
                    <strong className="text-slate-800">{client.nombre}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Teléfono</span>
                    <strong className="text-slate-800">{client.telefono || 'Sin registrar'}</strong>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Email / Domicilio</span>
                    <span className="text-slate-700 text-xs">
                      {[client.email, client.direccion].filter(Boolean).join(' • ') || 'Sin domicilio registrado'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Summary Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-100/80 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Servicios</span>
                <p className="text-lg font-black text-slate-900 mt-0.5">
                  {vehicleOrders.length} {vehicleOrders.length === 1 ? 'servicio' : 'servicios'}
                </p>
              </div>

              <div className="bg-slate-100/80 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Primer Registro</span>
                <p className="text-xs font-bold text-slate-800 mt-1">
                  {earliestOrder ? formatDateSpanish(earliestOrder.fechaIngreso) : 'Sin registros'}
                </p>
              </div>

              <div className="bg-slate-100/80 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Último Servicio</span>
                <p className="text-xs font-bold text-slate-800 mt-1">
                  {latestOrder ? formatDateSpanish(latestOrder.fechaIngreso) : 'Sin registros'}
                </p>
              </div>

              <div className="bg-slate-100/80 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">
                  {includeCosts ? 'Total Invertido' : 'Próximo Service'}
                </span>
                <p className="text-lg font-black text-emerald-600 mt-0.5">
                  {includeCosts
                    ? `$${totalInvertido.toLocaleString('es-AR')}`
                    : (proximoKm ? `${proximoKm.toLocaleString('es-AR')} km` : 'N/A')}
                </p>
              </div>
            </div>

            {/* Chronological Table of Work Orders */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-amber-600" />
                  <span>Historial Cronológico de Mantenimientos</span>
                </h3>
                <span className="text-[11px] text-slate-500 font-medium">
                  {vehicleOrders.length} orden{vehicleOrders.length === 1 ? '' : 'es'} registrada{vehicleOrders.length === 1 ? '' : 's'}
                </span>
              </div>

              {vehicleOrders.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-300 rounded-xl space-y-1">
                  <p className="text-sm font-bold text-slate-700">Sin historial de mantenimiento</p>
                  <p className="text-xs text-slate-500">Este vehículo no posee órdenes de trabajo registradas aún.</p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs text-slate-700 border-collapse">
                    <thead className="bg-slate-900 text-white text-[11px] font-bold uppercase tracking-wider">
                      <tr>
                        <th className="p-2.5 border-b border-slate-800">Fecha / N° OT</th>
                        <th className="p-2.5 border-b border-slate-800">Kilometraje</th>
                        <th className="p-2.5 border-b border-slate-800">Motivo / Diagnóstico</th>
                        <th className="p-2.5 border-b border-slate-800">Trabajos & Repuestos</th>
                        <th className="p-2.5 border-b border-slate-800">Mecánico</th>
                        {includeCosts && (
                          <th className="p-2.5 border-b border-slate-800 text-right">Total</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {vehicleOrders.map((wo) => {
                        return (
                          <tr key={wo.id} className="hover:bg-slate-50/70 align-top">
                            {/* Fecha y OT */}
                            <td className="p-2.5 whitespace-nowrap font-medium text-slate-900">
                              <span className="block font-mono font-bold text-amber-700">{wo.numeroOrden}</span>
                              <span className="text-[11px] text-slate-500">{formatDateSpanish(wo.fechaIngreso)}</span>
                              <span className="mt-1 block text-[10px] font-bold uppercase text-slate-600">
                                {STATUS_LABELS[wo.estado] || wo.estado}
                              </span>
                            </td>

                            {/* Km */}
                            <td className="p-2.5 whitespace-nowrap text-slate-800 font-medium">
                              {wo.vehiculo?.kilometraje
                                ? `${Number(wo.vehiculo.kilometraje).toLocaleString('es-AR')} km`
                                : 'S/D'}
                            </td>

                            {/* Motivo & Diagnostico */}
                            <td className="p-2.5 text-xs text-slate-700 max-w-[200px]">
                              <p className="font-semibold text-slate-900">
                                {wo.fallaReportada || 'Mantenimiento Preventivo'}
                              </p>
                              {wo.diagnosticoTecnico && (
                                <p className="text-[11px] text-slate-600 mt-1 italic">
                                  {wo.diagnosticoTecnico}
                                </p>
                              )}
                            </td>

                            {/* Trabajos & Repuestos */}
                            <td className="p-2.5 text-xs text-slate-700 max-w-[260px] space-y-1">
                              {wo.servicios && wo.servicios.length > 0 ? (
                                <ul className="list-disc list-inside space-y-0.5">
                                  {wo.servicios.map((s, idx) => (
                                    <li key={idx} className="text-slate-800 font-medium">
                                      {s.descripcion}
                                      {s.repuestosUtilizados && s.repuestosUtilizados.length > 0 && (
                                        <span className="text-[11px] text-slate-500 block pl-3">
                                          Repuestos: {s.repuestosUtilizados.map((r) => `${r.nombreRepuesto} (x${r.cantidad})`).join(', ')}
                                        </span>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <span className="text-slate-400">Sin detalle de tareas</span>
                              )}

                              {/* Checklist if present */}
                              {wo.mantenimiento && (
                                <div className="pt-1 flex flex-wrap gap-1">
                                  {wo.mantenimiento.aceiteMotor && (
                                    <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-300 px-1.5 py-0.5 rounded font-bold">
                                      ✓ Aceite ({wo.mantenimiento.tipoAceiteMotor || 'Sintético'})
                                    </span>
                                  )}
                                  {wo.mantenimiento.filtroAceite && (
                                    <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-300 px-1.5 py-0.5 rounded font-bold">
                                      ✓ F. Aceite
                                    </span>
                                  )}
                                  {wo.mantenimiento.filtroAire && (
                                    <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-300 px-1.5 py-0.5 rounded font-bold">
                                      ✓ F. Aire
                                    </span>
                                  )}
                                  {wo.mantenimiento.filtroCombustible && (
                                    <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-300 px-1.5 py-0.5 rounded font-bold">
                                      ✓ F. Combust.
                                    </span>
                                  )}
                                  {wo.mantenimiento.filtroHabitaculo && (
                                    <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-300 px-1.5 py-0.5 rounded font-bold">
                                      ✓ F. Habitác.
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>

                            {/* Mecánico */}
                            <td className="p-2.5 text-xs text-slate-700 whitespace-nowrap">
                              {wo.mecanicoAsignado || 'Taller'}
                            </td>

                            {/* Total Cost */}
                            {includeCosts && (
                              <td className="p-2.5 text-right font-black text-slate-900 whitespace-nowrap">
                                ${(wo.totalEstimado || 0).toLocaleString('es-AR')}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Recommendations & Next Service Box */}
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 space-y-1">
              <span className="text-xs font-black text-amber-900 uppercase flex items-center gap-1.5">
                <Info className="w-4 h-4 text-amber-600" />
                <span>Próximo Mantenimiento Recomendado</span>
              </span>
              <p className="text-xs text-amber-950 font-medium leading-relaxed">
                {proximoKm > 0
                  ? `Se aconseja el próximo servicio preventivo a los ${proximoKm.toLocaleString('es-AR')} km o en un plazo de 6 a 12 meses desde la última fecha registrada, verificando niveles de fluidos, sistema de frenos y amortiguación.`
                  : 'Se aconseja mantener intervalos periódicos de verificación cada 5.000 a 10.000 km según especificaciones del fabricante.'}
              </p>
            </div>

            {/* Signatures */}
            <div className="pt-8 grid grid-cols-2 gap-8 text-center text-xs">
              <div className="space-y-1">
                <div className="border-t border-slate-400 w-44 mx-auto" />
                <p className="font-bold text-slate-800">{client.nombre}</p>
                <p className="text-slate-500 text-[11px]">Conformidad del Cliente</p>
              </div>

              <div className="space-y-1">
                <div className="border-t border-slate-400 w-44 mx-auto" />
                <p className="font-bold text-slate-800">{tallerNombre}</p>
                <p className="text-slate-500 text-[11px]">Firma y Sello del Taller</p>
              </div>
            </div>

            {/* Footer Notice */}
            <div className="border-t border-slate-200 pt-3 text-center text-[10px] text-slate-400">
              Documento emitido electrónicamente como constancia de mantenimientos registrados en el taller.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
