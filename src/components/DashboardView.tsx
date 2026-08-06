import { WorkOrder, InventoryItem, OrderStatus } from '../types/tallerya';
import { Wrench, Clock, CheckCircle2, AlertTriangle, ArrowRight, DollarSign, Car, Plus, AlertCircle, Search, FileSpreadsheet } from 'lucide-react';
import { matchesQuery } from '../utils/searchUtils';

interface DashboardViewProps {
  workOrders: WorkOrder[];
  inventory: InventoryItem[];
  onSelectOrder: (order: WorkOrder) => void;
  onNewWorkOrder: () => void;
  onNavigateTab: (tab: string) => void;
  onOpenGoogleSheetsModal?: () => void;
  searchTerm?: string;
  setSearchTerm?: (term: string) => void;
}

const STATUS_CONFIG: Record<OrderStatus, { label: string; bg: string; text: string; border: string }> = {
  ingresado: { label: 'Ingresado', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  diagnostico: { label: 'En Diagnóstico', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  reparacion: { label: 'En Reparación', bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
  repuestos: { label: 'Esperando Repuesto', bg: 'bg-orange-50', text: 'text-orange-800', border: 'border-orange-200' },
  listo: { label: 'Listo para Entregar', bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200' },
  entregado: { label: 'Entregado / Cerrado', bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' },
};

export function DashboardView({
  workOrders,
  inventory,
  onSelectOrder,
  onNewWorkOrder,
  onNavigateTab,
  onOpenGoogleSheetsModal,
  searchTerm = '',
  setSearchTerm,
}: DashboardViewProps) {
  const q = searchTerm.trim();

  // All matches including delivered when searching
  const searchResults = q
    ? workOrders.filter(
        (o) =>
          matchesQuery(o.numeroOrden, q) ||
          matchesQuery(o.vehiculo?.patente, q) ||
          matchesQuery(o.clienteNombre, q) ||
          matchesQuery(o.vehiculo?.marca, q) ||
          matchesQuery(o.vehiculo?.modelo, q) ||
          matchesQuery(o.fallaReportada, q)
      )
    : [];

  // Stats calculations
  const activeOrders = workOrders.filter((o) => {
    if (o.estado === 'entregado') return false;
    if (!q) return true;
    return (
      matchesQuery(o.numeroOrden, q) ||
      matchesQuery(o.vehiculo?.patente, q) ||
      matchesQuery(o.clienteNombre, q) ||
      matchesQuery(o.vehiculo?.marca, q) ||
      matchesQuery(o.vehiculo?.modelo, q) ||
      matchesQuery(o.fallaReportada, q)
    );
  });
  const inRepair = workOrders.filter((o) => o.estado === 'reparacion');
  const readyOrders = workOrders.filter((o) => o.estado === 'listo');
  
  const estimatedRevenue = activeOrders.reduce((sum, o) => sum + (o.totalEstimado || 0), 0);
  const lowStockItems = inventory.filter((item) => item.stockActual <= item.stockMinimo);

  const displayOrdersList = q ? searchResults : activeOrders.slice(0, 5);

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-800">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full text-xs font-semibold">
            <Wrench className="w-3.5 h-3.5" />
            Taller Mecánico en Servicio
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            Panel de Control • <span className="text-amber-400">Mi</span>Taller
          </h2>
          <p className="text-xs sm:text-sm text-slate-300">
            Resumen en tiempo real de vehículos ingresados, estado de talleres y repuestos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {onOpenGoogleSheetsModal && (
            <button
              onClick={onOpenGoogleSheetsModal}
              className="px-3.5 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Importar Google Drive</span>
            </button>
          )}
          <button
            onClick={() => onNavigateTab('orders')}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-semibold rounded-xl border border-slate-700 transition-colors"
          >
            Ver Kanban
          </button>
          <button
            onClick={onNewWorkOrder}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs sm:text-sm font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Ingresar Vehículo
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Órdenes Activas</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Car className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">{activeOrders.length}</span>
            <span className="text-xs text-slate-500">en taller</span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">En Reparación</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">{inRepair.length}</span>
            <span className="text-xs text-amber-700 font-medium">trabajándose ahora</span>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Listos p/ Entrega</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">{readyOrders.length}</span>
            <span className="text-xs text-emerald-700 font-medium">esperando cliente</span>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Trabajos Activos ($)</span>
            <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">
              ${estimatedRevenue.toLocaleString('es-AR')}
            </span>
            <span className="text-xs text-slate-500">estimado</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Work Orders List + Alerts Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Active Work Orders */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                {q ? `Resultados de Búsqueda para "${q}"` : 'Órdenes de Trabajo Recientes'}
              </h3>
              <p className="text-xs text-slate-500">
                {q ? `Se encontraron ${displayOrdersList.length} orden(es)` : 'Últimos vehículos en proceso'}
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('orders')}
              className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1"
            >
              Ver todas ({workOrders.length})
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {displayOrdersList.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
                No se encontraron órdenes que coincidan con "<span className="font-semibold text-slate-800">{q}</span>".
              </div>
            ) : (
              displayOrdersList.map((order) => {
              const statusInfo = STATUS_CONFIG[order.estado];
              return (
                <div
                  key={order.id}
                  onClick={() => onSelectOrder(order)}
                  className="p-4 rounded-xl border border-slate-200 hover:border-amber-400 hover:shadow-xs transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{order.numeroOrden}</span>
                      <span className="px-2 py-0.5 bg-slate-900 text-amber-400 font-mono font-bold text-xs rounded-md">
                        {order.vehiculo.patente}
                      </span>
                      <span
                        className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${statusInfo.bg} ${statusInfo.text} ${statusInfo.border}`}
                      >
                        {statusInfo.label}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-slate-800">
                      {order.vehiculo.marca} {order.vehiculo.modelo} • <span className="text-slate-600">{order.clienteNombre}</span>
                    </p>
                    <p className="text-xs text-slate-500 line-clamp-1 italic">
                      "{order.fallaReportada}"
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold text-slate-900">
                      ${order.totalEstimado?.toLocaleString('es-AR')}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Mecánico: {order.mecanicoAsignado || 'Sin asignar'}
                    </div>
                  </div>
                </div>
              );
            }))}
          </div>
        </div>

        {/* Right Col: Low Stock Alerts & Quick Stats */}
        <div className="space-y-6">
          {/* Low Stock Warning Box */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-amber-700">
                <AlertCircle className="w-5 h-5" />
                <h3 className="font-bold text-slate-900 text-base">Alertas de Stock</h3>
              </div>
              <button
                onClick={() => onNavigateTab('inventory')}
                className="text-xs font-semibold text-slate-500 hover:text-slate-900"
              >
                Inventario
              </button>
            </div>

            {lowStockItems.length === 0 ? (
              <p className="text-xs text-slate-500 py-2">No hay repuestos en nivel crítico.</p>
            ) : (
              <div className="space-y-2.5">
                {lowStockItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-amber-50/60 border border-amber-200 rounded-lg flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">{item.nombre}</p>
                      <p className="text-[11px] text-slate-500">Cod: {item.codigo}</p>
                    </div>
                    <div className="text-right">
                      <span className="px-2 py-0.5 bg-amber-200 text-amber-900 font-bold rounded-full text-[11px]">
                        Stock: {item.stockActual} (Mín: {item.stockMinimo})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Guide Box */}
          <div className="bg-slate-900 text-slate-300 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2 font-semibold text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Atajos <span className="text-amber-400">Mi</span><span className="text-slate-100">Taller</span></span>
            </div>
            <ul className="text-xs space-y-2 text-slate-300 list-disc list-inside leading-relaxed">
              <li>Usa la barra superior para buscar por <b>patente</b> o <b>cliente</b>.</li>
              <li>Genera <b>presupuestos imprimibles</b> directamente desde la solapa Presupuestos.</li>
              <li>Actualiza el estado de las órdenes en tiempo real.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
