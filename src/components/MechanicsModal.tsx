import React, { useState } from 'react';
import { Mechanic } from '../types/tallerya';
import {
  UserCheck,
  UserX,
  Plus,
  Trash2,
  X,
  Wrench,
  Phone,
  Briefcase,
  AlertCircle,
  CheckCircle2,
  Users
} from 'lucide-react';

interface MechanicsModalProps {
  isOpen: boolean;
  onClose: () => void;
  mechanics: Mechanic[];
  onAddMechanic: (mechanic: Mechanic) => void;
  onDeleteMechanic: (id: string) => void;
  onToggleStatus: (id: string, currentStatus: boolean) => void;
}

export function MechanicsModal({
  isOpen,
  onClose,
  mechanics,
  onAddMechanic,
  onDeleteMechanic,
  onToggleStatus,
}: MechanicsModalProps) {
  const [nombre, setNombre] = useState('');
  const [especialidad, setEspecialidad] = useState('');
  const [telefono, setTelefono] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;

    const newMechanic: Mechanic = {
      id: 'm_' + Date.now(),
      nombre: nombre.trim(),
      especialidad: especialidad.trim() || 'Mecánica General',
      telefono: telefono.trim(),
      activo: true,
    };

    onAddMechanic(newMechanic);
    setNombre('');
    setEspecialidad('');
    setTelefono('');
    setIsCreating(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-5 sm:p-6 relative shrink-0 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500 text-slate-950 rounded-xl font-bold shadow-md">
              <Users className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Gestión de Personal / Mecánicos</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Agrega, edita o elimina a los mecánicos asignables en las órdenes de trabajo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50">
          {/* Add Form Toggle */}
          {!isCreating ? (
            <button
              onClick={() => setIsCreating(true)}
              className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl shadow-sm transition-colors text-sm flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Agregar Nuevo Mecánico al Taller</span>
            </button>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white p-4 rounded-xl border border-amber-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-amber-500" />
                  Nuevo Personal del Taller
                </h3>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  Cancelar
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej: Marcelo Rossi"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Especialidad / Rol
                  </label>
                  <input
                    type="text"
                    value={especialidad}
                    onChange={(e) => setEspecialidad(e.target.value)}
                    placeholder="Ej: Inyección Electrónica, Frenos"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Teléfono de Contacto (Opcional)
                </label>
                <input
                  type="text"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="Ej: +54 9 11 1234-5678"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 rounded-lg text-xs font-bold transition-colors"
                >
                  Guardar Mecánico
                </button>
              </div>
            </form>
          )}

          {/* List of Mechanics */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
              <span>Nómina de Personal ({mechanics.length})</span>
            </h3>

            {mechanics.length === 0 ? (
              <div className="bg-white p-6 rounded-xl border border-slate-200 text-center text-slate-500 text-xs">
                No hay mecánicos registrados. Agrega el primero para asignarlo a las órdenes de trabajo.
              </div>
            ) : (
              <div className="space-y-2">
                {mechanics.map((m) => (
                  <div
                    key={m.id}
                    className={`bg-white p-3.5 rounded-xl border ${
                      m.activo ? 'border-slate-200' : 'border-slate-200 bg-slate-100/60 opacity-60'
                    } flex items-center justify-between gap-3 shadow-xs`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black ${
                          m.activo
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-200 text-slate-500'
                        }`}
                      >
                        <Wrench className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900 text-sm">{m.nombre}</h4>
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                              m.activo
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {m.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                          {m.especialidad && <span>{m.especialidad}</span>}
                          {m.telefono && (
                            <span className="flex items-center gap-1 font-mono text-[11px]">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {m.telefono}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => onToggleStatus(m.id, m.activo)}
                        className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors border ${
                          m.activo
                            ? 'border-slate-300 text-slate-600 hover:bg-slate-100'
                            : 'border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                        }`}
                        title={m.activo ? 'Marcar como inactivo' : 'Reactivar'}
                      >
                        {m.activo ? 'Desactivar' : 'Activar'}
                      </button>

                      <button
                        onClick={() => {
                          if (confirm(`¿Eliminar a ${m.nombre} del taller?`)) {
                            onDeleteMechanic(m.id);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Eliminar registro"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors"
          >
            Listo / Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
