import React, { useState } from 'react';
import { WorkOrder, Client, Vehicle, Mechanic } from '../types/tallerya';
import { Car, User, Wrench, ShieldAlert, Users, Plus } from 'lucide-react';

interface NewWorkOrderModalProps {
  clients: Client[];
  mechanics?: Mechanic[];
  preselectedClient?: Client;
  preselectedVehicle?: Vehicle;
  onClose: () => void;
  onCreateOrder: (order: WorkOrder) => void;
  onOpenMechanicsModal?: () => void;
}

export function NewWorkOrderModal({
  clients,
  mechanics = [],
  preselectedClient,
  preselectedVehicle,
  onClose,
  onCreateOrder,
  onOpenMechanicsModal,
}: NewWorkOrderModalProps) {
  // Client selection or new entry
  const [selectedClientId, setSelectedClientId] = useState<string>(preselectedClient?.id || '');
  const [clienteNombre, setClienteNombre] = useState(preselectedClient?.nombre || '');
  const [clienteTelefono, setClienteTelefono] = useState(preselectedClient?.telefono || '');

  // Vehicle Info
  const [patente, setPatente] = useState(preselectedVehicle?.patente || '');
  const [marca, setMarca] = useState(preselectedVehicle?.marca || '');
  const [modelo, setModelo] = useState(preselectedVehicle?.modelo || '');
  const [anio, setAnio] = useState<number>(preselectedVehicle?.anio || 2021);
  const [kilometraje, setKilometraje] = useState<number>(preselectedVehicle?.kilometraje || 60000);
  const [nivelCombustible, setNivelCombustible] = useState<Vehicle['nivelCombustible']>(
    preselectedVehicle?.nivelCombustible || '1/2'
  );
  const [observacionesVisuales, setObservacionesVisuales] = useState(
    preselectedVehicle?.observacionesVisuales || ''
  );

  // Fault & Mechanic
  const [fallaReportada, setFallaReportada] = useState('');
  const [mecanicoAsignado, setMecanicoAsignado] = useState('Mecanico Juan Pérez');
  const [totalEstimado, setTotalEstimado] = useState(50000);

  const handleSelectClient = (clientId: string) => {
    setSelectedClientId(clientId);
    const found = clients.find((c) => c.id === clientId);
    if (found) {
      setClienteNombre(found.nombre);
      setClienteTelefono(found.telefono);
      if (found.vehiculos.length > 0) {
        const v = found.vehiculos[0];
        setPatente(v.patente);
        setMarca(v.marca);
        setModelo(v.modelo);
        setAnio(v.anio);
        setKilometraje(v.kilometraje);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteNombre.trim() || !patente.trim() || !fallaReportada.trim()) return;

    const vehicle: Vehicle = {
      id: 'v_' + Date.now(),
      patente: patente.toUpperCase().trim(),
      marca: marca.trim() || 'Vehículo',
      modelo: modelo.trim() || 'Modelo',
      anio: Number(anio) || 2020,
      kilometraje: Number(kilometraje) || 0,
      nivelCombustible,
      observacionesVisuales: observacionesVisuales.trim(),
    };

    const newOrder: WorkOrder = {
      id: 'wo_' + Date.now(),
      numeroOrden: `OT-${Math.floor(1040 + Math.random() * 500)}`,
      fechaIngreso: new Date().toISOString(),
      clienteId: selectedClientId || 'c_' + Date.now(),
      clienteNombre: clienteNombre.trim(),
      clienteTelefono: clienteTelefono.trim(),
      vehiculo: vehicle,
      fallaReportada: fallaReportada.trim(),
      estado: 'ingresado',
      mecanicoAsignado,
      servicios: [],
      totalEstimado: Number(totalEstimado) || 0,
    };

    onCreateOrder(newOrder);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-slate-200 my-8">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-slate-900 text-lg">Ingreso de Vehículo - Nueva Órden de Trabajo</h3>
            <p className="text-xs text-slate-500">Formulario de recepción y check-in inicial</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-xl font-bold"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Client Selection */}
          <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600 flex items-center gap-1">
              <User className="w-4 h-4" />
              1. Propietario / Cliente
            </h4>

            {clients.length > 0 && (
              <div>
                <label className="text-[11px] font-semibold text-slate-500">Seleccionar Cliente Existente:</label>
                <select
                  value={selectedClientId}
                  onChange={(e) => handleSelectClient(e.target.value)}
                  className="w-full mt-1 p-2 bg-white border border-slate-200 rounded-lg text-xs"
                >
                  <option value="">-- O registrar nuevo cliente --</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} ({c.telefono})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700">Nombre Cliente *</label>
                <input
                  type="text"
                  required
                  value={clienteNombre}
                  onChange={(e) => setClienteNombre(e.target.value)}
                  placeholder="Ej. Carlos Rodríguez"
                  className="w-full mt-1 p-2 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700">Teléfono / WhatsApp</label>
                <input
                  type="text"
                  value={clienteTelefono}
                  onChange={(e) => setClienteTelefono(e.target.value)}
                  placeholder="+54 9 11..."
                  className="w-full mt-1 p-2 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>
          </div>

          {/* Vehicle Check-In */}
          <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600 flex items-center gap-1">
              <Car className="w-4 h-4" />
              2. Ficha del Vehículo
            </h4>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700">Patente *</label>
                <input
                  type="text"
                  required
                  value={patente}
                  onChange={(e) => setPatente(e.target.value)}
                  placeholder="AE 452 XY"
                  className="w-full mt-1 p-2 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold uppercase text-amber-900 bg-amber-50/50"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700">Marca</label>
                <input
                  type="text"
                  value={marca}
                  onChange={(e) => setMarca(e.target.value)}
                  placeholder="Toyota"
                  className="w-full mt-1 p-2 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700">Modelo</label>
                <input
                  type="text"
                  value={modelo}
                  onChange={(e) => setModelo(e.target.value)}
                  placeholder="Hilux"
                  className="w-full mt-1 p-2 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700">Año</label>
                <input
                  type="number"
                  value={anio}
                  onChange={(e) => setAnio(Number(e.target.value))}
                  className="w-full mt-1 p-2 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700">Kilometraje</label>
                <input
                  type="number"
                  value={kilometraje}
                  onChange={(e) => setKilometraje(Number(e.target.value))}
                  className="w-full mt-1 p-2 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700">Nivel Combustible</label>
                <select
                  value={nivelCombustible}
                  onChange={(e) => setNivelCombustible(e.target.value as any)}
                  className="w-full mt-1 p-2 bg-white border border-slate-200 rounded-lg text-xs"
                >
                  <option value="Reserva">Reserva</option>
                  <option value="1/4">1/4 Tanque</option>
                  <option value="1/2">1/2 Tanque</option>
                  <option value="3/4">3/4 Tanque</option>
                  <option value="Lleno">Lleno</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">Observaciones visuales (rayones, golpes...)</label>
              <input
                type="text"
                value={observacionesVisuales}
                onChange={(e) => setObservacionesVisuales(e.target.value)}
                placeholder="Ej. Pequeño rayón en paragolpes trasero"
                className="w-full mt-1 p-2 bg-white border border-slate-200 rounded-lg text-xs"
              />
            </div>
          </div>

          {/* Fault & Estimate */}
          <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600 flex items-center gap-1">
              <Wrench className="w-4 h-4" />
              3. Falla y Asignación
            </h4>

            <div>
              <label className="text-xs font-semibold text-slate-700">Falla reportada por el cliente *</label>
              <textarea
                required
                rows={2}
                value={fallaReportada}
                onChange={(e) => setFallaReportada(e.target.value)}
                placeholder="Ej. Service 80.000km, ruido al frenar en caliente, cambio de filtro..."
                className="w-full mt-1 p-2 bg-white border border-slate-200 rounded-lg text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">Mecánico Asignado</label>
                  {onOpenMechanicsModal && (
                    <button
                      type="button"
                      onClick={onOpenMechanicsModal}
                      className="text-[11px] font-bold text-amber-600 hover:text-amber-700 hover:underline flex items-center gap-1"
                    >
                      <Users className="w-3 h-3" />
                      <span>Gestionar Lista</span>
                    </button>
                  )}
                </div>

                <div className="flex gap-1.5">
                  <select
                    value={mecanicoAsignado}
                    onChange={(e) => {
                      if (e.target.value === '__NEW__') {
                        const newName = prompt('Nombre del nuevo mecánico / personal:');
                        if (newName && newName.trim()) {
                          setMecanicoAsignado(newName.trim());
                        }
                      } else {
                        setMecanicoAsignado(e.target.value);
                      }
                    }}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-900"
                  >
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
                        <option value="Juan Pérez">Juan Pérez (Mecánico General)</option>
                        <option value="Pedro Gómez">Pedro Gómez (Frenos & Tren Delantero)</option>
                        <option value="Ing. Marcelo R.">Marcelo R. (Diagnóstico Electrónico)</option>
                      </>
                    )}
                    <option value="__NEW__" className="font-bold text-amber-700 bg-amber-50">
                      + Agregar / Escribir otro mecánico...
                    </option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">Monto Estimado Inicial ($)</label>
                <input
                  type="number"
                  value={totalEstimado}
                  onChange={(e) => setTotalEstimado(Number(e.target.value))}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-xs"
            >
              Crear Órden de Trabajo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
