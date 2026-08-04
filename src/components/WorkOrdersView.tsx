import { useState } from 'react';
import { WorkOrder, OrderStatus } from '../types/tallerya';
import { Plus, Search, Filter, Car, LayoutGrid, List, ChevronRight, User, Wrench, Clock, CheckCircle2 } from 'lucide-react';

interface WorkOrdersViewProps {
  workOrders: WorkOrder[];
  onSelectOrder: (order: WorkOrder) => void;
  onNewWorkOrder: () => void;
  onUpdateStatus: (orderId: string, newStatus: OrderStatus) => void;
}

const STATUS_CONFIG: Record<OrderStatus, { label: string; bg: string; text: string; border: string }> = {
  ingresado: { label: 'Ingresado', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  diagnostico: { label: 'En Diagnóstico', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  reparacion: { label: 'En Reparación', bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
  repuestos: { label: 'Esperando Repuesto', bg: 'bg-orange-50', text: 'text-orange-800', border: 'border-orange-200' },
  listo: { label: 'Listo p/ Entrega', bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200' },
  entregado: { label: 'Entregado', bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' },
};

const STATUS_COLUMNS: OrderStatus[] = [
  'ingresado',
  'diagnostico',
  'reparacion',
  'repuestos',
  'listo',
  'entregado',
];

export function WorkOrdersView({
  workOrders,
  onSelectOrder,
  onNewWorkOrder,
  onUpdateStatus,
}: WorkOrdersViewProps) {
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [search, setSearch] = useState<string>('');

  const filteredOrders = workOrders.filter((order) => {
    const matchesStatus = statusFilter === 'todos' || order.estado === statusFilter;
    const query = search.toLowerCase();
    const matchesQuery =
      !query ||
      order.numeroOrden.toLowerCase().includes(query) ||
      order.vehiculo.patente.toLowerCase().includes(query) ||
      order.clienteNombre.toLowerCase().includes(query) ||
      order.vehiculo.marca.toLowerCase().includes(query) ||
      order.vehiculo.modelo.toLowerCase().includes(query);
    return matchesStatus && matchesQuery;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Órdenes de Trabajo</h2>
          <p className="text-xs text-slate-500">Gestión de diagnósticos, reparaciones y entregas</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
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

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
            const count = workOrders.filter((w) => w.estado === st).length;
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 overflow-x-auto pb-4">
          {STATUS_COLUMNS.map((statusKey) => {
            const statusOrders = filteredOrders.filter((o) => o.estado === statusKey);
            const cfg = STATUS_CONFIG[statusKey];

            return (
              <div
                key={statusKey}
                className="bg-slate-100/70 border border-slate-200 rounded-xl p-3 flex flex-col min-h-[450px] shrink-0 min-w-[260px] xl:min-w-0"
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
                  {statusOrders.map((order) => (
                    <div
                      key={order.id}
                      onClick={() => onSelectOrder(order)}
                      className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs hover:border-amber-400 hover:shadow-md transition-all cursor-pointer space-y-2.5 group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-xs">{order.numeroOrden}</span>
                        <span className="px-2 py-0.5 bg-slate-900 text-amber-400 font-mono font-bold text-[11px] rounded-md">
                          {order.vehiculo.patente}
                        </span>
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

                      {/* Quick Status Change */}
                      <div className="pt-1">
                        <select
                          value={order.estado}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => onUpdateStatus(order.id, e.target.value as OrderStatus)}
                          className="w-full text-[10px] bg-slate-100 border border-slate-200 rounded-md py-1 px-1.5 text-slate-700 font-medium focus:outline-none"
                        >
                          {STATUS_COLUMNS.map((st) => (
                            <option key={st} value={st}>
                              Mover a: {STATUS_CONFIG[st].label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}

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
                  return (
                    <tr
                      key={order.id}
                      onClick={() => onSelectOrder(order)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="p-3.5 font-bold text-slate-900">{order.numeroOrden}</td>
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
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectOrder(order);
                          }}
                          className="px-2.5 py-1 bg-amber-500/10 text-amber-800 hover:bg-amber-500 hover:text-slate-950 font-bold rounded-lg transition-colors text-[11px]"
                        >
                          Ver detalle
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
