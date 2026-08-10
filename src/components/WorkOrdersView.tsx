import { useState, useMemo } from 'react';
import { WorkOrder, OrderStatus } from '../types/tallerya';
import {
  Plus,
  Search,
  Filter,
  LayoutGrid,
  List,
  User,
  Trash2,
  RefreshCw,
  Edit3,
  CheckSquare,
  Square,
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import { matchesQuery } from '../utils/searchUtils';
import { detectDuplicateWorkOrders } from '../services/googleDriveImportService';

interface WorkOrdersViewProps {
  workOrders: WorkOrder[];
  onSelectOrder: (order: WorkOrder) => void;
  onNewWorkOrder: () => void;
  onUpdateStatus: (orderId: string, newStatus: OrderStatus) => void;
  onDeleteOrder?: (orderId: string) => void;
  onDeleteMultipleOrders?: (orderIds: string[]) => Promise<void>;
  searchTerm?: string;
  setSearchTerm?: (term: string) => void;
  isSyncing?: boolean;
}

const STATUS_CONFIG: Record<OrderStatus, { label: string; bg: string; text: string; border: string }> = {
  ingresado: { label: 'Ingresado', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  diagnostico: { label: 'Ingresado', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  reparacion: { label: 'En Reparación', bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
  repuestos: { label: 'En Reparación', bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
  listo: { label: 'Listo / Entregado', bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200' },
  entregado: { label: 'Listo / Entregado', bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200' },
};

const STATUS_COLUMNS: OrderStatus[] = [
  'ingresado',
  'reparacion',
  'entregado',
];

export function WorkOrdersView({
  workOrders,
  onSelectOrder,
  onNewWorkOrder,
  onUpdateStatus,
  onDeleteOrder,
  onDeleteMultipleOrders,
  searchTerm = '',
  setSearchTerm,
  isSyncing = false,
}: WorkOrdersViewProps) {
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [localSearch, setLocalSearch] = useState<string>('');
  const [orderToDelete, setOrderToDelete] = useState<WorkOrder | null>(null);

  // Multi-selection state
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState<boolean>(false);
  const [isBatchDeleting, setIsBatchDeleting] = useState<boolean>(false);

  const activeSearch = searchTerm !== undefined && searchTerm !== '' ? searchTerm : localSearch;

  // Detect duplicate orders
  const duplicateInfo = useMemo(() => {
    return detectDuplicateWorkOrders(workOrders);
  }, [workOrders]);

  const filteredOrders = useMemo(() => {
    return workOrders.filter((order) => {
      let matchesStatus = true;
      if (statusFilter !== 'todos') {
        if (statusFilter === 'ingresado') matchesStatus = order.estado === 'ingresado' || order.estado === 'diagnostico';
        else if (statusFilter === 'reparacion') matchesStatus = order.estado === 'reparacion' || order.estado === 'repuestos';
        else if (statusFilter === 'entregado') matchesStatus = order.estado === 'entregado' || order.estado === 'listo';
        else matchesStatus = order.estado === statusFilter;
      }
      const q = activeSearch.trim();
      const matchesQ =
        !q ||
        matchesQuery(order.numeroOrden, q) ||
        matchesQuery(order.vehiculo?.patente, q) ||
        matchesQuery(order.clienteNombre, q) ||
        matchesQuery(order.vehiculo?.marca, q) ||
        matchesQuery(order.vehiculo?.modelo, q) ||
        matchesQuery(order.fallaReportada, q);
      return matchesStatus && matchesQ;
    });
  }, [workOrders, statusFilter, activeSearch]);

  const allFilteredAreSelected =
    filteredOrders.length > 0 &&
    filteredOrders.every((o) => selectedOrderIds.includes(o.id));

  const toggleSelectOrder = (id: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllFiltered = () => {
    if (allFilteredAreSelected) {
      const filteredIds = new Set(filteredOrders.map((o) => o.id));
      setSelectedOrderIds((prev) => prev.filter((id) => !filteredIds.has(id)));
    } else {
      const filteredIds = filteredOrders.map((o) => o.id);
      setSelectedOrderIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const handleSelectDuplicates = () => {
    setSelectedOrderIds(duplicateInfo.duplicateIds);
  };

  const handleConfirmBatchDelete = async () => {
    if (selectedOrderIds.length === 0) return;
    setIsBatchDeleting(true);
    try {
      if (onDeleteMultipleOrders) {
        await onDeleteMultipleOrders(selectedOrderIds);
      } else if (onDeleteOrder) {
        for (const id of selectedOrderIds) {
          await onDeleteOrder(id);
        }
      }
      setSelectedOrderIds([]);
      setShowBatchDeleteConfirm(false);
    } catch (e) {
      console.error('Error eliminando órdenes en lote:', e);
    } finally {
      setIsBatchDeleting(false);
    }
  };

  return (
    <div className="p-6 space-y-6 relative pb-24">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Órdenes de Trabajo</h2>
          <p className="text-xs text-slate-500">Gestión de diagnósticos, reparaciones y entregas</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {duplicateInfo.duplicateIds.length > 0 && (
            <button
              onClick={handleSelectDuplicates}
              className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 border border-amber-300 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-2xs"
            >
              <Sparkles className="w-4 h-4 text-amber-600 animate-pulse" />
              <span>Seleccionar {duplicateInfo.duplicateIds.length} Duplicados</span>
            </button>
          )}

          {/* View Mode Selector */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-all ${
                viewMode === 'kanban'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              Tablero Kanban
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-all ${
                viewMode === 'table'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <List className="w-4 h-4" />
              Lista
            </button>
          </div>

          <button
            onClick={onNewWorkOrder}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Nueva Órden
          </button>
        </div>
      </div>

      {/* Syncing State Banner */}
      {isSyncing && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-xs font-medium shadow-2xs animate-pulse">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
            <span>Consultando Firebase en tiempo real para mantener tus órdenes actualizadas...</span>
          </div>
          <span className="text-[10px] text-blue-700 font-bold uppercase tracking-wider hidden sm:inline">Sincronizando</span>
        </div>
      )}

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={activeSearch}
            onChange={(e) => {
              if (setSearchTerm) setSearchTerm(e.target.value);
              setLocalSearch(e.target.value);
            }}
            placeholder="Filtrar por patente, cliente..."
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <button
            onClick={() => setStatusFilter('todos')}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors shrink-0 ${
              statusFilter === 'todos'
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Todos ({workOrders.length})
          </button>
          {STATUS_COLUMNS.map((st) => {
            const count = workOrders.filter((w) => {
              if (st === 'ingresado') return w.estado === 'ingresado' || w.estado === 'diagnostico';
              if (st === 'reparacion') return w.estado === 'reparacion' || w.estado === 'repuestos';
              if (st === 'entregado') return w.estado === 'entregado' || w.estado === 'listo';
              return w.estado === st;
            }).length;
            const cfg = STATUS_CONFIG[st];
            return (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors shrink-0 ${
                  statusFilter === st
                    ? 'bg-slate-900 text-white font-semibold'
                    : `${cfg.bg} ${cfg.text} border ${cfg.border}`
                }`}
              >
                {cfg.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* KANBAN VIEW */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pb-4">
          {STATUS_COLUMNS.map((statusKey) => {
            const statusOrders = filteredOrders.filter((o) => {
              if (statusKey === 'ingresado') return o.estado === 'ingresado' || o.estado === 'diagnostico';
              if (statusKey === 'reparacion') return o.estado === 'reparacion' || o.estado === 'repuestos';
              if (statusKey === 'entregado') return o.estado === 'entregado' || o.estado === 'listo';
              return o.estado === statusKey;
            });
            const cfg = STATUS_CONFIG[statusKey];

            return (
              <div
                key={statusKey}
                className="bg-slate-100/80 border border-slate-200 rounded-2xl p-4 flex flex-col min-h-[480px]"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 mb-3">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                    {cfg.label}
                  </span>
                  <span className="text-xs font-bold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                    {statusOrders.length}
                  </span>
                </div>

                {/* Column Content */}
                <div className="space-y-3 flex-1">
                  {statusOrders.map((order) => {
                    const isSelected = selectedOrderIds.includes(order.id);
                    const isDuplicate = duplicateInfo.duplicateIds.includes(order.id);

                    return (
                      <div
                        key={order.id}
                        onClick={() => onSelectOrder(order)}
                        className={`p-3.5 rounded-xl border shadow-2xs hover:border-amber-400 hover:shadow-md transition-all cursor-pointer space-y-2.5 group relative ${
                          isSelected
                            ? 'bg-amber-50/90 border-amber-400 ring-2 ring-amber-400/30'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onClick={(e) => e.stopPropagation()}
                              onChange={() => toggleSelectOrder(order.id)}
                              className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                            />
                            <span className="font-bold text-slate-900 text-xs">{order.numeroOrden}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {isDuplicate && (
                              <span className="px-1.5 py-0.5 bg-amber-500 text-slate-950 font-black text-[9px] rounded uppercase">
                                Duplicado
                              </span>
                            )}
                            <span className="px-2 py-0.5 bg-slate-900 text-amber-400 font-mono font-bold text-[11px] rounded-md">
                              {order.vehiculo.patente}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-slate-800 group-hover:text-amber-600 transition-colors">
                            {order.vehiculo.marca} {order.vehiculo.modelo}
                          </p>
                          <p className="text-[11px] text-slate-500 flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{order.clienteNombre}</span>
                          </p>
                        </div>

                        <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 line-clamp-2 italic">
                          "{order.fallaReportada}"
                        </p>

                        <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">
                            {order.mecanicoAsignado ? order.mecanicoAsignado.split(' ')[0] : 'Sin mecánico'}
                          </span>
                          <span className="font-bold text-slate-900">
                            ${order.totalEstimado?.toLocaleString('es-AR')}
                          </span>
                        </div>

                        {/* Quick Actions & Status Change */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectOrder(order);
                              }}
                              className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                              title="Editar / Ver detalle de la órden"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            {onDeleteOrder && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOrderToDelete(order);
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Eliminar órden de trabajo"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          <select
                            value={order.estado}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => onUpdateStatus(order.id, e.target.value as OrderStatus)}
                            className="text-[10px] bg-slate-100 border border-slate-200 rounded-md py-1 px-1.5 text-slate-700 font-medium focus:outline-none"
                          >
                            {STATUS_COLUMNS.map((st) => (
                              <option key={st} value={st}>
                                Mover a: {STATUS_CONFIG[st].label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    );
                  })}

                  {statusOrders.length === 0 && (
                    <div className="text-center py-8 text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                      Sin órdenes aquí
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TABLE VIEW */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                  <th className="p-3.5 w-10 text-center">
                    <button
                      type="button"
                      onClick={toggleSelectAllFiltered}
                      className="text-slate-600 hover:text-amber-600"
                      title={allFilteredAreSelected ? 'Desmarcar visibles' : 'Marcar visibles'}
                    >
                      {allFilteredAreSelected ? (
                        <CheckSquare className="w-4 h-4 text-amber-600" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="p-3.5">N° Órden</th>
                  <th className="p-3.5">Patente / Vehículo</th>
                  <th className="p-3.5">Cliente</th>
                  <th className="p-3.5">Falla Reportada</th>
                  <th className="p-3.5">Estado</th>
                  <th className="p-3.5">Mecánico</th>
                  <th className="p-3.5 text-right">Total Est.</th>
                  <th className="p-3.5 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.map((order) => {
                  const cfg = STATUS_CONFIG[order.estado];
                  const isSelected = selectedOrderIds.includes(order.id);
                  const isDuplicate = duplicateInfo.duplicateIds.includes(order.id);

                  return (
                    <tr
                      key={order.id}
                      onClick={() => onSelectOrder(order)}
                      className={`hover:bg-slate-50 cursor-pointer transition-colors ${
                        isSelected ? 'bg-amber-50/80 font-medium' : ''
                      }`}
                    >
                      <td className="p-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOrder(order.id)}
                          className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                        />
                      </td>
                      <td className="p-3.5 font-bold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <span>{order.numeroOrden}</span>
                          {isDuplicate && (
                            <span className="px-1.5 py-0.5 text-[9px] font-black bg-amber-500 text-slate-950 rounded uppercase">
                              Duplicado
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-slate-900 text-amber-400 font-mono font-bold text-[11px] rounded-md">
                            {order.vehiculo.patente}
                          </span>
                          <span className="font-medium text-slate-800">
                            {order.vehiculo.marca} {order.vehiculo.modelo}
                          </span>
                        </div>
                      </td>
                      <td className="p-3.5 text-slate-700 font-medium">{order.clienteNombre}</td>
                      <td className="p-3.5 text-slate-600 max-w-xs truncate">{order.fallaReportada}</td>
                      <td className="p-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-600">{order.mecanicoAsignado || '-'}</td>
                      <td className="p-3.5 text-right font-bold text-slate-900">
                        ${order.totalEstimado?.toLocaleString('es-AR')}
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectOrder(order);
                            }}
                            className="px-2.5 py-1 bg-amber-500/10 text-amber-800 hover:bg-amber-500 hover:text-slate-950 font-bold rounded-lg transition-colors text-[11px] flex items-center gap-1"
                            title="Editar órden"
                          >
                            <Edit3 className="w-3 h-3" />
                            Editar
                          </button>
                          {onDeleteOrder && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOrderToDelete(order);
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Eliminar órden"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-500">
                      {isSyncing ? (
                        <div className="flex flex-col items-center justify-center gap-2 py-4">
                          <RefreshCw className="w-6 h-6 text-amber-500 animate-spin" />
                          <p className="font-bold text-slate-800 text-sm">Cargando órdenes desde la nube...</p>
                          <p className="text-xs text-slate-500">Sincronizando con Firebase, tus datos aparecerán en breve.</p>
                        </div>
                      ) : (
                        <p className="text-xs font-semibold text-slate-500 py-4">
                          No se encontraron órdenes de trabajo para mostrar.
                        </p>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* FLOATING ACTION BAR FOR MULTI-SELECTION */}
      {selectedOrderIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 border border-slate-700 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-center gap-2 text-xs font-bold">
            <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-black">
              {selectedOrderIds.length}
            </span>
            <span>Órdenes seleccionadas</span>
          </div>

          <div className="h-4 w-px bg-slate-700" />

          <button
            onClick={handleSelectDuplicates}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Duplicados ({duplicateInfo.duplicateIds.length})</span>
          </button>

          <button
            onClick={() => setSelectedOrderIds([])}
            className="px-2.5 py-1.5 text-slate-400 hover:text-white font-semibold text-xs transition-colors"
          >
            Deseleccionar
          </button>

          <button
            onClick={() => setShowBatchDeleteConfirm(true)}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-1.5"
          >
            <Trash2 className="w-4 h-4" />
            <span>Eliminar Seleccionadas ({selectedOrderIds.length})</span>
          </button>
        </div>
      )}

      {/* Confirmation Modal for BATCH Order Deletion */}
      {showBatchDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl text-slate-100">
            <div className="flex items-center gap-3 text-red-500">
              <div className="p-2.5 bg-red-950 rounded-xl border border-red-500/30">
                <AlertTriangle className="w-6 h-6 text-red-400 animate-bounce" />
              </div>
              <div>
                <h3 className="font-black text-lg text-white">¿Eliminar Órdenes Seleccionadas?</h3>
                <p className="text-xs text-red-300 font-semibold">Acción permanente</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-3 rounded-xl border border-slate-800">
              ¿Estás seguro que deseas eliminar <strong className="text-amber-300 font-black">{selectedOrderIds.length} órdenes de trabajo</strong>? Esta acción borrará los registros de la base de datos de Firebase y no se podrá deshacer.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                disabled={isBatchDeleting}
                onClick={() => setShowBatchDeleteConfirm(false)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                disabled={isBatchDeleting}
                onClick={handleConfirmBatchDelete}
                className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-colors flex items-center gap-2"
              >
                {isBatchDeleting ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span>{isBatchDeleting ? 'Eliminando...' : `Sí, Eliminar (${selectedOrderIds.length})`}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for SINGLE Order Deletion */}
      {orderToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2 bg-rose-50 rounded-xl">
                <Trash2 className="w-6 h-6 text-rose-600" />
              </div>
              <h3 className="font-bold text-base text-slate-900">¿Eliminar Órden?</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              ¿Estás seguro de eliminar la Orden de Trabajo <strong className="text-slate-900">{orderToDelete.numeroOrden}</strong> ({orderToDelete.vehiculo?.marca} {orderToDelete.vehiculo?.modelo})? Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setOrderToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (onDeleteOrder && orderToDelete) {
                    onDeleteOrder(orderToDelete.id);
                  }
                  setOrderToDelete(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
              >
                Eliminar Órden
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
