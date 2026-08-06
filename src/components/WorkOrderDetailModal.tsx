import { useState } from 'react';
import { WorkOrder, OrderStatus, InventoryItem, Mechanic } from '../types/tallerya';
import { Wrench, Car, User, Phone, CheckCircle2, Clock, Plus, Trash2, Save, Printer, Users, CheckSquare, Sparkles } from 'lucide-react';

interface WorkOrderDetailModalProps {
  order: WorkOrder;
  inventory: InventoryItem[];
  mechanics?: Mechanic[];
  onClose: () => void;
  onUpdateOrder: (updated: WorkOrder) => void;
  onOpenMechanicsModal?: () => void;
}

const STATUS_CONFIG: Record<OrderStatus, { label: string; bg: string; text: string; border: string }> = {
  ingresado: { label: 'Ingresado', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  diagnostico: { label: 'En Diagnóstico', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  reparacion: { label: 'En Reparación', bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
  repuestos: { label: 'Esperando Repuesto', bg: 'bg-orange-50', text: 'text-orange-800', border: 'border-orange-200' },
  listo: { label: 'Listo p/ Entrega', bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200' },
  entregado: { label: 'Entregado', bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' },
};

export function WorkOrderDetailModal({
  order,
  inventory,
  mechanics = [],
  onClose,
  onUpdateOrder,
  onOpenMechanicsModal,
}: WorkOrderDetailModalProps) {
  const [estado, setEstado] = useState<OrderStatus>(order.estado);
  const [diagnostico, setDiagnostico] = useState(order.diagnosticoTecnico || '');
  const [mecanico, setMecanico] = useState(order.mecanicoAsignado || 'Mecanico Juan Pérez');
  const [servicios, setServicios] = useState(order.servicios || []);

  // Form for adding a new service or parts line
  const [nuevaTarea, setNuevaTarea] = useState('');
  const [manoObra, setManoObra] = useState(25000);
  const [selectedPartId, setSelectedPartId] = useState('');

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

  const calculateTotal = () => {
    return servicios.reduce((total, s) => {
      const partsTotal = s.repuestosUtilizados.reduce(
        (pSum, p) => pSum + p.cantidad * p.precioUnitario,
        0
      );
      return total + s.costoManoObra + partsTotal;
    }, 0);
  };

  const handleSaveChanges = () => {
    const totalEst = calculateTotal();
    const updated: WorkOrder = {
      ...order,
      estado,
      diagnosticoTecnico: diagnostico,
      mecanicoAsignado: mecanico,
      servicios,
      totalEstimado: totalEst,
    };

    onUpdateOrder(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200 my-8">
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-900 text-xl">{order.numeroOrden}</span>
              <span className="px-2.5 py-1 bg-slate-900 text-amber-400 font-mono font-bold text-xs rounded-lg">
                {order.vehiculo.patente}
              </span>
            </div>
            <p className="text-xs text-slate-500">Ingresado el: {new Date(order.fechaIngreso).toLocaleString('es-ES')}</p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value as OrderStatus)}
              className={`text-xs font-bold px-3 py-1.5 rounded-xl border ${STATUS_CONFIG[estado].bg} ${STATUS_CONFIG[estado].text} ${STATUS_CONFIG[estado].border}`}
            >
              {Object.keys(STATUS_CONFIG).map((stKey) => (
                <option key={stKey} value={stKey}>
                  Estado: {STATUS_CONFIG[stKey as OrderStatus].label}
                </option>
              ))}
            </select>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 text-xl font-bold px-2"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Info Grid: Client & Vehicle */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
          <div className="space-y-1">
            <p className="font-bold text-slate-400 uppercase text-[10px] tracking-wider">Vehículo</p>
            <p className="font-bold text-slate-900 text-sm">
              {order.vehiculo.marca} {order.vehiculo.modelo} ({order.vehiculo.anio})
            </p>
            <p className="text-slate-600">KM: {order.vehiculo.kilometraje.toLocaleString()} km • Combustible: {order.vehiculo.nivelCombustible}</p>
            {order.vehiculo.observacionesVisuales && (
              <p className="text-amber-700 bg-amber-50 p-1.5 rounded border border-amber-200 text-[11px]">
                Obs: {order.vehiculo.observacionesVisuales}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <p className="font-bold text-slate-400 uppercase text-[10px] tracking-wider">Propietario / Cliente</p>
            <p className="font-bold text-slate-900 text-sm">{order.clienteNombre}</p>
            <p className="text-slate-600 flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              {order.clienteTelefono}
            </p>
            <div className="pt-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-slate-500">Mecánico Asignado:</label>
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
                className="w-full mt-0.5 p-1 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-900"
              >
                {/* Ensure current assigned mechanic is always an option even if custom */}
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
        </div>

        {/* Maintenance Checklist Card (If present) */}
        {order.mantenimiento && (
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-emerald-900 flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4 text-emerald-600" />
                Service de Mantenimiento Preventivo ({order.mantenimiento.intervaloKm?.toLocaleString() || 10000} km)
              </span>
              {order.mantenimiento.proximoKmService && (
                <span className="bg-emerald-600 text-white font-extrabold text-[10px] px-2.5 py-0.5 rounded-full">
                  Próximo Service: {order.mantenimiento.proximoKmService.toLocaleString()} km
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
            <p className="text-xs text-slate-800 bg-slate-100 p-3 rounded-xl border border-slate-200 mt-1 italic">
              "{order.fallaReportada}"
            </p>
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
                className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs"
              >
                <div className="space-y-1">
                  <p className="font-bold text-slate-900">{serv.descripcion}</p>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                    <span>Mano de obra: ${serv.costoManoObra.toLocaleString('es-AR')}</span>
                    {serv.repuestosUtilizados.map((r, i) => (
                      <span key={i} className="bg-amber-100 text-amber-900 font-semibold px-2 py-0.5 rounded">
                        {r.nombreRepuesto} (${r.precioUnitario.toLocaleString('es-AR')})
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveService(serv.id)}
                  className="p-1.5 text-rose-500 hover:text-rose-700"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
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

        {/* Footer Bar */}
        <div className="flex flex-wrap items-center justify-between border-t border-slate-200 pt-4 gap-4">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase">Total Estimado</span>
            <p className="text-xl font-extrabold text-slate-900">${calculateTotal().toLocaleString('es-AR')}</p>
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
  );
}
