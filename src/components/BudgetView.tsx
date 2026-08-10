import React, { useState } from 'react';
import { Budget, Workshop } from '../types/tallerya';
import { PrintBudgetModal } from './PrintBudgetModal';
import { Plus, Printer, Edit, Trash2, Search, X, Save, Send, CheckSquare, Square, RefreshCw, AlertTriangle } from 'lucide-react';
import { matchesQuery } from '../utils/searchUtils';
import { formatDateSpanish } from '../utils/dateUtils';

interface BudgetViewProps {
  budgets: Budget[];
  workshop?: Workshop | null;
  onAddBudget: (budget: Budget) => void;
  onUpdateBudget?: (budget: Budget) => void;
  onDeleteBudget?: (budgetId: string) => void;
  onDeleteMultipleBudgets?: (budgetIds: string[]) => Promise<void>;
  searchTerm?: string;
  setSearchTerm?: (term: string) => void;
}

export function BudgetView({
  budgets,
  workshop,
  onAddBudget,
  onUpdateBudget,
  onDeleteBudget,
  onDeleteMultipleBudgets,
  searchTerm = '',
  setSearchTerm,
}: BudgetViewProps) {
  const [selectedForPrint, setSelectedForPrint] = useState<Budget | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [budgetToDelete, setBudgetToDelete] = useState<Budget | null>(null);
  const [localSearch, setLocalSearch] = useState('');

  // Batch deletion state
  const [selectedBudgetIds, setSelectedBudgetIds] = useState<string[]>([]);
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);

  const handleShareWhatsApp = (b: Budget) => {
    let savedHeader = {
      nombreTaller: workshop?.nombreTaller || 'MiTaller',
      direccion: workshop?.direccion || '',
      telefono: workshop?.telefono || '',
    };
    try {
      const saved = localStorage.getItem('mitaller_print_header_data');
      if (saved) {
        savedHeader = { ...savedHeader, ...JSON.parse(saved) };
      }
    } catch (e) {}

    const itemsList = b.items
      .map(
        (it) =>
          `• ${it.descripcion} (x${it.cantidad}) - $${(
            it.subtotal || it.cantidad * it.precioUnitario
          ).toLocaleString('es-AR')}`
      )
      .join('\n');

    let text = `📋 *PRESUPUESTO ${b.numeroPresupuesto}*\n`;
    text += `🏬 *${savedHeader.nombreTaller}*\n`;
    if (savedHeader.direccion) text += `📍 ${savedHeader.direccion}\n`;
    if (savedHeader.telefono) text += `📞 Tel/WA: ${savedHeader.telefono}\n`;
    text += `\n👤 *Cliente:* ${b.clienteNombre}\n`;
    text += `🚗 *Vehículo:* ${b.vehiculoInfo}\n`;
    text += `📅 *Fecha:* ${b.fecha}\n`;
    text += `\n🛠️ *DETALLE DE SERVICIOS Y REPUESTOS:*\n${itemsList}\n`;
    if (b.descuento > 0) {
      text += `\n🏷️ *Descuento:* -$${b.descuento.toLocaleString('es-AR')}\n`;
    }
    text += `\n💰 *TOTAL ESTIMADO:* *$${b.total.toLocaleString('es-AR')}*\n`;
    text += `\n¡Quedamos a su disposición para coordinar los trabajos!`;

    const encodedText = encodeURIComponent(text);
    const cleanPhone = b.clienteTelefono ? b.clienteTelefono.replace(/[^0-9]/g, '') : '';
    const waUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodedText}` : `https://wa.me/?text=${encodedText}`;

    window.open(waUrl, '_blank');
  };

  // Form state
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [vehiculoInfo, setVehiculoInfo] = useState('');
  const [descuento, setDescuento] = useState(0);
  const [estado, setEstado] = useState<'pendiente' | 'aprobado' | 'rechazado'>('pendiente');
  const [items, setItems] = useState<
    { descripcion: string; cantidad: number; precioUnitario: number; subtotal: number }[]
  >([
    { descripcion: 'Service de motor y cambio de aceite', cantidad: 1, precioUnitario: 85000, subtotal: 85000 },
  ]);

  const activeSearch = searchTerm !== undefined && searchTerm !== '' ? searchTerm : localSearch;

  const filteredBudgets = budgets.filter((b) => {
    const q = activeSearch.trim();
    if (!q) return true;
    return (
      matchesQuery(b.numeroPresupuesto, q) ||
      matchesQuery(b.clienteNombre, q) ||
      matchesQuery(b.clienteTelefono, q) ||
      matchesQuery(b.vehiculoInfo, q) ||
      b.items?.some((item) => matchesQuery(item.descripcion, q))
    );
  });

  const handleOpenNewBudgetModal = () => {
    setEditingBudget(null);
    setClienteNombre('');
    setClienteTelefono('');
    setVehiculoInfo('');
    setDescuento(0);
    setEstado('pendiente');
    setItems([{ descripcion: 'Mano de obra y diagnóstico', cantidad: 1, precioUnitario: 50000, subtotal: 50000 }]);
    setShowAddModal(true);
  };

  const handleOpenEditBudgetModal = (budget: Budget) => {
    setEditingBudget(budget);
    setClienteNombre(budget.clienteNombre || '');
    setClienteTelefono(budget.clienteTelefono || '');
    setVehiculoInfo(budget.vehiculoInfo || '');
    setDescuento(budget.descuento || 0);
    setEstado(budget.estado || 'pendiente');
    setItems(
      budget.items && budget.items.length > 0
        ? budget.items.map((it) => ({
            descripcion: it.descripcion,
            cantidad: it.cantidad,
            precioUnitario: it.precioUnitario,
            subtotal: it.subtotal || it.cantidad * it.precioUnitario,
          }))
        : [{ descripcion: 'Mano de obra', cantidad: 1, precioUnitario: 40000, subtotal: 40000 }]
    );
    setShowAddModal(true);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingBudget(null);
  };

  const handleAddItemRow = () => {
    setItems((prev) => [
      ...prev,
      { descripcion: '', cantidad: 1, precioUnitario: 0, subtotal: 0 },
    ]);
  };

  const handleRemoveItemRow = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateItem = (idx: number, field: string, val: any) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        const updated = { ...item, [field]: val };
        if (field === 'cantidad' || field === 'precioUnitario') {
          updated.subtotal = (Number(updated.cantidad) || 0) * (Number(updated.precioUnitario) || 0);
        }
        return updated;
      })
    );
  };

  const calculateSubtotal = () => items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
  const calculateTotal = () => Math.max(0, calculateSubtotal() - (Number(descuento) || 0));

  const handleSaveBudget = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteNombre.trim()) return;

    if (editingBudget) {
      const updatedBudget: Budget = {
        ...editingBudget,
        clienteNombre: clienteNombre.trim(),
        clienteTelefono: clienteTelefono.trim(),
        vehiculoInfo: vehiculoInfo.trim() || 'Vehículo Cliente',
        items,
        descuento: Number(descuento) || 0,
        total: calculateTotal(),
        estado,
      };

      if (onUpdateBudget) {
        onUpdateBudget(updatedBudget);
      } else {
        onAddBudget(updatedBudget);
      }
    } else {
      const newBudget: Budget = {
        id: 'b_' + Date.now(),
        numeroPresupuesto: `PRES-2026-${Math.floor(100 + Math.random() * 900)}`,
        fecha: new Date().toISOString().split('T')[0],
        clienteNombre: clienteNombre.trim(),
        clienteTelefono: clienteTelefono.trim(),
        vehiculoInfo: vehiculoInfo.trim() || 'Vehículo Cliente',
        items,
        descuento: Number(descuento) || 0,
        total: calculateTotal(),
        estado,
      };

      onAddBudget(newBudget);
    }

    handleCloseModal();
  };

  const handleDelete = (budgetId: string) => {
    const b = budgets.find((item) => item.id === budgetId);
    if (b) {
      setBudgetToDelete(b);
    } else if (onDeleteBudget) {
      onDeleteBudget(budgetId);
    }
  };

  const handleChangeStatus = (budget: Budget, newStatus: 'pendiente' | 'aprobado' | 'rechazado') => {
    const updated = { ...budget, estado: newStatus };
    if (onUpdateBudget) {
      onUpdateBudget(updated);
    } else {
      onAddBudget(updated);
    }
  };

  const toggleSelectBudget = (id: string) => {
    setSelectedBudgetIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const allFilteredAreSelected =
    filteredBudgets.length > 0 &&
    filteredBudgets.every((b) => selectedBudgetIds.includes(b.id));

  const toggleSelectAllFiltered = () => {
    if (allFilteredAreSelected) {
      const filteredIds = new Set(filteredBudgets.map((b) => b.id));
      setSelectedBudgetIds((prev) => prev.filter((id) => !filteredIds.has(id)));
    } else {
      const filteredIds = filteredBudgets.map((b) => b.id);
      setSelectedBudgetIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const handleConfirmBatchDelete = async () => {
    if (selectedBudgetIds.length === 0) return;
    setIsBatchDeleting(true);
    try {
      if (onDeleteMultipleBudgets) {
        await onDeleteMultipleBudgets(selectedBudgetIds);
      } else if (onDeleteBudget) {
        for (const id of selectedBudgetIds) {
          await onDeleteBudget(id);
        }
      }
      setSelectedBudgetIds([]);
      setShowBatchDeleteConfirm(false);
    } catch (e) {
      console.error('Error eliminando presupuestos en lote:', e);
    } finally {
      setIsBatchDeleting(false);
    }
  };

  return (
    <div className="p-6 space-y-6 relative pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Presupuestos y Cotizaciones</h2>
          <p className="text-xs text-slate-500">Crea y edita presupuestos detallados para enviar o imprimir</p>
        </div>

        <button
          onClick={handleOpenNewBudgetModal}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-all flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          Crear Presupuesto
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
            placeholder="Buscar por cliente, N° presupuesto o detalle..."
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          />
        </div>

        {filteredBudgets.length > 0 && (
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

      {/* Budgets List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredBudgets.map((b) => {
          const isSelected = selectedBudgetIds.includes(b.id);

          return (
            <div
              key={b.id}
              className={`bg-white rounded-xl border p-5 space-y-4 transition-all shadow-xs ${
                isSelected
                  ? 'border-red-400 ring-2 ring-red-500/20 bg-red-50/20'
                  : 'border-slate-200 hover:border-amber-400'
              }`}
            >
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => toggleSelectBudget(b.id)}
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
                      <span className="font-mono font-bold text-slate-900 text-xs bg-slate-100 px-2 py-0.5 rounded-md">
                        {b.numeroPresupuesto}
                      </span>
                      <span className="text-xs text-slate-400">{formatDateSpanish(b.fecha)}</span>
                    </div>
                    <h3 className="font-bold text-slate-900 text-base mt-1">{b.clienteNombre}</h3>
                    <p className="text-xs text-slate-500">{b.vehiculoInfo}</p>
                    {b.clienteTelefono && <p className="text-xs text-slate-400">Tel: {b.clienteTelefono}</p>}
                  </div>
                </div>

              <div className="flex items-center gap-2">
                <select
                  value={b.estado}
                  onChange={(e) => handleChangeStatus(b, e.target.value as any)}
                  className={`px-2 py-1 text-xs font-bold rounded-lg border cursor-pointer ${
                    b.estado === 'aprobado'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : b.estado === 'pendiente'
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}
                >
                  <option value="pendiente">PENDIENTE</option>
                  <option value="aprobado">APROBADO</option>
                  <option value="rechazado">RECHAZADO</option>
                </select>

                <button
                  onClick={() => handleOpenEditBudgetModal(b)}
                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Editar Presupuesto"
                >
                  <Edit className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleDelete(b.id)}
                  className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Eliminar Presupuesto"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Items Summary */}
            <div className="space-y-1.5 text-xs">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Resumen de Ítems ({b.items?.length || 0})
              </span>
              {b.items?.slice(0, 3).map((it, i) => (
                <div key={i} className="flex justify-between text-slate-700">
                  <span className="truncate max-w-[220px]">• {it.descripcion}</span>
                  <span className="font-bold shrink-0">${(it.subtotal || 0).toLocaleString('es-AR')}</span>
                </div>
              ))}
              {b.items && b.items.length > 3 && (
                <p className="text-[11px] text-slate-400 italic">+ {b.items.length - 3} ítems más...</p>
              )}
            </div>

            {/* Footer / Total & Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold">Total Est.</span>
                <p className="text-lg font-black text-slate-900">${(b.total || 0).toLocaleString('es-AR')}</p>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleShareWhatsApp(b)}
                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                  title="Enviar por WhatsApp"
                >
                  <Send className="w-3.5 h-3.5 text-emerald-200" />
                  <span>WhatsApp</span>
                </button>

                <button
                  onClick={() => setSelectedForPrint(b)}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 shrink-0"
                  title="Imprimir o guardar PDF"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir / PDF</span>
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>

      {/* Floating Batch Action Bar */}
      {selectedBudgetIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-4 animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center gap-2 font-bold text-xs">
            <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-black">
              {selectedBudgetIds.length}
            </span>
            <span>Presupuestos seleccionados</span>
          </div>

          <div className="h-4 w-px bg-slate-700" />

          <button
            onClick={() => setSelectedBudgetIds([])}
            className="px-2.5 py-1.5 text-slate-400 hover:text-white font-semibold text-xs transition-colors"
          >
            Deseleccionar
          </button>

          <button
            onClick={() => setShowBatchDeleteConfirm(true)}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-1.5"
          >
            <Trash2 className="w-4 h-4" />
            <span>Eliminar Seleccionados ({selectedBudgetIds.length})</span>
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
                <h3 className="font-extrabold text-base text-slate-900">¿Eliminar Presupuestos Seleccionados?</h3>
                <p className="text-xs text-slate-500">
                  Esta acción eliminará {selectedBudgetIds.length} presupuestos.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
              Se eliminarán de forma permanente los presupuestos seleccionados del sistema. ¿Deseas continuar?
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

      {/* Add / Edit Budget Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                <Edit className="w-5 h-5 text-amber-500" />
                {editingBudget ? `Editar Presupuesto: ${editingBudget.numeroPresupuesto}` : 'Nuevo Presupuesto MiTaller'}
              </h3>
              <button
                type="button"
                onClick={handleCloseModal}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                title="Cerrar ventana"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBudget} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Cliente *</label>
                  <input
                    type="text"
                    required
                    value={clienteNombre}
                    onChange={(e) => setClienteNombre(e.target.value)}
                    placeholder="Nombre del cliente"
                    className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Teléfono</label>
                  <input
                    type="text"
                    value={clienteTelefono}
                    onChange={(e) => setClienteTelefono(e.target.value)}
                    placeholder="+54 9 11..."
                    className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Estado</label>
                  <select
                    value={estado}
                    onChange={(e) => setEstado(e.target.value as any)}
                    className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                  >
                    <option value="pendiente">PENDIENTE</option>
                    <option value="aprobado">APROBADO</option>
                    <option value="rechazado">RECHAZADO</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Vehículo (Marca, Modelo, Patente)</label>
                <input
                  type="text"
                  value={vehiculoInfo}
                  onChange={(e) => setVehiculoInfo(e.target.value)}
                  placeholder="Ej. Toyota Hilux 2.8 (AE 452 XY)"
                  className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              {/* Items Rows */}
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Detalle de Tareas y Repuestos
                  </label>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200"
                  >
                    + Agregar ítem
                  </button>
                </div>

                {items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Descripción de tarea o repuesto"
                      value={item.descripcion}
                      onChange={(e) => handleUpdateItem(idx, 'descripcion', e.target.value)}
                      className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    />
                    <input
                      type="number"
                      placeholder="Cant"
                      value={item.cantidad}
                      onChange={(e) => handleUpdateItem(idx, 'cantidad', e.target.value)}
                      className="w-16 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-center"
                    />
                    <input
                      type="number"
                      placeholder="Precio Unit."
                      value={item.precioUnitario}
                      onChange={(e) => handleUpdateItem(idx, 'precioUnitario', e.target.value)}
                      className="w-28 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-right"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveItemRow(idx)}
                      className="p-2 text-rose-500 hover:text-rose-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Total Summary */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-bold">${calculateSubtotal().toLocaleString('es-AR')}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>Descuento ($):</span>
                  <input
                    type="number"
                    value={descuento}
                    onChange={(e) => setDescuento(Number(e.target.value))}
                    className="w-28 p-1 bg-white border border-slate-200 rounded text-right font-bold"
                  />
                </div>
                <div className="flex justify-between items-center text-base font-extrabold text-slate-900 pt-2 border-t border-slate-200">
                  <span>TOTAL ESTIMADO:</span>
                  <span className="text-amber-600">${calculateTotal().toLocaleString('es-AR')}</span>
                </div>
              </div>

              {/* Prominent Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <X className="w-4 h-4" />
                  Cerrar
                </button>

                <button
                  type="submit"
                  className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {editingBudget ? 'Guardar Cambios' : 'Guardar Presupuesto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Print Preview Modal */}
      {selectedForPrint && (
        <PrintBudgetModal budget={selectedForPrint} workshop={workshop} onClose={() => setSelectedForPrint(null)} />
      )}

      {/* Budget Deletion Modal */}
      {budgetToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2 bg-rose-50 rounded-xl">
                <Trash2 className="w-6 h-6 text-rose-600" />
              </div>
              <h3 className="font-bold text-base text-slate-900">¿Eliminar Presupuesto?</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              ¿Estás seguro de eliminar el presupuesto <strong className="text-slate-900">{budgetToDelete.numeroPresupuesto}</strong> de <strong className="text-slate-900">{budgetToDelete.clienteNombre}</strong>? Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setBudgetToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (onDeleteBudget && budgetToDelete) {
                    onDeleteBudget(budgetToDelete.id);
                  }
                  setBudgetToDelete(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
              >
                Eliminar Presupuesto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
