import React, { useState } from 'react';
import { WorkOrder, Client, Vehicle, Mechanic, MantenimientoChecklist } from '../types/tallerya';
import { Car, User, Wrench, ShieldAlert, Users, Plus, CheckSquare, Sparkles, Clock, Check } from 'lucide-react';

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

  // Maintenance Checklist
  const [enableMaintenance, setEnableMaintenance] = useState(false);
  const [intervaloKm, setIntervaloKm] = useState<number>(10000);
  const [filtroAceite, setFiltroAceite] = useState(true);
  const [filtroAire, setFiltroAire] = useState(true);
  const [filtroCombustible, setFiltroCombustible] = useState(false);
  const [filtroHabitaculo, setFiltroHabitaculo] = useState(false);
  const [filtroCajaATF, setFiltroCajaATF] = useState(false);
  const [aceiteMotor, setAceiteMotor] = useState(true);
  const [tipoAceiteMotor, setTipoAceiteMotor] = useState('5W30 Sintético');
  const [aceiteCajaAutomatica, setAceiteCajaAutomatica] = useState(false);
  const [correaDistribucion, setCorreaDistribucion] = useState(false);
  const [bujias, setBujias] = useState(false);
  const [pastillasFreno, setPastillasFreno] = useState(false);

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

  const applyIntervalDefaults = (km: number) => {
    setIntervaloKm(km);
    setEnableMaintenance(true);

    if (km === 5000 || km === 7000 || km === 10000) {
      setFiltroAceite(true);
      setFiltroAire(true);
      setAceiteMotor(true);
      setFiltroCombustible(km >= 10000);
      setFiltroHabitaculo(km >= 10000);
      setFiltroCajaATF(false);
      setAceiteCajaAutomatica(false);
    } else if (km === 20000) {
      setFiltroAceite(true);
      setFiltroAire(true);
      setFiltroCombustible(true);
      setFiltroHabitaculo(true);
      setAceiteMotor(true);
      setBujias(true);
      setPastillasFreno(true);
      setFiltroCajaATF(false);
      setAceiteCajaAutomatica(false);
    } else if (km === 50000) {
      setFiltroAceite(true);
      setFiltroAire(true);
      setFiltroCombustible(true);
      setFiltroHabitaculo(true);
      setAceiteMotor(true);
      setAceiteCajaAutomatica(true); // Caja Automática ATF
      setFiltroCajaATF(true); // Filtro Caja ATF
    } else if (km === 100000) {
      setFiltroAceite(true);
      setFiltroAire(true);
      setFiltroCombustible(true);
      setFiltroHabitaculo(true);
      setAceiteMotor(true);
      setAceiteCajaAutomatica(true);
      setFiltroCajaATF(true);
      setCorreaDistribucion(true); // Correa de Distribución
      setBujias(true);
    }
  };

  const autoFillMaintenanceSummary = () => {
    const items: string[] = [];
    if (aceiteMotor) items.push(`Aceite Motor (${tipoAceiteMotor})`);
    if (filtroAceite) items.push('Filtro de Aceite');
    if (filtroAire) items.push('Filtro de Aire');
    if (filtroCombustible) items.push('Filtro de Combustible');
    if (filtroHabitaculo) items.push('Filtro de Habitáculo/AA');
    if (filtroCajaATF) items.push('Filtro de Caja ATF');
    if (aceiteCajaAutomatica) items.push('Aceite Caja Automática (ATF)');
    if (correaDistribucion) items.push('Kit Correa de Distribución');
    if (bujias) items.push('Juego de Bujías');
    if (pastillasFreno) items.push('Pastillas de Freno');

    const nextKm = Number(kilometraje || 0) + Number(intervaloKm || 10000);
    const summary = `Mantenimiento Preventivo ${intervaloKm.toLocaleString()} km. Incluye: ${items.join(', ')}. Próximo service a los ${nextKm.toLocaleString()} km.`;

    if (fallaReportada) {
      setFallaReportada((prev) => `${prev}\n[${summary}]`);
    } else {
      setFallaReportada(summary);
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

    const mantenimientoObj: MantenimientoChecklist | undefined = enableMaintenance
      ? {
          intervaloKm,
          filtroAceite,
          filtroAire,
          filtroCombustible,
          filtroHabitaculo,
          filtroCajaATF,
          aceiteMotor,
          tipoAceiteMotor,
          aceiteCajaAutomatica,
          correaDistribucion,
          bujias,
          pastillasFreno,
          proximoKmService: Number(kilometraje || 0) + Number(intervaloKm || 10000),
        }
      : undefined;

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
      mantenimiento: mantenimientoObj,
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

          {/* Maintenance & Service Section */}
          <div className="space-y-3 bg-emerald-50/60 p-4 rounded-xl border border-emerald-200">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4 text-emerald-600" />
                3. Service / Mantenimiento Preventivo por Kilometraje
              </h4>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-emerald-900 bg-white px-2.5 py-1 rounded-lg border border-emerald-300">
                <input
                  type="checkbox"
                  checked={enableMaintenance}
                  onChange={(e) => setEnableMaintenance(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>Activar Service</span>
              </label>
            </div>

            <p className="text-[11px] text-slate-600">
              Selecciona el intervalo de mantenimiento para cargar automáticamente filtros, lubricantes, caja automática o correa de distribución.
            </p>

            {/* Quick Interval Selector Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] font-bold text-slate-600 mr-1">Intervalos:</span>
              {[
                { km: 5000, label: '5.000 km' },
                { km: 7000, label: '7.000 km' },
                { km: 10000, label: '10.000 km (Estándar)' },
                { km: 20000, label: '20.000 km' },
                { km: 50000, label: '50.000 km (Caja ATF)' },
                { km: 100000, label: '100.000 km (Distribución)' },
              ].map((item) => (
                <button
                  key={item.km}
                  type="button"
                  onClick={() => applyIntervalDefaults(item.km)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border ${
                    enableMaintenance && intervaloKm === item.km
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-emerald-100'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Checklist Items */}
            {enableMaintenance && (
              <div className="space-y-3 pt-2 border-t border-emerald-200">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs text-slate-800">
                  <label className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 font-medium">
                    <input
                      type="checkbox"
                      checked={filtroAceite}
                      onChange={(e) => setFiltroAceite(e.target.checked)}
                      className="rounded text-emerald-600"
                    />
                    <span>Filtro de Aceite</span>
                  </label>

                  <label className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 font-medium">
                    <input
                      type="checkbox"
                      checked={filtroAire}
                      onChange={(e) => setFiltroAire(e.target.checked)}
                      className="rounded text-emerald-600"
                    />
                    <span>Filtro de Aire</span>
                  </label>

                  <label className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 font-medium">
                    <input
                      type="checkbox"
                      checked={filtroCombustible}
                      onChange={(e) => setFiltroCombustible(e.target.checked)}
                      className="rounded text-emerald-600"
                    />
                    <span>Filtro Combustible</span>
                  </label>

                  <label className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 font-medium">
                    <input
                      type="checkbox"
                      checked={filtroHabitaculo}
                      onChange={(e) => setFiltroHabitaculo(e.target.checked)}
                      className="rounded text-emerald-600"
                    />
                    <span>Filtro Habitáculo (A/A)</span>
                  </label>

                  <label className={`flex items-center gap-2 p-2 rounded-lg border font-semibold ${
                    filtroCajaATF
                      ? 'bg-amber-50 border-amber-300 text-amber-950'
                      : 'bg-white border-slate-200 text-slate-800'
                  }`}>
                    <input
                      type="checkbox"
                      checked={filtroCajaATF}
                      onChange={(e) => setFiltroCajaATF(e.target.checked)}
                      className="rounded text-amber-600"
                    />
                    <span>Filtro Caja ATF</span>
                  </label>

                  <label className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 font-medium">
                    <input
                      type="checkbox"
                      checked={aceiteMotor}
                      onChange={(e) => setAceiteMotor(e.target.checked)}
                      className="rounded text-emerald-600"
                    />
                    <span>Aceite de Motor</span>
                  </label>

                  <label className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 font-medium">
                    <input
                      type="checkbox"
                      checked={bujias}
                      onChange={(e) => setBujias(e.target.checked)}
                      className="rounded text-emerald-600"
                    />
                    <span>Bujías de Encendido</span>
                  </label>

                  {/* Special heavy interval items */}
                  <label className={`flex items-center gap-2 p-2 rounded-lg border font-bold ${
                    aceiteCajaAutomatica
                      ? 'bg-amber-100 border-amber-300 text-amber-900'
                      : 'bg-white border-slate-200 text-slate-800'
                  }`}>
                    <input
                      type="checkbox"
                      checked={aceiteCajaAutomatica}
                      onChange={(e) => setAceiteCajaAutomatica(e.target.checked)}
                      className="rounded text-amber-600"
                    />
                    <span>Aceite Caja Auto (ATF)</span>
                  </label>

                  <label className={`flex items-center gap-2 p-2 rounded-lg border font-bold ${
                    correaDistribucion
                      ? 'bg-rose-100 border-rose-300 text-rose-900'
                      : 'bg-white border-slate-200 text-slate-800'
                  }`}>
                    <input
                      type="checkbox"
                      checked={correaDistribucion}
                      onChange={(e) => setCorreaDistribucion(e.target.checked)}
                      className="rounded text-rose-600"
                    />
                    <span>Correa de Distribución</span>
                  </label>

                  <label className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 font-medium">
                    <input
                      type="checkbox"
                      checked={pastillasFreno}
                      onChange={(e) => setPastillasFreno(e.target.checked)}
                      className="rounded text-emerald-600"
                    />
                    <span>Pastillas de Freno</span>
                  </label>
                </div>

                {/* Oil Type & Next Service Calculation */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700">Tipo / Viscosidad Aceite Motor:</label>
                    <input
                      type="text"
                      value={tipoAceiteMotor}
                      onChange={(e) => setTipoAceiteMotor(e.target.value)}
                      placeholder="Ej. 5W30 Sintético, 10W40 Semisintético"
                      className="w-full mt-1 p-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                    />
                  </div>

                  <div className="bg-emerald-100/70 p-2.5 rounded-xl border border-emerald-300 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Próximo Service Sugerido</p>
                      <p className="text-sm font-extrabold text-emerald-950">
                        {(Number(kilometraje || 0) + Number(intervaloKm || 10000)).toLocaleString()} km
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={autoFillMaintenanceSummary}
                      className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] rounded-lg shadow-xs flex items-center gap-1 transition-all"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>Copiar a Falla</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Fault & Estimate */}
          <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600 flex items-center gap-1">
              <Wrench className="w-4 h-4" />
              4. Falla / Trabajos Solicitados y Asignación
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
