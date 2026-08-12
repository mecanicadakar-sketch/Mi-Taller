import React, { useState } from 'react';
import { Client, Vehicle, WorkOrder, OrderStatus } from '../types/tallerya';
import {
  Search,
  UserPlus,
  Phone,
  Mail,
  Car,
  Plus,
  Wrench,
  Edit3,
  Save,
  MapPin,
  Trash2,
  Calendar,
  AlertTriangle,
  RefreshCw,
  CheckSquare,
  Square,
  History,
  FileText,
  Clock,
  CheckCircle2,
  X,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ExternalLink,
  Building2,
  User,
  ShieldCheck,
} from 'lucide-react';
import { matchesQuery } from '../utils/searchUtils';
import { formatDateSpanish, parseAndNormalizeDate } from '../utils/dateUtils';

interface ClientsViewProps {
  clients: Client[];
  workOrders?: WorkOrder[];
  onAddClient: (client: Client) => void;
  onUpdateClient?: (client: Client) => void;
  onDeleteClient?: (clientId: string) => void;
  onDeleteMultipleClients?: (clientIds: string[]) => Promise<void>;
  onNewWorkOrderForVehicle: (client: Client, vehicle: Vehicle) => void;
  searchTerm?: string;
  setSearchTerm?: (term: string) => void;
}

export function ClientsView({
  clients,
  workOrders = [],
  onAddClient,
  onUpdateClient,
  onDeleteClient,
  onDeleteMultipleClients,
  onNewWorkOrderForVehicle,
  searchTerm = '',
  setSearchTerm,
}: ClientsViewProps) {
  const [localSearch, setLocalSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);

  // Vehicle History Modal State
  const [selectedVehicleHistory, setSelectedVehicleHistory] = useState<{ client: Client; vehicle: Vehicle } | null>(null);
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // Batch deletion state
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);

  // Edit Client Modal State
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [editTelefono, setEditTelefono] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editDireccion, setEditDireccion] = useState('');
  const [editFechaRegistro, setEditFechaRegistro] = useState('');

  // Add / Edit Vehicle Modal State
  const [targetClientForVehicle, setTargetClientForVehicle] = useState<Client | null>(null);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [vehPatente, setVehPatente] = useState('');
  const [vehMarca, setVehMarca] = useState('');
  const [vehModelo, setVehModelo] = useState('');
  const [vehAnio, setVehAnio] = useState(2022);
  const [vehKm, setVehKm] = useState(50000);
  const [vehCombustible, setVehCombustible] = useState<'1/4' | '1/2' | '3/4' | 'Lleno' | 'Reserva'>('1/2');
  const [vehFechaRegistro, setVehFechaRegistro] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // New Client Form State
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [direccion, setDireccion] = useState('');
  const [fechaRegistro, setFechaRegistro] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // Vehicle sub-form inside client creation
  const [patente, setPatente] = useState('');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [anio, setAnio] = useState(2022);
  const [kilometraje, setKilometraje] = useState(50000);

  const activeSearch = searchTerm !== undefined && searchTerm !== '' ? searchTerm : localSearch;

  const filteredClients = clients.filter((c) => {
    const q = activeSearch.trim();
    if (!q) return true;
    return (
      matchesQuery(c.nombre, q) ||
      matchesQuery(c.telefono, q) ||
      matchesQuery(c.email, q) ||
      c.vehiculos?.some(
        (v) =>
          matchesQuery(v.patente, q) ||
          matchesQuery(v.marca, q) ||
          matchesQuery(v.modelo, q)
      )
    );
  });

  const handleSaveClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !telefono.trim()) return;

    const newVehicle: Vehicle = {
      id: 'v_' + Date.now(),
      patente: patente.toUpperCase().trim() || 'S/N',
      marca: marca.trim() || 'Genérico',
      modelo: modelo.trim() || 'Modelo',
      anio: Number(anio) || 2020,
      kilometraje: Number(kilometraje) || 0,
      nivelCombustible: '1/2',
      createdAt: parseAndNormalizeDate(fechaRegistro),
    };

    const newClient: Client = {
      id: 'c_' + Date.now(),
      nombre: nombre.trim(),
      telefono: telefono.trim(),
      email: email.trim(),
      direccion: direccion.trim(),
      vehiculos: [newVehicle],
      createdAt: parseAndNormalizeDate(fechaRegistro),
    };

    onAddClient(newClient);
    setShowAddModal(false);

    // Reset Form
    setNombre('');
    setTelefono('');
    setEmail('');
    setDireccion('');
    setPatente('');
    setMarca('');
    setModelo('');
    setFechaRegistro(new Date().toISOString().split('T')[0]);
  };

  const openEditClientModal = (client: Client) => {
    setEditingClient(client);
    setEditNombre(client.nombre || '');
    setEditTelefono(client.telefono || '');
    setEditEmail(client.email || '');
    setEditDireccion(client.direccion || '');
    setEditFechaRegistro(client.createdAt ? client.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]);
  };

  const handleUpdateClientSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient || !editNombre.trim()) return;

    const updated: Client = {
      ...editingClient,
      nombre: editNombre.trim(),
      telefono: editTelefono.trim(),
      email: editEmail.trim(),
      direccion: editDireccion.trim(),
      createdAt: parseAndNormalizeDate(editFechaRegistro),
    };

    if (onUpdateClient) {
      onUpdateClient(updated);
    } else {
      onAddClient(updated);
    }
    setEditingClient(null);
  };

  const openVehicleModal = (client: Client, vehicle?: Vehicle) => {
    setTargetClientForVehicle(client);
    if (vehicle) {
      setEditingVehicle(vehicle);
      setVehPatente(vehicle.patente);
      setVehMarca(vehicle.marca);
      setVehModelo(vehicle.modelo);
      setVehAnio(vehicle.anio);
      setVehKm(vehicle.kilometraje);
      setVehCombustible(vehicle.nivelCombustible || '1/2');
      setVehFechaRegistro(vehicle.createdAt ? vehicle.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]);
    } else {
      setEditingVehicle(null);
      setVehPatente('');
      setVehMarca('');
      setVehModelo('');
      setVehAnio(2022);
      setVehKm(50000);
      setVehCombustible('1/2');
      setVehFechaRegistro(new Date().toISOString().split('T')[0]);
    }
  };

  const handleSaveVehicleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetClientForVehicle) return;

    let updatedVehicles = [...(targetClientForVehicle.vehiculos || [])];

    if (editingVehicle) {
      updatedVehicles = updatedVehicles.map((v) =>
        v.id === editingVehicle.id
          ? {
              ...v,
              patente: vehPatente.toUpperCase().trim(),
              marca: vehMarca.trim(),
              modelo: vehModelo.trim(),
              anio: Number(vehAnio) || 2020,
              kilometraje: Number(vehKm) || 0,
              nivelCombustible: vehCombustible,
              createdAt: parseAndNormalizeDate(vehFechaRegistro),
            }
          : v
      );
    } else {
      const newV: Vehicle = {
        id: 'v_' + Date.now(),
        patente: vehPatente.toUpperCase().trim() || 'S/N',
        marca: vehMarca.trim() || 'Genérico',
        modelo: vehModelo.trim() || 'Modelo',
        anio: Number(vehAnio) || 2020,
        kilometraje: Number(vehKm) || 0,
        nivelCombustible: vehCombustible,
        createdAt: parseAndNormalizeDate(vehFechaRegistro),
      };
      updatedVehicles.push(newV);
    }

    const updatedClient: Client = {
      ...targetClientForVehicle,
      vehiculos: updatedVehicles,
    };

    if (onUpdateClient) {
      onUpdateClient(updatedClient);
    } else {
      onAddClient(updatedClient);
    }

    setTargetClientForVehicle(null);
    setEditingVehicle(null);
  };

  const toggleSelectClient = (id: string) => {
    setSelectedClientIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const allFilteredAreSelected =
    filteredClients.length > 0 &&
    filteredClients.every((c) => selectedClientIds.includes(c.id));

  const toggleSelectAllFiltered = () => {
    if (allFilteredAreSelected) {
      const filteredIds = new Set(filteredClients.map((c) => c.id));
      setSelectedClientIds((prev) => prev.filter((id) => !filteredIds.has(id)));
    } else {
      const filteredIds = filteredClients.map((c) => c.id);
      setSelectedClientIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const handleConfirmBatchDelete = async () => {
    if (selectedClientIds.length === 0) return;
    setIsBatchDeleting(true);
    try {
      if (onDeleteMultipleClients) {
        await onDeleteMultipleClients(selectedClientIds);
      } else if (onDeleteClient) {
        for (const id of selectedClientIds) {
          await onDeleteClient(id);
        }
      }
      setSelectedClientIds([]);
      setShowBatchDeleteConfirm(false);
    } catch (e) {
      console.error('Error eliminando clientes en lote:', e);
    } finally {
      setIsBatchDeleting(false);
    }
  };

  return (
    <div className="p-6 space-y-6 relative pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Clientes y Vehículos</h2>
          <p className="text-xs text-slate-500">Registro de propietarios y fichas técnicas de sus vehículos</p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-all flex items-center gap-1.5"
        >
          <UserPlus className="w-4 h-4 stroke-[2.5]" />
          Nuevo Cliente
        </button>
      </div>

      {/* Search & Selection Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative max-w-md flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={activeSearch}
            onChange={(e) => {
              if (setSearchTerm) setSearchTerm(e.target.value);
              setLocalSearch(e.target.value);
            }}
            placeholder="Buscar por cliente, teléfono o patente..."
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          />
        </div>

        {filteredClients.length > 0 && (
          <button
            type="button"
            onClick={toggleSelectAllFiltered}
            className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl font-bold text-xs shadow-xs transition-colors flex items-center gap-2 justify-center shrink-0"
          >
            {allFilteredAreSelected ? (
              <CheckSquare className="w-4 h-4 text-amber-500" />
            ) : (
              <Square className="w-4 h-4 text-slate-400" />
            )}
            <span>{allFilteredAreSelected ? 'Desmarcar Visibles' : 'Marcar Visibles'}</span>
          </button>
        )}
      </div>

      {/* Client List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredClients.map((client) => {
          const isSelected = selectedClientIds.includes(client.id);

          return (
            <div
              key={client.id}
              className={`bg-white rounded-xl border p-5 space-y-4 transition-all shadow-xs ${
                isSelected
                  ? 'border-red-400 ring-2 ring-red-500/20 bg-red-50/20'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Client Info */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => toggleSelectClient(client.id)}
                    className="mt-0.5 text-slate-400 hover:text-red-500 transition-colors"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-5 h-5 text-red-500" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-300" />
                    )}
                  </button>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900 text-base">{client.nombre}</h3>
                      <button
                        onClick={() => openEditClientModal(client)}
                        title="Editar datos del cliente"
                        className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      {onDeleteClient && (
                        <button
                          onClick={() => setClientToDelete(client)}
                          title="Eliminar cliente"
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    {client.telefono}
                  </span>
                  {client.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      {client.email}
                    </span>
                  )}
                  {client.direccion && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {client.direccion}
                    </span>
                  )}
                  {client.createdAt && (
                    <span className="flex items-center gap-1 text-slate-400">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Registrado: {formatDateSpanish(client.createdAt)}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

              <div className="flex flex-col items-end gap-1.5">
                <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-bold text-xs rounded-lg">
                  {client.vehiculos.length} vehículo(s)
                </span>
                <button
                  onClick={() => openVehicleModal(client)}
                  className="text-[11px] font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-0.5 hover:underline"
                >
                  <Plus className="w-3 h-3" />
                  Vehículo
                </button>
              </div>
            </div>

            {/* Vehicles list for this client */}
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Vehículos Asignados
              </span>

              {client.vehiculos.map((v) => {
                const vehicleWorkOrders = (workOrders || []).filter((wo) => {
                  const woPat = wo.vehiculo?.patente?.toUpperCase().trim() || '';
                  const vehPat = v.patente?.toUpperCase().trim() || '';
                  return (
                    (woPat && vehPat && woPat === vehPat) ||
                    (wo.vehiculo?.id && v.id && wo.vehiculo.id === v.id)
                  );
                });

                return (
                  <div
                    key={v.id}
                    className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:border-slate-300 hover:bg-amber-50/20 transition-all"
                  >
                    <div
                      onClick={() => {
                        setSelectedVehicleHistory({ client, vehicle: v });
                        setHistorySearchQuery('');
                      }}
                      className="flex items-center gap-3 cursor-pointer group flex-1"
                      title="Haz clic para ver el historial completo de trabajos realizados sobre este vehículo"
                    >
                      <span className="px-2.5 py-1 bg-slate-900 text-amber-400 font-mono font-bold rounded-lg text-xs group-hover:scale-105 transition-transform shrink-0 shadow-xs">
                        {v.patente}
                      </span>
                      <div>
                        <p className="font-bold text-slate-900 group-hover:text-amber-600 transition-colors flex items-center gap-1.5">
                          <span>{v.marca} {v.modelo} ({v.anio})</span>
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {v.kilometraje.toLocaleString()} km • Combustible: {v.nivelCombustible}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedVehicleHistory({ client, vehicle: v });
                          setHistorySearchQuery('');
                        }}
                        className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold rounded-lg text-xs transition-all flex items-center gap-1 shadow-xs cursor-pointer active:scale-95"
                        title="Ver historial completo de trabajos realizados sobre este vehículo"
                      >
                        <History className="w-3.5 h-3.5 text-amber-400" />
                        <span>Historial ({vehicleWorkOrders.length})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openVehicleModal(client, v)}
                        title="Editar vehículo"
                        className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors border border-slate-200"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`¿Estás seguro de eliminar el vehículo "${v.marca} ${v.modelo} (${v.patente})"?`)) {
                            const updatedVehicles = client.vehiculos.filter((item) => item.id !== v.id);
                            const updatedClient = { ...client, vehiculos: updatedVehicles };
                            if (onUpdateClient) onUpdateClient(updatedClient);
                            else onAddClient(updatedClient);
                          }
                        }}
                        title="Eliminar vehículo"
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-slate-200"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onNewWorkOrderForVehicle(client, v)}
                        className="px-2.5 py-1.5 bg-amber-500 text-slate-950 font-bold rounded-lg hover:bg-amber-400 text-xs transition-colors flex items-center gap-1 shadow-xs"
                        title="Crear nueva orden de trabajo para este vehículo"
                      >
                        <Wrench className="w-3.5 h-3.5" />
                        <span className="hidden lg:inline">Nueva</span> OT
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>

      {/* Floating Batch Action Bar */}
      {selectedClientIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-4 animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center gap-2 font-bold text-xs">
            <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-black">
              {selectedClientIds.length}
            </span>
            <span>Clientes seleccionados</span>
          </div>

          <div className="h-4 w-px bg-slate-700" />

          <button
            onClick={() => setSelectedClientIds([])}
            className="px-2.5 py-1.5 text-slate-400 hover:text-white font-semibold text-xs transition-colors"
          >
            Deseleccionar
          </button>

          <button
            onClick={() => setShowBatchDeleteConfirm(true)}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-1.5"
          >
            <Trash2 className="w-4 h-4" />
            <span>Eliminar Seleccionados ({selectedClientIds.length})</span>
          </button>
        </div>
      )}

      {/* Batch Delete Confirm Modal */}
      {showBatchDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-3 bg-red-50 rounded-2xl">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900">¿Eliminar Clientes Seleccionados?</h3>
                <p className="text-xs text-slate-500">
                  Esta acción eliminará {selectedClientIds.length} clientes.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
              Se eliminarán de forma permanente los clientes seleccionados del sistema. ¿Deseas continuar?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowBatchDeleteConfirm(false)}
                disabled={isBatchDeleting}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleConfirmBatchDelete}
                disabled={isBatchDeleting}
                className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2"
              >
                {isBatchDeleting ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span>{isBatchDeleting ? 'Eliminando...' : 'Sí, Eliminar Seleccionados'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Client Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-lg">Registrar Nuevo Cliente</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveClient} className="space-y-4">
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600">
                  1. Datos Personales del Cliente
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Nombre completo *</label>
                    <input
                      type="text"
                      required
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      placeholder="Ej. Juan Pérez"
                      className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Teléfono *</label>
                    <input
                      type="text"
                      required
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      placeholder="+54 9 11..."
                      className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="cliente@email.com"
                      className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Dirección</label>
                    <input
                      type="text"
                      value={direccion}
                      onChange={(e) => setDireccion(e.target.value)}
                      placeholder="Ciudad, Calle..."
                      className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Fecha de Registro *</label>
                    <input
                      type="date"
                      required
                      value={fechaRegistro}
                      onChange={(e) => setFechaRegistro(e.target.value)}
                      className="w-full mt-1 p-2 bg-amber-50/50 border border-amber-200 rounded-lg text-xs font-bold text-slate-800"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600 flex items-center gap-1">
                  <Car className="w-4 h-4" />
                  2. Vehículo Principal
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Patente *</label>
                    <input
                      type="text"
                      required
                      value={patente}
                      onChange={(e) => setPatente(e.target.value)}
                      placeholder="AE 123 BCD"
                      className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs uppercase font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Marca</label>
                    <input
                      type="text"
                      value={marca}
                      onChange={(e) => setMarca(e.target.value)}
                      placeholder="Toyota, Ford..."
                      className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Modelo</label>
                    <input
                      type="text"
                      value={modelo}
                      onChange={(e) => setModelo(e.target.value)}
                      placeholder="Hilux, Ranger..."
                      className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Año</label>
                    <input
                      type="number"
                      value={anio}
                      onChange={(e) => setAnio(Number(e.target.value))}
                      className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Kilometraje</label>
                    <input
                      type="number"
                      value={kilometraje}
                      onChange={(e) => setKilometraje(Number(e.target.value))}
                      className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:text-slate-900 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-xs"
                >
                  Guardar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Client Modal */}
      {editingClient && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-amber-500" />
                Editar Datos de Cliente
              </h3>
              <button
                onClick={() => setEditingClient(null)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleUpdateClientSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700">Nombre completo *</label>
                <input
                  type="text"
                  required
                  value={editNombre}
                  onChange={(e) => setEditNombre(e.target.value)}
                  className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Teléfono / WhatsApp *</label>
                <input
                  type="text"
                  required
                  value={editTelefono}
                  onChange={(e) => setEditTelefono(e.target.value)}
                  className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Email</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Dirección</label>
                <input
                  type="text"
                  value={editDireccion}
                  onChange={(e) => setEditDireccion(e.target.value)}
                  className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingClient(null)}
                  className="px-4 py-2 text-xs text-slate-600 hover:text-slate-900 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Vehicle Modal */}
      {targetClientForVehicle && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                <Car className="w-5 h-5 text-amber-500" />
                {editingVehicle ? 'Editar Vehículo' : 'Agregar Vehículo a ' + targetClientForVehicle.nombre}
              </h3>
              <button
                onClick={() => {
                  setTargetClientForVehicle(null);
                  setEditingVehicle(null);
                }}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveVehicleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Patente / Chapa *</label>
                  <input
                    type="text"
                    required
                    value={vehPatente}
                    onChange={(e) => setVehPatente(e.target.value)}
                    placeholder="AAA 123"
                    className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs uppercase font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Marca *</label>
                  <input
                    type="text"
                    required
                    value={vehMarca}
                    onChange={(e) => setVehMarca(e.target.value)}
                    placeholder="Toyota, Nissan..."
                    className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Modelo *</label>
                  <input
                    type="text"
                    required
                    value={vehModelo}
                    onChange={(e) => setVehModelo(e.target.value)}
                    placeholder="Hilux, Corolla..."
                    className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Año</label>
                  <input
                    type="number"
                    value={vehAnio}
                    onChange={(e) => setVehAnio(Number(e.target.value))}
                    className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Kilometraje Actual</label>
                  <input
                    type="number"
                    value={vehKm}
                    onChange={(e) => setVehKm(Number(e.target.value))}
                    className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Nivel Combustible</label>
                  <select
                    value={vehCombustible}
                    onChange={(e) => setVehCombustible(e.target.value as any)}
                    className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="Reserva">Reserva</option>
                    <option value="1/4">1/4</option>
                    <option value="1/2">1/2</option>
                    <option value="3/4">3/4</option>
                    <option value="Lleno">Lleno</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setTargetClientForVehicle(null);
                    setEditingVehicle(null);
                  }}
                  className="px-4 py-2 text-xs text-slate-600 hover:text-slate-900 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  {editingVehicle ? 'Guardar Cambios' : 'Agregar Vehículo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Client Deletion Modal */}
      {clientToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2 bg-rose-50 rounded-xl">
                <Trash2 className="w-6 h-6 text-rose-600" />
              </div>
              <h3 className="font-bold text-base text-slate-900">¿Eliminar Cliente?</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              ¿Estás seguro de eliminar el cliente <strong className="text-slate-900">{clientToDelete.nombre}</strong>? Se conservarán sus datos históricos si existen órdenes finalizadas.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setClientToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (onDeleteClient && clientToDelete) {
                    onDeleteClient(clientToDelete.id);
                  }
                  setClientToDelete(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
              >
                Eliminar Cliente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vehicle Work History Modal */}
      {selectedVehicleHistory && (() => {
        const { client, vehicle } = selectedVehicleHistory;

        // Filter all work orders for this vehicle
        const vehicleWorkOrders = (workOrders || []).filter((wo) => {
          const woPat = wo.vehiculo?.patente?.toUpperCase().trim() || '';
          const vehPat = vehicle.patente?.toUpperCase().trim() || '';
          return (
            (woPat && vehPat && woPat === vehPat) ||
            (wo.vehiculo?.id && vehicle.id && wo.vehiculo.id === vehicle.id)
          );
        }).sort((a, b) => new Date(b.fechaIngreso || 0).getTime() - new Date(a.fechaIngreso || 0).getTime());

        // Filter by search query within modal
        const filteredHistory = vehicleWorkOrders.filter((wo) => {
          if (!historySearchQuery.trim()) return true;
          const q = historySearchQuery.trim().toLowerCase();
          const matchNum = wo.numeroOrden?.toLowerCase().includes(q);
          const matchFalla = wo.fallaReportada?.toLowerCase().includes(q);
          const matchDiag = wo.diagnosticoTecnico?.toLowerCase().includes(q);
          const matchMec = wo.mecanicoAsignado?.toLowerCase().includes(q);
          const matchServ = wo.servicios?.some((s) => s.descripcion.toLowerCase().includes(q));
          return matchNum || matchFalla || matchDiag || matchMec || matchServ;
        });

        const totalInvertido = vehicleWorkOrders.reduce((acc, wo) => acc + (wo.totalEstimado || 0), 0);
        const latestOrder = vehicleWorkOrders[0];

        const renderStatusBadge = (status: OrderStatus) => {
          switch (status) {
            case 'ingresado':
              return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-slate-100 text-slate-800 border border-slate-300">Ingresado</span>;
            case 'diagnostico':
              return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300">En Diagnóstico</span>;
            case 'reparacion':
              return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-blue-100 text-blue-800 border border-blue-300">En Reparación</span>;
            case 'repuestos':
              return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-purple-100 text-purple-800 border border-purple-300">Esp. Repuestos</span>;
            case 'listo':
              return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">Listo p/ Entrega</span>;
            case 'entregado':
              return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-slate-800 text-white border border-slate-700">Entregado</span>;
            default:
              return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-slate-100 text-slate-700">{status}</span>;
          }
        };

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 p-5 sm:p-6 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="px-3 py-1 bg-amber-500/20 text-amber-400 font-mono font-black text-sm rounded-xl border border-amber-500/30">
                      {vehicle.patente}
                    </span>
                    <h2 className="text-xl font-black text-white tracking-tight">
                      {vehicle.marca} {vehicle.modelo} ({vehicle.anio})
                    </h2>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-amber-400" />
                      <span>Propietario: <strong className="text-white">{client.nombre}</strong></span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{client.telefono}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Car className="w-3.5 h-3.5 text-slate-400" />
                      <span>{vehicle.kilometraje.toLocaleString()} km acumulados</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => {
                      const vObj = vehicle;
                      const cObj = client;
                      setSelectedVehicleHistory(null);
                      onNewWorkOrderForVehicle(cObj, vObj);
                    }}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <Wrench className="w-4 h-4 stroke-[2.5]" />
                    <span>Nueva OT para este Vehículo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedVehicleHistory(null)}
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Stats Summary Bar */}
              <div className="bg-slate-950 p-4 border-b border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
                <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800/80">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Total Trabajos
                  </span>
                  <p className="text-lg font-black text-amber-400 mt-0.5">
                    {vehicleWorkOrders.length} {vehicleWorkOrders.length === 1 ? 'servicio' : 'servicios'}
                  </p>
                </div>

                <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800/80">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Inversión Acumulada
                  </span>
                  <p className="text-lg font-black text-emerald-400 mt-0.5">
                    ${totalInvertido.toLocaleString('es-PY')}
                  </p>
                </div>

                <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800/80">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Último Servicio
                  </span>
                  <p className="text-xs font-bold text-slate-200 mt-1 truncate">
                    {latestOrder ? formatDateSpanish(latestOrder.fechaIngreso) : 'Sin historial'}
                  </p>
                </div>

                <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800/80">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Estado Actual
                  </span>
                  <div className="mt-1">
                    {latestOrder ? renderStatusBadge(latestOrder.estado) : <span className="text-xs text-slate-500">Sin órdenes</span>}
                  </div>
                </div>
              </div>

              {/* Search in History Bar */}
              {vehicleWorkOrders.length > 0 && (
                <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center gap-3 shrink-0">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={historySearchQuery}
                      onChange={(e) => setHistorySearchQuery(e.target.value)}
                      placeholder="Buscar por falla, diagnóstico, repuesto, número de OT o mecánico..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  {historySearchQuery && (
                    <button
                      onClick={() => setHistorySearchQuery('')}
                      className="text-xs text-slate-400 hover:text-white px-2 py-1 cursor-pointer"
                    >
                      Limpiar
                    </button>
                  )}
                </div>
              )}

              {/* Work Orders List (Scrollable) */}
              <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
                {vehicleWorkOrders.length === 0 ? (
                  <div className="text-center py-12 space-y-4 bg-slate-950/60 rounded-3xl border border-slate-800 p-8">
                    <div className="w-16 h-16 bg-amber-500/10 text-amber-400 rounded-2xl flex items-center justify-center mx-auto border border-amber-500/20">
                      <History className="w-8 h-8" />
                    </div>
                    <div className="max-w-md mx-auto space-y-1">
                      <h3 className="font-bold text-white text-base">Sin Historial Registrado</h3>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Este vehículo aún no cuenta con órdenes de trabajo o mantenimientos registrados en la plataforma.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        const vObj = vehicle;
                        const cObj = client;
                        setSelectedVehicleHistory(null);
                        onNewWorkOrderForVehicle(cObj, vObj);
                      }}
                      className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all inline-flex items-center gap-2 cursor-pointer"
                    >
                      <Plus className="w-4 h-4 stroke-[2.5]" />
                      <span>Crear Primera Orden de Trabajo</span>
                    </button>
                  </div>
                ) : filteredHistory.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400">
                    No se encontraron órdenes de trabajo que coincidan con &quot;{historySearchQuery}&quot;.
                  </div>
                ) : (
                  filteredHistory.map((order) => {
                    const isExpanded = expandedOrderId === order.id;

                    return (
                      <div
                        key={order.id}
                        className="bg-slate-950 border border-slate-800/90 rounded-2xl p-4 sm:p-5 space-y-4 shadow-md hover:border-slate-700 transition-colors"
                      >
                        {/* Order Header */}
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                          <div className="flex items-center gap-3">
                            <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 font-extrabold font-mono text-sm rounded-xl">
                              {order.numeroOrden}
                            </span>
                            {renderStatusBadge(order.estado)}
                            <span className="text-xs text-slate-400 flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-slate-500" />
                              <span>{formatDateSpanish(order.fechaIngreso)}</span>
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            {order.vehiculo?.kilometraje ? (
                              <span className="text-xs text-slate-300 font-medium bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                                KM: {order.vehiculo.kilometraje.toLocaleString()}
                              </span>
                            ) : null}

                            <span className="text-base font-black text-emerald-400">
                              ${(order.totalEstimado || 0).toLocaleString('es-PY')}
                            </span>

                            <button
                              type="button"
                              onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                              className="p-1.5 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors border border-slate-800 cursor-pointer"
                              title={isExpanded ? 'Contraer detalle' : 'Desplegar detalle completo'}
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        {/* Order Core Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Falla Reportada / Motivo de Ingreso
                            </span>
                            <p className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 text-slate-200 leading-relaxed font-medium">
                              {order.fallaReportada || 'Mantenimiento preventivo / Diagnóstico'}
                            </p>
                          </div>

                          {order.diagnosticoTecnico ? (
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Diagnóstico Técnico / Informe
                              </span>
                              <p className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 text-amber-300/90 leading-relaxed font-medium">
                                {order.diagnosticoTecnico}
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Mecánico Asignado
                              </span>
                              <p className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 text-slate-300">
                                {order.mecanicoAsignado || 'Equipo Técnico del Taller'}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Services List summary / expanded details */}
                        {order.servicios && order.servicios.length > 0 && (
                          <div className="space-y-2 pt-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                              <span>Servicios Realizados & Repuestos ({order.servicios.length})</span>
                              {!isExpanded && (
                                <button
                                  type="button"
                                  onClick={() => setExpandedOrderId(order.id)}
                                  className="text-[11px] text-amber-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                                >
                                  <span>Ver Detalle Repuestos</span>
                                  <ChevronDown className="w-3 h-3" />
                                </button>
                              )}
                            </span>

                            <div className="space-y-1.5">
                              {order.servicios.map((s, idx) => (
                                <div
                                  key={s.id || idx}
                                  className="p-3 bg-slate-900/70 rounded-xl border border-slate-800/80 space-y-2 text-xs"
                                >
                                  <div className="flex items-center justify-between font-bold text-slate-200">
                                    <span className="flex items-center gap-2">
                                      <Wrench className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                      <span>{s.descripcion}</span>
                                    </span>
                                    <span className="text-slate-300">Mano de Obra: ${(s.costoManoObra || 0).toLocaleString()}</span>
                                  </div>

                                  {/* Parts Used */}
                                  {s.repuestosUtilizados && s.repuestosUtilizados.length > 0 && (
                                    <div className="pl-5 border-l-2 border-slate-800 space-y-1">
                                      {s.repuestosUtilizados.map((r, rIdx) => (
                                        <div key={rIdx} className="flex items-center justify-between text-[11px] text-slate-400">
                                          <span>• {r.nombreRepuesto} ({r.cantidad} u. x ${r.precioUnitario.toLocaleString()})</span>
                                          <span className="font-semibold text-slate-300">${(r.cantidad * r.precioUnitario).toLocaleString()}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Maintenance Checklist Badges if present */}
                        {order.mantenimiento && (
                          <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 space-y-2 text-xs">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Ficha de Mantenimiento Preventivo</span>
                            </span>
                            <div className="flex flex-wrap items-center gap-2">
                              {order.mantenimiento.aceiteMotor && (
                                <span className="px-2.5 py-1 bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-[11px] rounded-lg font-bold">
                                  ✓ Aceite Motor ({order.mantenimiento.tipoAceiteMotor || 'Sintético'})
                                </span>
                              )}
                              {order.mantenimiento.filtroAceite && (
                                <span className="px-2.5 py-1 bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-[11px] rounded-lg font-bold">
                                  ✓ Filtro Aceite
                                </span>
                              )}
                              {order.mantenimiento.filtroAire && (
                                <span className="px-2.5 py-1 bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-[11px] rounded-lg font-bold">
                                  ✓ Filtro Aire
                                </span>
                              )}
                              {order.mantenimiento.filtroCombustible && (
                                <span className="px-2.5 py-1 bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-[11px] rounded-lg font-bold">
                                  ✓ Filtro Combustible
                                </span>
                              )}
                              {order.mantenimiento.filtroHabitaculo && (
                                <span className="px-2.5 py-1 bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-[11px] rounded-lg font-bold">
                                  ✓ Filtro Habitáculo
                                </span>
                              )}
                              {order.mantenimiento.proximoKmService && (
                                <span className="px-2.5 py-1 bg-amber-950/60 border border-amber-800/80 text-amber-300 text-[11px] rounded-lg font-bold">
                                  📌 Próximo Service: {order.mantenimiento.proximoKmService.toLocaleString()} km
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between shrink-0">
                <span className="text-xs text-slate-400">
                  Total de órdenes registradas: <strong className="text-white">{vehicleWorkOrders.length}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedVehicleHistory(null)}
                  className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
