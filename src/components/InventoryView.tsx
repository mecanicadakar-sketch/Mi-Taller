import React, { useState } from 'react';
import { InventoryItem } from '../types/tallerya';
import { Search, Plus, Package, AlertTriangle, ArrowUpDown, Edit3, CheckCircle2 } from 'lucide-react';

interface InventoryViewProps {
  inventory: InventoryItem[];
  onAddItem: (item: InventoryItem) => void;
  onUpdateStock: (itemId: string, newStock: number) => void;
  searchTerm?: string;
}

export function InventoryView({ inventory, onAddItem, onUpdateStock, searchTerm = '' }: InventoryViewProps) {
  const [localSearch, setLocalSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('todas');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState('Lubricantes');
  const [stockActual, setStockActual] = useState(10);
  const [stockMinimo, setStockMinimo] = useState(3);
  const [precioCosto, setPrecioCosto] = useState(10000);
  const [precioVenta, setPrecioVenta] = useState(15000);
  const [ubicacion, setUbicacion] = useState('Estantería A-1');

  const categories = ['todas', ...Array.from(new Set(inventory.map((i) => i.categoria)))];

  const activeSearch = (searchTerm || localSearch).trim();

  const filteredItems = inventory.filter((item) => {
    const matchesCat = selectedCategory === 'todas' || item.categoria === selectedCategory;
    const q = activeSearch.toLowerCase();
    const matchesQ =
      !q ||
      item.nombre.toLowerCase().includes(q) ||
      item.codigo.toLowerCase().includes(q) ||
      item.categoria.toLowerCase().includes(q) ||
      (item.ubicacion && item.ubicacion.toLowerCase().includes(q));
    return matchesCat && matchesQ;
  });

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !codigo.trim()) return;

    const newItem: InventoryItem = {
      id: 'inv_' + Date.now(),
      codigo: codigo.toUpperCase().trim(),
      nombre: nombre.trim(),
      categoria,
      stockActual: Number(stockActual),
      stockMinimo: Number(stockMinimo),
      precioCosto: Number(precioCosto),
      precioVenta: Number(precioVenta),
      ubicacion: ubicacion.trim() || 'Depósito',
    };

    onAddItem(newItem);
    setShowAddModal(false);

    // Reset
    setCodigo('');
    setNombre('');
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Inventario y Repuestos</h2>
          <p className="text-xs text-slate-500">Control de existencia de filtros, aceites, piezas y líquidos</p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-all flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          Nuevo Repuesto
        </button>
      </div>

      {/* Filter and Category Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm || localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Buscar repuesto por código o nombre..."
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          />
        </div>

        {/* Categories Pills */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg shrink-0 capitalize transition-colors ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-amber-400'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="p-3.5">Código / Ubicación</th>
                <th className="p-3.5">Repuesto / Descripción</th>
                <th className="p-3.5">Categoría</th>
                <th className="p-3.5 text-center">Stock Actual</th>
                <th className="p-3.5 text-right">Precio Costo</th>
                <th className="p-3.5 text-right">Precio Venta</th>
                <th className="p-3.5 text-center">Ajustar Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map((item) => {
                const isLowStock = item.stockActual <= item.stockMinimo;
                const margin = Math.round(((item.precioVenta - item.precioCosto) / item.precioCosto) * 100);

                return (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5">
                      <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                        {item.codigo}
                      </span>
                      <p className="text-[11px] text-slate-400 mt-0.5">{item.ubicacion}</p>
                    </td>

                    <td className="p-3.5">
                      <p className="font-bold text-slate-900 text-xs sm:text-sm">{item.nombre}</p>
                    </td>

                    <td className="p-3.5">
                      <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 font-semibold text-[11px] rounded-full">
                        {item.categoria}
                      </span>
                    </td>

                    <td className="p-3.5 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-xs ${
                          isLowStock
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        {isLowStock && <AlertTriangle className="w-3 h-3 text-amber-600" />}
                        {item.stockActual} un.
                      </span>
                      <p className="text-[10px] text-slate-400 mt-0.5">Mínimo: {item.stockMinimo}</p>
                    </td>

                    <td className="p-3.5 text-right font-medium text-slate-600">
                      ${item.precioCosto.toLocaleString('es-AR')}
                    </td>

                    <td className="p-3.5 text-right">
                      <span className="font-bold text-slate-900">${item.precioVenta.toLocaleString('es-AR')}</span>
                      <p className="text-[10px] text-emerald-600 font-bold">+{margin}% marg.</p>
                    </td>

                    <td className="p-3.5 text-center">
                      <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
                        <button
                          onClick={() => onUpdateStock(item.id, Math.max(0, item.stockActual - 1))}
                          className="w-6 h-6 bg-white hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-md shadow-2xs flex items-center justify-center"
                          title="Restar 1"
                        >
                          -
                        </button>
                        <span className="w-8 text-center font-bold text-xs">{item.stockActual}</span>
                        <button
                          onClick={() => onUpdateStock(item.id, item.stockActual + 1)}
                          className="w-6 h-6 bg-white hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-md shadow-2xs flex items-center justify-center"
                          title="Sumar 1"
                        >
                          +
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-lg">Agregar Repuesto al Inventario</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Código de Pieza *</label>
                  <input
                    type="text"
                    required
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value)}
                    placeholder="ACE-5W30"
                    className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs uppercase font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Categoría</label>
                  <select
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="Lubricantes">Lubricantes</option>
                    <option value="Filtros">Filtros</option>
                    <option value="Frenos">Frenos</option>
                    <option value="Encendido">Encendido</option>
                    <option value="Motor">Motor</option>
                    <option value="Fluidos">Fluidos</option>
                    <option value="Varios">Varios</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Nombre / Descripción *</label>
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej. Filtro de Aceite Hilux"
                  className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Stock Inicial</label>
                  <input
                    type="number"
                    value={stockActual}
                    onChange={(e) => setStockActual(Number(e.target.value))}
                    className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Stock Mínimo Alerta</label>
                  <input
                    type="number"
                    value={stockMinimo}
                    onChange={(e) => setStockMinimo(Number(e.target.value))}
                    className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Precio Costo ($)</label>
                  <input
                    type="number"
                    value={precioCosto}
                    onChange={(e) => setPrecioCosto(Number(e.target.value))}
                    className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Precio Venta ($)</label>
                  <input
                    type="number"
                    value={precioVenta}
                    onChange={(e) => setPrecioVenta(Number(e.target.value))}
                    className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Ubicación en Taller</label>
                <input
                  type="text"
                  value={ubicacion}
                  onChange={(e) => setUbicacion(e.target.value)}
                  placeholder="Estantería A-1"
                  className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
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
                  Guardar en Inventario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
