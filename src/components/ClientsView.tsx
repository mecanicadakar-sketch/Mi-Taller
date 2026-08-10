import React, { useState } from 'react';
import { Client, Vehicle } from '../types/tallerya';
import { Search, UserPlus, Phone, Mail, Car, Plus, Wrench, Edit3, Save, MapPin, Trash2, Calendar } from 'lucide-react';
import { matchesQuery } from '../utils/searchUtils';
import { formatDateSpanish, parseAndNormalizeDate } from '../utils/dateUtils';

interface ClientsViewProps {
  clients: Client[];
  onAddClient: (client: Client) => void;
  onUpdateClient?: (client: Client) => void;
  onDeleteClient?: (clientId: string) => void;
  onNewWorkOrderForVehicle: (client: Client, vehicle: Vehicle) => void;
  searchTerm?: string;
  setSearchTerm?: (term: string) => void;
}

export function ClientsView({
  clients,
  onAddClient,
  onUpdateClient,
  onDeleteClient,
  onNewWorkOrderForVehicle,
  searchTerm = '',
  setSearchTerm,
}: ClientsViewProps) {
  const [localSearch, setLocalSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);

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

  return (
    <div className="p-6 space-y-6">
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

      {/* Search Input */}
      <div className="relative max-w-md">
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

      {/* Client List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredClients.map((client) => (
          <div
            key={client.id}
            className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4 hover:border-slate-300 transition-all"
          >
            {/* Client Info */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
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

              {client.vehiculos.map((v) => (
                <div
                  key={v.id}
                  className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 bg-slate-900 text-amber-400 font-mono font-bold rounded-lg text-xs">
                      {v.patente}
                    </span>
                    <div>
                      <p className="font-bold text-slate-900">
                        {v.marca} {v.modelo} ({v.anio})
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {v.kilometraje.toLocaleString()} km • Combustible: {v.nivelCombustible}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => openVehicleModal(client, v)}
                      title="Editar vehículo"
                      className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors border border-slate-200"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
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
                      onClick={() => onNewWorkOrderForVehicle(client, v)}
                      className="px-2.5 py-1.5 bg-amber-500 text-slate-950 font-bold rounded-lg hover:bg-amber-400 text-xs transition-colors flex items-center gap-1"
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      Nueva OT
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

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
    </div>
  );
}
