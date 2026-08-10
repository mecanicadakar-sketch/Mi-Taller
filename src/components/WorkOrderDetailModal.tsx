import { useState } from 'react';
import { WorkOrder, OrderStatus, InventoryItem, Mechanic } from '../types/tallerya';
import { Wrench, Car, User, Phone, CheckCircle2, Clock, Plus, Trash2, Save, Printer, Users, CheckSquare, Sparkles, Package } from 'lucide-react';
import { resolveProximoKm } from '../services/whatsappReminderService';
import { formatDateSpanish, parseAndNormalizeDate } from '../utils/dateUtils';

interface WorkOrderDetailModalProps {
  order: WorkOrder;
  inventory: InventoryItem[];
  mechanics?: Mechanic[];
  onClose: () => void;
  onUpdateOrder: (updated: WorkOrder) => void;
  onDeleteOrder?: (orderId: string) => void;
  onOpenMechanicsModal?: () => void;
}

const STATUS_CONFIG: Record<OrderStatus, { label: string; bg: string; text: string; border: string }> = {
  ingresado: { label: 'Ingresado', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  diagnostico: { label: 'Ingresado', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  reparacion: { label: 'En Reparación', bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
  repuestos: { label: 'En Reparación', bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
  listo: { label: 'Listo / Entregado', bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200' },
  entregado: { label: 'Listo / Entregado', bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200' },
};

export function WorkOrderDetailModal({
  order,
  inventory,
  mechanics = [],
  onClose,
  onUpdateOrder,
  onDeleteOrder,
  onOpenMechanicsModal,
}: WorkOrderDetailModalProps) {
  // Client state
  const [clienteNombre, setClienteNombre] = useState(order.clienteNombre || '');
  const [clienteTelefono, setClienteTelefono] = useState(order.clienteTelefono || '');

  // Vehicle state
  const [patente, setPatente] = useState(order.vehiculo?.patente || '');
  const [marca, setMarca] = useState(order.vehiculo?.marca || '');
  const [modelo, setModelo] = useState(order.vehiculo?.modelo || '');
  const [anio, setAnio] = useState(order.vehiculo?.anio || new Date().getFullYear());
  const [kilometraje, setKilometraje] = useState(order.vehiculo?.kilometraje || 0);
  const [nivelCombustible, setNivelCombustible] = useState(order.vehiculo?.nivelCombustible || '1/2');
  const [observacionesVisuales, setObservacionesVisuales] = useState(order.vehiculo?.observacionesVisuales || '');

  // Order state
  const [fechaIngreso, setFechaIngreso] = useState(() => {
    if (order.fechaIngreso) {
      const d = new Date(order.fechaIngreso);
      if (!isNaN(d.getTime())) {
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().slice(0, 16);
      }
    }
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });
  const [fallaReportada, setFallaReportada] = useState(order.fallaReportada || '');
  const [estado, setEstado] = useState<OrderStatus>(order.estado);
  const [diagnostico, setDiagnostico] = useState(order.diagnosticoTecnico || '');
  const [mecanico, setMecanico] = useState(order.mecanicoAsignado || 'Mecanico Juan Pérez');
  const [servicios, setServicios] = useState(order.servicios || []);

  // Form for adding a new service or parts line
  const [nuevaTarea, setNuevaTarea] = useState('');
  const [manoObra, setManoObra] = useState(25000);
  const [selectedPartId, setSelectedPartId] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleAddService = () => {
    if (!nuevaTarea.trim()) return;

    const repuestos = [];
    if (selectedPartId) {
      const part = inventory.find((p) => p.id === selectedPartId);
      if (part) {
        repuestos.push({
          inventoryItemId: part.id,
          nombreRepuesto: part.nombre,
          cantidad: 1,
          precioUnitario: part.precioVenta,
        });
      }
    }

    const newServ = {
      id: 's_' + Date.now(),
      descripcion: nuevaTarea.trim(),
      costoManoObra: Number(manoObra) || 0,
      repuestosUtilizados: repuestos,
    };

    const updatedServices = [...servicios, newServ];
    setServicios(updatedServices);

    // Reset inputs
    setNuevaTarea('');
    setManoObra(25000);
    setSelectedPartId('');
  };

  const handleRemoveService = (id: string) => {
    setServicios(servicios.filter((s) => s.id !== id));
  };

  const handleUpdateServiceDesc = (id: string, desc: string) => {
    setServicios(prev => prev.map(s => s.id === id ? { ...s, descripcion: desc } : s));
  };

  const handleUpdateServiceCost = (id: string, cost: number) => {
    setServicios(prev => prev.map(s => s.id === id ? { ...s, costoManoObra: cost } : s));
  };

  const handleRemovePartFromService = (serviceId: string, partIndex: number) => {
    setServicios(prev => prev.map(s => {
      if (s.id !== serviceId) return s;
      const updatedParts = s.repuestosUtilizados.filter((_, idx) => idx !== partIndex);
      return { ...s, repuestosUtilizados: updatedParts };
    }));
  };

  // Direct Repuestos Form State (below Diagnóstico Técnico)
  const [repuestoNombre, setRepuestoNombre] = useState('');
  const [repuestoPrecio, setRepuestoPrecio] = useState<number | ''>('');
  const [repuestoCantidad, setRepuestoCantidad] = useState<number>(1);
  const [selectedInventoryPartId, setSelectedInventoryPartId] = useState('');
  const [targetServiceId, setTargetServiceId] = useState('AUTO');

  const handleSelectInventoryRepuesto = (partId: string) => {
    setSelectedInventoryPartId(partId);
    if (!partId) return;
    const item = inventory.find((i) => i.id === partId);
    if (item) {
      setRepuestoNombre(item.nombre);
      setRepuestoPrecio(item.precioVenta);
    }
  };

  const handleAddRepuestoDirect = () => {
    if (!repuestoNombre.trim()) return;
    const price = typeof repuestoPrecio === 'number' ? repuestoPrecio : 0;
    const qty = Number(repuestoCantidad) || 1;

    const newRepuesto = {
      inventoryItemId: selectedInventoryPartId || undefined,
      repuestoId: selectedInventoryPartId || 'r_' + Date.now(),
      nombreRepuesto: repuestoNombre.trim(),
      cantidad: qty,
      precioUnitario: price,
    };

    if (servicios.length === 0 || targetServiceId === 'NEW') {
      const newServ = {
        id: 's_' + Date.now(),
        descripcion: 'Repuestos y Insumos',
        costoManoObra: 0,
        repuestosUtilizados: [newRepuesto],
      };
      setServicios((prev) => [...prev, newServ]);
    } else {
      setServicios((prev) => {
        const updated = [...prev];
        let targetIdx = updated.length - 1;
        if (targetServiceId !== 'AUTO') {
          const foundIdx = updated.findIndex((s) => s.id === targetServiceId);
          if (foundIdx !== -1) targetIdx = foundIdx;
        }
        updated[targetIdx] = {
          ...updated[targetIdx],
          repuestosUtilizados: [...(updated[targetIdx].repuestosUtilizados || []), newRepuesto],
        };
        return updated;
      });
    }

    setRepuestoNombre('');
    setRepuestoPrecio('');
    setRepuestoCantidad(1);
    setSelectedInventoryPartId('');
  };

  const totalManoObra = servicios.reduce((acc, s) => acc + (s.costoManoObra || 0), 0);
  const totalRepuestos = servicios.reduce((acc, s) => {
    return acc + (s.repuestosUtilizados || []).reduce((pSum, p) => pSum + (p.cantidad || 0) * (p.precioUnitario || 0), 0);
  }, 0);

  const calculateTotal = () => {
    return totalManoObra + totalRepuestos;
  };

  const handleSaveChanges = () => {
    const totalEst = calculateTotal();
    const updated: WorkOrder = {
      ...order,
      fechaIngreso: parseAndNormalizeDate(fechaIngreso),
      clienteNombre: clienteNombre.trim(),
      clienteTelefono: clienteTelefono.trim(),
      vehiculo: {
        ...order.vehiculo,
        patente: patente.toUpperCase().trim(),
        marca: marca.trim(),
        modelo: modelo.trim(),
        anio: Number(anio) || new Date().getFullYear(),
        kilometraje: Number(kilometraje) || 0,
        nivelCombustible,
        observacionesVisuales: observacionesVisuales.trim(),
      },
      fallaReportada: fallaReportada.trim(),
      estado,
      diagnosticoTecnico: diagnostico.trim(),
      mecanicoAsignado: mecanico,
      servicios,
      totalEstimado: totalEst,
    };

    onUpdateOrder(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full flex flex-col max-h-[92vh] shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 sm:p-5 shrink-0 bg-white">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-900 text-xl">{order.numeroOrden}</span>
              <span className="px-2.5 py-1 bg-slate-900 text-amber-400 font-mono font-bold text-xs rounded-lg">
                {patente || order.vehiculo.patente}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="font-medium">Ingresado:</span>
              <input
                type="datetime-local"
                value={fechaIngreso}
                onChange={(e) => setFechaIngreso(e.target.value)}
                className="px-2 py-0.5 bg-slate-50 border border-slate-200 rounded text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-amber-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value as OrderStatus)}
              className={`text-xs font-bold px-3 py-1.5 rounded-xl border cursor-pointer ${STATUS_CONFIG[estado]?.bg || 'bg-blue-50'} ${STATUS_CONFIG[estado]?.text || 'text-blue-700'} ${STATUS_CONFIG[estado]?.border || 'border-blue-200'}`}
            >
              <option value="ingresado">Estado: 🔵 Ingresado</option>
              <option value="reparacion">Estado: 🟡 En Reparación</option>
              <option value="entregado">Estado: 🟢 Listo / Entregado</option>
            </select>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 text-2xl font-bold leading-none p-1"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">

        {/* Editable Client & Vehicle Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
          {/* Client Details */}
          <div className="space-y-2.5">
            <p className="font-bold text-slate-400 uppercase text-[10px] tracking-wider flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-amber-500" />
              Propietario / Cliente (Editable)
            </p>

            <div>
              <label className="text-[11px] font-semibold text-slate-600">Nombre del Cliente</label>
              <input
                type="text"
                value={clienteNombre}
                onChange={(e) => setClienteNombre(e.target.value)}
                placeholder="Nombre del cliente"
                className="w-full mt-0.5 p-2 bg-white border border-slate-200 rounded-lg font-semibold text-slate-900"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                <Phone className="w-3 h-3 text-slate-400" />
                Teléfono / WhatsApp
              </label>
              <input
                type="text"
                value={clienteTelefono}
                onChange={(e) => setClienteTelefono(e.target.value)}
                placeholder="Ej. +54 9 11 1234-5678"
                className="w-full mt-0.5 p-2 bg-white border border-slate-200 rounded-lg text-slate-900"
              />
            </div>

            <div className="pt-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-slate-600">Mecánico Asignado:</label>
                {onOpenMechanicsModal && (
                  <button
                    type="button"
                    onClick={onOpenMechanicsModal}
                    className="text-[10px] font-bold text-amber-600 hover:underline flex items-center gap-1"
                  >
                    <Users className="w-3 h-3" />
                    <span>Gestionar</span>
                  </button>
                )}
              </div>
              <select
                value={mecanico}
                onChange={(e) => {
                  if (e.target.value === '__NEW__') {
                    const newName = prompt('Nombre del nuevo mecánico / personal:');
                    if (newName && newName.trim()) {
                      setMecanico(newName.trim());
                    }
                  } else {
                    setMecanico(e.target.value);
                  }
                }}
                className="w-full mt-0.5 p-2 bg-white border border-slate-200 rounded-lg font-semibold text-slate-900"
              >
                {mecanico && !mechanics.some((m) => m.nombre === mecanico) && (
                  <option value={mecanico}>{mecanico}</option>
                )}
                {mechanics.filter(m => m.activo).length > 0 ? (
                  mechanics
                    .filter((m) => m.activo)
                    .map((m) => (
                      <option key={m.id} value={m.nombre}>
                        {m.nombre} {m.especialidad ? `(${m.especialidad})` : ''}
                      </option>
                    ))
                ) : (
                  <>
                    <option value="Mecanico Juan Pérez">Juan Pérez (Mecánico General)</option>
                    <option value="Mecanico Pedro Gómez">Pedro Gómez (Especialista Frenos)</option>
                    <option value="Ing. Marcelo R.">Marcelo R. (Diagnóstico Electrónico)</option>
                  </>
                )}
                <option value="__NEW__" className="font-bold text-amber-700 bg-amber-50">
                  + Otro mecánico...
                </option>
              </select>
            </div>
          </div>

          {/* Vehicle Details */}
          <div className="space-y-2.5">
            <p className="font-bold text-slate-400 uppercase text-[10px] tracking-wider flex items-center gap-1">
              <Car className="w-3.5 h-3.5 text-amber-500" />
              Datos del Vehículo (Editable)
            </p>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-semibold text-slate-600">Patente</label>
                <input
                  type="text"
                  value={patente}
                  onChange={(e) => setPatente(e.target.value)}
                  className="w-full mt-0.5 p-2 bg-white border border-slate-200 rounded-lg font-mono font-bold uppercase text-slate-900"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600">Marca</label>
                <input
                  type="text"
                  value={marca}
                  onChange={(e) => setMarca(e.target.value)}
                  className="w-full mt-0.5 p-2 bg-white border border-slate-200 rounded-lg text-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-semibold text-slate-600">Modelo</label>
                <input
                  type="text"
                  value={modelo}
                  onChange={(e) => setModelo(e.target.value)}
                  className="w-full mt-0.5 p-2 bg-white border border-slate-200 rounded-lg text-slate-900"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600">Año</label>
                <input
                  type="number"
                  value={anio}
                  onChange={(e) => setAnio(Number(e.target.value))}
                  className="w-full mt-0.5 p-2 bg-white border border-slate-200 rounded-lg text-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-semibold text-slate-600">Kilometraje (KM)</label>
                <input
                  type="number"
                  value={kilometraje}
                  onChange={(e) => setKilometraje(Number(e.target.value))}
                  className="w-full mt-0.5 p-2 bg-white border border-slate-200 rounded-lg text-slate-900"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600">Combustible</label>
                <select
                  value={nivelCombustible}
                  onChange={(e) => setNivelCombustible(e.target.value as any)}
                  className="w-full mt-0.5 p-2 bg-white border border-slate-200 rounded-lg text-slate-900"
                >
                  <option value="Reserva">Reserva</option>
                  <option value="1/4">1/4</option>
                  <option value="1/2">1/2</option>
                  <option value="3/4">3/4</option>
                  <option value="Lleno">Lleno</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-600">Observaciones Visuales / Detalles</label>
              <input
                type="text"
                value={observacionesVisuales}
                onChange={(e) => setObservacionesVisuales(e.target.value)}
                placeholder="Ej. Rayón en puerta izquierda, parabrisas fisurado"
                className="w-full mt-0.5 p-2 bg-white border border-slate-200 rounded-lg text-slate-900"
              />
            </div>
          </div>
        </div>

        {/* Maintenance Checklist Card (If present) */}
        {order.mantenimiento && (
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-emerald-900 flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4 text-emerald-600" />
                Service de Mantenimiento Preventivo ({order.mantenimiento.intervaloKm?.toLocaleString() || 10000} km)
              </span>
              {order.mantenimiento && (
                <span className="bg-emerald-600 text-white font-extrabold text-[10px] px-2.5 py-0.5 rounded-full">
                  Próximo Service: {resolveProximoKm(
                    kilometraje || 0,
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
                  ✓ Filtro Habitáculo/AA
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
                  ✓ Bujías
                </span>
              )}
              {order.mantenimiento.pastillasFreno && (
                <span className="bg-white border border-emerald-300 text-emerald-900 font-semibold px-2 py-0.5 rounded-md text-[11px]">
                  ✓ Pastillas Freno
                </span>
              )}
            </div>
          </div>
        )}

        {/* Falla & Diagnostic Technical Notes */}
        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Falla Reportada por Cliente</label>
            <textarea
              rows={2}
              value={fallaReportada}
              onChange={(e) => setFallaReportada(e.target.value)}
              placeholder="Falla o problema reportado..."
              className="w-full mt-1 p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Diagnóstico Técnico del Mecánico
            </label>
            <textarea
              rows={2}
              value={diagnostico}
              onChange={(e) => setDiagnostico(e.target.value)}
              placeholder="Escribe el diagnóstico técnico, pruebas realizadas..."
              className="w-full mt-1 p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            />
          </div>

          {/* Direct Repuestos / Insumos Section (below Diagnóstico Técnico) */}
          <div className="bg-amber-50/40 border border-amber-200/80 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Package className="w-4 h-4 text-amber-500" />
                Agregar Repuestos / Materiales
              </label>
            </div>

            {/* List all currently added repuestos across services */}
            {servicios.some((s) => s.repuestosUtilizados.length > 0) && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Repuestos cargados en esta orden:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {servicios.flatMap((s) =>
                    s.repuestosUtilizados.map((p, idx) => (
                      <span
                        key={`${s.id}-${idx}`}
                        className="bg-white border border-amber-300 text-slate-900 font-semibold px-2.5 py-1 rounded-lg text-xs flex items-center gap-1.5 shadow-2xs"
                      >
                        <span className="font-bold">{p.nombreRepuesto}</span>
                        <span className="text-slate-500 text-[11px]">
                          ({p.cantidad}x ${p.precioUnitario.toLocaleString('es-AR')})
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemovePartFromService(s.id, idx)}
                          className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded p-0.5 ml-1 transition-colors"
                          title="Quitar repuesto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Form to add a new repuesto */}
            <div className="space-y-2 pt-1 border-t border-amber-200/50">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
                {/* Inventory dropdown */}
                <div className="sm:col-span-5">
                  <select
                    value={selectedInventoryPartId}
                    onChange={(e) => handleSelectInventoryRepuesto(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  >
                    <option value="">-- Buscar en Inventario o Escribir Manual --</option>
                    {inventory.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.nombre} (Stock: {item.stockActual}) - ${item.precioVenta.toLocaleString('es-AR')}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Custom Name */}
                <div className="sm:col-span-4">
                  <input
                    type="text"
                    placeholder="Nombre del repuesto / insumo"
                    value={repuestoNombre}
                    onChange={(e) => setRepuestoNombre(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-slate-900"
                  />
                </div>

                {/* Price */}
                <div className="sm:col-span-3">
                  <input
                    type="number"
                    placeholder="Precio ($)"
                    value={repuestoPrecio}
                    onChange={(e) => setRepuestoPrecio(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-slate-900"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <label className="text-slate-600 font-semibold">Cant:</label>
                    <input
                      type="number"
                      min={1}
                      value={repuestoCantidad}
                      onChange={(e) => setRepuestoCantidad(Math.max(1, Number(e.target.value)))}
                      className="w-16 p-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-center text-slate-900"
                    />
                  </div>

                  {servicios.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <label className="text-slate-600 font-semibold">Asignar a:</label>
                      <select
                        value={targetServiceId}
                        onChange={(e) => setTargetServiceId(e.target.value)}
                        className="p-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 font-medium"
                      >
                        <option value="AUTO">Última tarea / Tarea actual</option>
                        {servicios.map((s, idx) => (
                          <option key={s.id} value={s.id}>
                            {idx + 1}. {s.descripcion || 'Sin título'}
                          </option>
                        ))}
                        <option value="NEW">+ Crear nueva línea "Repuestos"</option>
                      </select>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleAddRepuestoDirect}
                  disabled={!repuestoNombre.trim()}
                  className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold rounded-lg text-xs transition-colors flex items-center gap-1 shadow-2xs shrink-0"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Agregar Repuesto</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Services & Repuestos List */}
        <div className="space-y-3 border-t border-slate-100 pt-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Trabajos y Repuestos Aplicados
          </h4>

          {/* List existing */}
          <div className="space-y-2">
            {servicios.map((serv) => (
              <div
                key={serv.id}
                className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={serv.descripcion}
                    onChange={(e) => handleUpdateServiceDesc(serv.id, e.target.value)}
                    placeholder="Descripción de tarea / servicio"
                    className="flex-1 p-1.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-900 text-xs"
                  />
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-slate-500 text-[11px]">Mano obra $:</span>
                    <input
                      type="number"
                      value={serv.costoManoObra}
                      onChange={(e) => handleUpdateServiceCost(serv.id, Number(e.target.value))}
                      className="w-24 p-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 text-xs font-bold"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveService(serv.id)}
                    className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Eliminar esta línea"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {(serv.repuestosUtilizados || []).length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1 pl-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Repuestos:</span>
                    {(serv.repuestosUtilizados || []).map((r, i) => (
                      <span key={i} className="bg-amber-100 text-amber-900 font-semibold px-2 py-0.5 rounded text-[11px] flex items-center gap-1">
                        {r.nombreRepuesto} (${r.precioUnitario.toLocaleString('es-AR')})
                        <button
                          type="button"
                          onClick={() => handleRemovePartFromService(serv.id, i)}
                          className="hover:text-rose-700 ml-0.5 text-xs font-bold"
                          title="Quitar repuesto"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Add new line form */}
          <div className="p-3 bg-amber-50/50 border border-amber-200/80 rounded-xl space-y-2">
            <span className="text-[11px] font-bold text-amber-900 uppercase">
              + Agregar Tarea o Repuesto a esta Orden
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                placeholder="Descripción del trabajo (ej. Reemplazo correa)"
                value={nuevaTarea}
                onChange={(e) => setNuevaTarea(e.target.value)}
                className="p-2 bg-white border border-slate-200 rounded-lg text-xs"
              />

              <input
                type="number"
                placeholder="Mano de obra ($)"
                value={manoObra}
                onChange={(e) => setManoObra(Number(e.target.value))}
                className="p-2 bg-white border border-slate-200 rounded-lg text-xs"
              />

              <select
                value={selectedPartId}
                onChange={(e) => setSelectedPartId(e.target.value)}
                className="p-2 bg-white border border-slate-200 rounded-lg text-xs"
              >
                <option value="">-- Sin repuesto adicional --</option>
                {inventory.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nombre} (${item.precioVenta.toLocaleString('es-AR')})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleAddService}
              className="px-3 py-1.5 bg-amber-500 text-slate-950 font-bold rounded-lg text-xs hover:bg-amber-400 transition-colors flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Añadir a la orden
            </button>
          </div>
        </div>

        </div>

        {/* Cost Summary & Fixed Footer Bar */}
        <div className="shrink-0 space-y-3 border-t border-slate-200 p-4 sm:p-5 bg-white">
          <div className="bg-slate-900 text-white p-3.5 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-md">
            <div>
              <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">
                Resumen de Costos y Suma General
              </span>
              <div className="flex flex-wrap items-center gap-3 text-xs mt-1 text-slate-300 font-medium">
                <span>Mano de obra: <strong className="text-white">${totalManoObra.toLocaleString('es-AR')}</strong></span>
                <span>•</span>
                <span>Repuestos / Insumos: <strong className="text-white">${totalRepuestos.toLocaleString('es-AR')}</strong></span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">TOTAL GENERAL</span>
              <span className="text-2xl font-extrabold text-amber-400">${calculateTotal().toLocaleString('es-AR')}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
            <div className="flex items-center gap-4">
              {onDeleteOrder && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Eliminar Orden
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleSaveChanges}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Order Deletion inside Detail Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2 bg-rose-50 rounded-xl">
                <Trash2 className="w-6 h-6 text-rose-600" />
              </div>
              <h3 className="font-bold text-base text-slate-900">¿Eliminar Orden de Trabajo?</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              ¿Estás seguro de eliminar la Orden de Trabajo <strong className="text-slate-900">{order.numeroOrden}</strong>? Esta acción borrará la orden de la base de datos y no se puede deshacer.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  if (onDeleteOrder) {
                    onDeleteOrder(order.id);
                  }
                  onClose();
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
              >
                Sí, Eliminar Orden
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
