import React, { useState } from 'react';
import { Client, Vehicle } from '../types/tallerya';
import { Search, UserPlus, Phone, Mail, Car, Plus, Wrench, ChevronRight } from 'lucide-react';

interface ClientsViewProps {
  clients: Client[];
  onAddClient: (client: Client) => void;
  onNewWorkOrderForVehicle: (client: Client, vehicle: Vehicle) => void;
}

export function ClientsView({ clients, onAddClient, onNewWorkOrderForVehicle }: ClientsViewProps) {
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // New Client Form State
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [direccion, setDireccion] = useState('');

  // Vehicle sub-form inside client creation
  const [patente, setPatente] = useState('');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [anio, setAnio] = useState(2022);
  const [kilometraje, setKilometraje] = useState(50000);

  const filteredClients = clients.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.nombre.toLowerCase().includes(q) ||
      c.telefono.toLowerCase().includes(q) ||
      c.vehiculos.some(
        (v) =>
          v.patente.toLowerCase().includes(q) ||
          v.marca.toLowerCase().includes(q) ||
          v.modelo.toLowerCase().includes(q)
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
    };

    const newClient: Client = {
      id: 'c_' + Date.now(),
      nombre: nombre.trim(),
      telefono: telefono.trim(),
      email: email.trim(),
      direccion: direccion.trim(),
      vehiculos: [newVehicle],
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
          value={search}
          onChange={(e) => setSearch(e.target.value)}
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
                <h3 className="font-bold text-slate-900 text-base">{client.nombre}</h3>
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
                </div>
              </div>

              <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-bold text-xs rounded-lg">
                {client.vehiculos.length} vehículo(s)
              </span>
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

                  <button
                    onClick={() => onNewWorkOrderForVehicle(client, v)}
                    className="px-2.5 py-1.5 bg-amber-500 text-slate-950 font-bold rounded-lg hover:bg-amber-400 text-xs transition-colors shrink-0 flex items-center gap-1"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    Nueva OT
                  </button>
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

                <div className="grid grid-cols-2 gap-3">
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
    </div>
  );
}
