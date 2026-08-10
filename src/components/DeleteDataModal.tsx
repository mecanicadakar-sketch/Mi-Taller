import React, { useState, useMemo } from 'react';
import {
  Trash2,
  ShieldAlert,
  AlertTriangle,
  X,
  CheckSquare,
  Square,
  RefreshCw,
  ClipboardList,
  Users,
  Package,
  FileText,
  UserCheck,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Search,
  Sparkles,
  Layers
} from 'lucide-react';
import { WorkOrder, Client, Budget, InventoryItem, Mechanic } from '../types/tallerya';
import { detectDuplicateWorkOrders } from '../services/googleDriveImportService';

interface DeleteDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  workOrders?: WorkOrder[];
  clients?: Client[];
  budgets?: Budget[];
  inventory?: InventoryItem[];
  mechanics?: Mechanic[];
  workOrdersCount: number;
  clientsCount: number;
  budgetsCount: number;
  inventoryCount: number;
  mechanicsCount: number;
  onClearData: (options: {
    deleteWorkOrders: boolean;
    deleteClients: boolean;
    deleteBudgets: boolean;
    deleteInventory: boolean;
    deleteMechanics: boolean;
  }) => Promise<void>;
  onDeleteSpecificWorkOrders?: (orderIds: string[]) => Promise<void>;
  onDeleteSpecificClients?: (clientIds: string[]) => Promise<void>;
  onDeleteSpecificBudgets?: (budgetIds: string[]) => Promise<void>;
  onDeleteSpecificInventory?: (inventoryIds: string[]) => Promise<void>;
  onDeleteSpecificMechanics?: (mechanicIds: string[]) => Promise<void>;
}

export function DeleteDataModal({
  isOpen,
  onClose,
  workOrders = [],
  clients = [],
  budgets = [],
  inventory = [],
  mechanics = [],
  workOrdersCount,
  clientsCount,
  budgetsCount,
  inventoryCount,
  mechanicsCount,
  onClearData,
  onDeleteSpecificWorkOrders,
  onDeleteSpecificClients,
  onDeleteSpecificBudgets,
  onDeleteSpecificInventory,
  onDeleteSpecificMechanics
}: DeleteDataModalProps) {
  // Category level selections
  const [deleteWorkOrders, setDeleteWorkOrders] = useState(false);
  const [deleteClients, setDeleteClients] = useState(false);
  const [deleteBudgets, setDeleteBudgets] = useState(false);
  const [deleteInventory, setDeleteInventory] = useState(false);
  const [deleteMechanics, setDeleteMechanics] = useState(false);

  // 1. Work Orders specific selection
  const [showSubOrders, setShowSubOrders] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [orderSearch, setOrderSearch] = useState('');

  // 2. Clients specific selection
  const [showSubClients, setShowSubClients] = useState(false);
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [clientSearch, setClientSearch] = useState('');

  // 3. Budgets specific selection
  const [showSubBudgets, setShowSubBudgets] = useState(false);
  const [selectedBudgetIds, setSelectedBudgetIds] = useState<string[]>([]);
  const [budgetSearch, setBudgetSearch] = useState('');

  // 4. Inventory specific selection
  const [showSubInventory, setShowSubInventory] = useState(false);
  const [selectedInventoryIds, setSelectedInventoryIds] = useState<string[]>([]);
  const [inventorySearch, setInventorySearch] = useState('');

  // 5. Mechanics specific selection
  const [showSubMechanics, setShowSubMechanics] = useState(false);
  const [selectedMechanicIds, setSelectedMechanicIds] = useState<string[]>([]);
  const [mechanicSearch, setMechanicSearch] = useState('');

  // Confirmation modal state
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmMode, setConfirmMode] = useState<
    | 'categories'
    | 'specificWorkOrders'
    | 'specificClients'
    | 'specificBudgets'
    | 'specificInventory'
    | 'specificMechanics'
    | 'duplicates'
  >('categories');

  const [isDeleting, setIsDeleting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Detect duplicates automatically in work orders
  const duplicateInfo = useMemo(() => {
    return detectDuplicateWorkOrders(workOrders);
  }, [workOrders]);

  const totalCategorySelectedCount =
    (deleteWorkOrders ? workOrdersCount : 0) +
    (deleteClients ? clientsCount : 0) +
    (deleteBudgets ? budgetsCount : 0) +
    (deleteInventory ? inventoryCount : 0) +
    (deleteMechanics ? mechanicsCount : 0);

  const allSelected =
    deleteWorkOrders &&
    deleteClients &&
    deleteBudgets &&
    deleteInventory &&
    deleteMechanics;

  const toggleSelectAllCategories = () => {
    if (allSelected) {
      setDeleteWorkOrders(false);
      setDeleteClients(false);
      setDeleteBudgets(false);
      setDeleteInventory(false);
      setDeleteMechanics(false);
    } else {
      setDeleteWorkOrders(true);
      setDeleteClients(true);
      setDeleteBudgets(true);
      setDeleteInventory(true);
      setDeleteMechanics(true);
    }
  };

  // Start confirmation triggers
  const handleStartDeleteCategories = () => {
    if (totalCategorySelectedCount === 0) return;
    setErrorMessage('');
    setConfirmMode('categories');
    setShowConfirm(true);
  };

  const handleStartDeleteDuplicates = () => {
    if (duplicateInfo.duplicateIds.length === 0) return;
    setErrorMessage('');
    setConfirmMode('duplicates');
    setShowConfirm(true);
  };

  const handleStartDeleteSpecificOrders = () => {
    if (selectedOrderIds.length === 0) return;
    setErrorMessage('');
    setConfirmMode('specificWorkOrders');
    setShowConfirm(true);
  };

  const handleStartDeleteSpecificClients = () => {
    if (selectedClientIds.length === 0) return;
    setErrorMessage('');
    setConfirmMode('specificClients');
    setShowConfirm(true);
  };

  const handleStartDeleteSpecificBudgets = () => {
    if (selectedBudgetIds.length === 0) return;
    setErrorMessage('');
    setConfirmMode('specificBudgets');
    setShowConfirm(true);
  };

  const handleStartDeleteSpecificInventory = () => {
    if (selectedInventoryIds.length === 0) return;
    setErrorMessage('');
    setConfirmMode('specificInventory');
    setShowConfirm(true);
  };

  const handleStartDeleteSpecificMechanics = () => {
    if (selectedMechanicIds.length === 0) return;
    setErrorMessage('');
    setConfirmMode('specificMechanics');
    setShowConfirm(true);
  };

  // Confirm and execute deletion
  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    setErrorMessage('');
    try {
      if (confirmMode === 'categories') {
        await onClearData({
          deleteWorkOrders,
          deleteClients,
          deleteBudgets,
          deleteInventory,
          deleteMechanics
        });
        setSuccessMessage('¡Las categorías seleccionadas han sido eliminadas correctamente!');
        setDeleteWorkOrders(false);
        setDeleteClients(false);
        setDeleteBudgets(false);
        setDeleteInventory(false);
        setDeleteMechanics(false);
      } else if (confirmMode === 'duplicates' && onDeleteSpecificWorkOrders) {
        await onDeleteSpecificWorkOrders(duplicateInfo.duplicateIds);
        setSuccessMessage(`¡Se eliminaron ${duplicateInfo.duplicateIds.length} órdenes duplicadas correctamente!`);
      } else if (confirmMode === 'specificWorkOrders' && onDeleteSpecificWorkOrders) {
        await onDeleteSpecificWorkOrders(selectedOrderIds);
        setSuccessMessage(`¡Se eliminaron ${selectedOrderIds.length} órdenes de trabajo seleccionadas!`);
        setSelectedOrderIds([]);
      } else if (confirmMode === 'specificClients' && onDeleteSpecificClients) {
        await onDeleteSpecificClients(selectedClientIds);
        setSuccessMessage(`¡Se eliminaron ${selectedClientIds.length} clientes seleccionados!`);
        setSelectedClientIds([]);
      } else if (confirmMode === 'specificBudgets' && onDeleteSpecificBudgets) {
        await onDeleteSpecificBudgets(selectedBudgetIds);
        setSuccessMessage(`¡Se eliminaron ${selectedBudgetIds.length} presupuestos seleccionados!`);
        setSelectedBudgetIds([]);
      } else if (confirmMode === 'specificInventory' && onDeleteSpecificInventory) {
        await onDeleteSpecificInventory(selectedInventoryIds);
        setSuccessMessage(`¡Se eliminaron ${selectedInventoryIds.length} repuestos del inventario!`);
        setSelectedInventoryIds([]);
      } else if (confirmMode === 'specificMechanics' && onDeleteSpecificMechanics) {
        await onDeleteSpecificMechanics(selectedMechanicIds);
        setSuccessMessage(`¡Se eliminaron ${selectedMechanicIds.length} mecánicos/personal seleccionados!`);
        setSelectedMechanicIds([]);
      }

      setShowConfirm(false);

      setTimeout(() => {
        setSuccessMessage('');
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error('Error borrando datos:', err);
      setErrorMessage('Ocurrió un error al intentar eliminar los datos: ' + (err.message || String(err)));
    } finally {
      setIsDeleting(false);
    }
  };

  // 1. FILTERED WORK ORDERS
  const filteredWorkOrders = useMemo(() => {
    if (!orderSearch) return workOrders;
    const q = orderSearch.toLowerCase();
    return workOrders.filter(
      (wo) =>
        wo.numeroOrden?.toLowerCase().includes(q) ||
        wo.clienteNombre?.toLowerCase().includes(q) ||
        wo.vehiculo?.patente?.toLowerCase().includes(q) ||
        wo.vehiculo?.marca?.toLowerCase().includes(q) ||
        wo.vehiculo?.modelo?.toLowerCase().includes(q)
    );
  }, [workOrders, orderSearch]);

  const toggleSelectOrder = (id: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllFilteredOrders = () => {
    const allFilteredIds = filteredWorkOrders.map((w) => w.id);
    const allAreSelected = allFilteredIds.every((id) => selectedOrderIds.includes(id));
    if (allAreSelected) {
      setSelectedOrderIds((prev) => prev.filter((id) => !allFilteredIds.includes(id)));
    } else {
      setSelectedOrderIds((prev) => Array.from(new Set([...prev, ...allFilteredIds])));
    }
  };

  // 2. FILTERED CLIENTS
  const filteredClients = useMemo(() => {
    if (!clientSearch) return clients;
    const q = clientSearch.toLowerCase();
    return clients.filter(
      (c) =>
        c.nombre?.toLowerCase().includes(q) ||
        c.telefono?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.vehiculos?.some(
          (v) =>
            v.patente?.toLowerCase().includes(q) ||
            v.marca?.toLowerCase().includes(q) ||
            v.modelo?.toLowerCase().includes(q)
        )
    );
  }, [clients, clientSearch]);

  const toggleSelectClient = (id: string) => {
    setSelectedClientIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllFilteredClients = () => {
    const allFilteredIds = filteredClients.map((c) => c.id);
    const allAreSelected = allFilteredIds.every((id) => selectedClientIds.includes(id));
    if (allAreSelected) {
      setSelectedClientIds((prev) => prev.filter((id) => !allFilteredIds.includes(id)));
    } else {
      setSelectedClientIds((prev) => Array.from(new Set([...prev, ...allFilteredIds])));
    }
  };

  // 3. FILTERED BUDGETS
  const filteredBudgets = useMemo(() => {
    if (!budgetSearch) return budgets;
    const q = budgetSearch.toLowerCase();
    return budgets.filter(
      (b) =>
        b.numeroPresupuesto?.toLowerCase().includes(q) ||
        b.clienteNombre?.toLowerCase().includes(q) ||
        b.vehiculoInfo?.toLowerCase().includes(q) ||
        b.total?.toString().includes(q)
    );
  }, [budgets, budgetSearch]);

  const toggleSelectBudget = (id: string) => {
    setSelectedBudgetIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllFilteredBudgets = () => {
    const allFilteredIds = filteredBudgets.map((b) => b.id);
    const allAreSelected = allFilteredIds.every((id) => selectedBudgetIds.includes(id));
    if (allAreSelected) {
      setSelectedBudgetIds((prev) => prev.filter((id) => !allFilteredIds.includes(id)));
    } else {
      setSelectedBudgetIds((prev) => Array.from(new Set([...prev, ...allFilteredIds])));
    }
  };

  // 4. FILTERED INVENTORY
  const filteredInventory = useMemo(() => {
    if (!inventorySearch) return inventory;
    const q = inventorySearch.toLowerCase();
    return inventory.filter(
      (i) =>
        i.codigo?.toLowerCase().includes(q) ||
        i.nombre?.toLowerCase().includes(q) ||
        i.categoria?.toLowerCase().includes(q) ||
        i.ubicacion?.toLowerCase().includes(q)
    );
  }, [inventory, inventorySearch]);

  const toggleSelectInventory = (id: string) => {
    setSelectedInventoryIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllFilteredInventory = () => {
    const allFilteredIds = filteredInventory.map((i) => i.id);
    const allAreSelected = allFilteredIds.every((id) => selectedInventoryIds.includes(id));
    if (allAreSelected) {
      setSelectedInventoryIds((prev) => prev.filter((id) => !allFilteredIds.includes(id)));
    } else {
      setSelectedInventoryIds((prev) => Array.from(new Set([...prev, ...allFilteredIds])));
    }
  };

  // 5. FILTERED MECHANICS
  const filteredMechanics = useMemo(() => {
    if (!mechanicSearch) return mechanics;
    const q = mechanicSearch.toLowerCase();
    return mechanics.filter(
      (m) =>
        m.nombre?.toLowerCase().includes(q) ||
        m.especialidad?.toLowerCase().includes(q) ||
        m.telefono?.toLowerCase().includes(q)
    );
  }, [mechanics, mechanicSearch]);

  const toggleSelectMechanic = (id: string) => {
    setSelectedMechanicIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllFilteredMechanics = () => {
    const allFilteredIds = filteredMechanics.map((m) => m.id);
    const allAreSelected = allFilteredIds.every((id) => selectedMechanicIds.includes(id));
    if (allAreSelected) {
      setSelectedMechanicIds((prev) => prev.filter((id) => !allFilteredIds.includes(id)));
    } else {
      setSelectedMechanicIds((prev) => Array.from(new Set([...prev, ...allFilteredIds])));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden my-auto text-slate-100 relative">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-red-600 via-red-500 to-slate-900 text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-950 text-red-400 rounded-xl font-black shadow-md border border-red-500/30">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight leading-tight">
                Eliminar / Gestor de Datos del Taller
              </h3>
              <p className="text-xs text-red-100 font-medium mt-0.5">
                Selecciona elementos específicos o elimina duplicados de forma segura
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-red-100 hover:bg-slate-950/30 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {successMessage && (
            <div className="p-3 bg-emerald-950/80 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-bold">{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-red-950/80 border border-red-500/40 rounded-xl text-xs text-red-300 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* DUPLICATE DETECTION BANNER FOR WORK ORDERS */}
          {duplicateInfo.duplicateIds.length > 0 && (
            <div className="p-4 bg-amber-950/60 border border-amber-500/50 rounded-2xl space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5 text-amber-300 font-bold text-xs">
                  <Sparkles className="w-5 h-5 text-amber-400 animate-pulse shrink-0" />
                  <span>
                    Se detectaron <strong className="text-white text-sm">{duplicateInfo.duplicateIds.length} Órdenes Duplicadas</strong> ({workOrdersCount} totales → {duplicateInfo.uniqueOrdersCount} únicas)
                  </span>
                </div>
              </div>
              <p className="text-xs text-amber-200/90 leading-relaxed">
                Estas duplicaciones suelen ocurrir al acceder desde varias computadoras o realizar múltiples importaciones.
              </p>
              <div className="pt-1 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleStartDeleteDuplicates}
                  className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4 fill-slate-950" />
                  <span>Limpiar {duplicateInfo.duplicateIds.length} Duplicados Ahora</span>
                </button>
              </div>
            </div>
          )}

          {/* Select All Toggle for Categories */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Categorías Completas
            </span>
            <button
              type="button"
              onClick={toggleSelectAllCategories}
              className="text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1.5"
            >
              {allSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
              <span>{allSelected ? 'Desmarcar Todo' : 'Seleccionar Todo'}</span>
            </button>
          </div>

          {/* Checkboxes List for Categories */}
          <div className="space-y-3">
            {/* 1. ÓRDENES DE TRABAJO */}
            <div className="space-y-2">
              <div
                className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                  deleteWorkOrders
                    ? 'bg-red-950/40 border-red-500/60 text-white'
                    : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div
                  onClick={() => setDeleteWorkOrders(!deleteWorkOrders)}
                  className="flex items-center gap-3 cursor-pointer flex-1"
                >
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                      deleteWorkOrders
                        ? 'bg-red-500 border-red-400 text-slate-950 font-black'
                        : 'border-slate-700 bg-slate-900'
                    }`}
                  >
                    {deleteWorkOrders && <span className="text-xs font-extrabold">✓</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold">Órdenes de Trabajo</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-slate-900 border border-slate-800 text-slate-400">
                    {workOrdersCount} ítems
                  </span>

                  {workOrders.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowSubOrders(!showSubOrders)}
                      className="px-2.5 py-1 text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg border border-slate-700 transition-colors flex items-center gap-1"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>{showSubOrders ? 'Ocultar Lista' : 'Seleccionar Específicas'}</span>
                      {showSubOrders ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>

              {/* Expandable list for Work Orders */}
              {showSubOrders && workOrders.length > 0 && (
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-3 animate-in fade-in duration-150">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pb-2 border-b border-slate-800">
                    <div className="relative w-full sm:w-64">
                      <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={orderSearch}
                        onChange={(e) => setOrderSearch(e.target.value)}
                        placeholder="Buscar por cliente, patente, orden..."
                        className="w-full pl-8 pr-2 py-1 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-hidden focus:border-amber-400"
                      />
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      {duplicateInfo.duplicateIds.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setSelectedOrderIds(duplicateInfo.duplicateIds)}
                          className="px-2 py-1 text-[10px] font-bold bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 rounded-md transition-colors"
                        >
                          Marcar {duplicateInfo.duplicateIds.length} Duplicados
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={toggleSelectAllFilteredOrders}
                        className="px-2 py-1 text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-colors"
                      >
                        {filteredWorkOrders.every((w) => selectedOrderIds.includes(w.id))
                          ? 'Desmarcar Visibles'
                          : 'Marcar Visibles'}
                      </button>
                    </div>
                  </div>

                  <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                    {filteredWorkOrders.map((wo) => {
                      const isSelected = selectedOrderIds.includes(wo.id);
                      const isDuplicate = duplicateInfo.duplicateIds.includes(wo.id);

                      return (
                        <div
                          key={wo.id}
                          onClick={() => toggleSelectOrder(wo.id)}
                          className={`p-2 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-red-950/50 border-red-500/60 text-white'
                              : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="w-4 h-4 rounded-md accent-red-500 cursor-pointer"
                            />
                            <div>
                              <span className="font-bold text-white">{wo.numeroOrden}</span>
                              <span className="mx-1.5 text-slate-600">|</span>
                              <span className="font-semibold text-slate-300">{wo.clienteNombre}</span>
                              <span className="mx-1.5 text-slate-600">|</span>
                              <span className="font-mono text-amber-400">{wo.vehiculo?.patente || 'S/P'}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {isDuplicate && (
                              <span className="px-1.5 py-0.5 text-[9px] font-extrabold bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded uppercase">
                                Duplicado
                              </span>
                            )}
                            <span className="text-[10px] text-slate-500">{wo.fechaIngreso || ''}</span>
                          </div>
                        </div>
                      );
                    })}

                    {filteredWorkOrders.length === 0 && (
                      <p className="text-center py-4 text-xs text-slate-500">
                        No se encontraron órdenes con esa búsqueda.
                      </p>
                    )}
                  </div>

                  {selectedOrderIds.length > 0 && (
                    <div className="pt-2 flex items-center justify-between border-t border-slate-800">
                      <span className="text-xs text-slate-400 font-medium">
                        <strong className="text-amber-300">{selectedOrderIds.length}</strong> órdenes seleccionadas
                      </span>
                      <button
                        type="button"
                        onClick={handleStartDeleteSpecificOrders}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Eliminar {selectedOrderIds.length} Seleccionadas</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 2. CLIENTES Y VEHÍCULOS */}
            <div className="space-y-2">
              <div
                className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                  deleteClients
                    ? 'bg-red-950/40 border-red-500/60 text-white'
                    : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div
                  onClick={() => setDeleteClients(!deleteClients)}
                  className="flex items-center gap-3 cursor-pointer flex-1"
                >
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                      deleteClients
                        ? 'bg-red-500 border-red-400 text-slate-950 font-black'
                        : 'border-slate-700 bg-slate-900'
                    }`}
                  >
                    {deleteClients && <span className="text-xs font-extrabold">✓</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold">Clientes y Vehículos</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-slate-900 border border-slate-800 text-slate-400">
                    {clientsCount} clientes
                  </span>

                  {clients.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowSubClients(!showSubClients)}
                      className="px-2.5 py-1 text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg border border-slate-700 transition-colors flex items-center gap-1"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>{showSubClients ? 'Ocultar Lista' : 'Seleccionar Específicos'}</span>
                      {showSubClients ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>

              {/* Expandable list for Clients */}
              {showSubClients && clients.length > 0 && (
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-3 animate-in fade-in duration-150">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pb-2 border-b border-slate-800">
                    <div className="relative w-full sm:w-64">
                      <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={clientSearch}
                        onChange={(e) => setClientSearch(e.target.value)}
                        placeholder="Buscar cliente, teléfono, patente..."
                        className="w-full pl-8 pr-2 py-1 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-hidden focus:border-amber-400"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={toggleSelectAllFilteredClients}
                      className="px-2 py-1 text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-colors"
                    >
                      {filteredClients.every((c) => selectedClientIds.includes(c.id))
                        ? 'Desmarcar Visibles'
                        : 'Marcar Visibles'}
                    </button>
                  </div>

                  <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                    {filteredClients.map((c) => {
                      const isSelected = selectedClientIds.includes(c.id);
                      const patentes = c.vehiculos?.map((v) => v.patente).filter(Boolean).join(', ');

                      return (
                        <div
                          key={c.id}
                          onClick={() => toggleSelectClient(c.id)}
                          className={`p-2 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-red-950/50 border-red-500/60 text-white'
                              : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="w-4 h-4 rounded-md accent-red-500 cursor-pointer"
                            />
                            <div>
                              <span className="font-bold text-white">{c.nombre}</span>
                              {c.telefono && (
                                <>
                                  <span className="mx-1.5 text-slate-600">|</span>
                                  <span className="text-slate-400">{c.telefono}</span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="text-[10px] text-right">
                            {patentes ? (
                              <span className="px-1.5 py-0.5 bg-slate-800 text-amber-300 font-mono font-bold rounded">
                                {patentes}
                              </span>
                            ) : (
                              <span className="text-slate-500 italic">Sin vehículos</span>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {filteredClients.length === 0 && (
                      <p className="text-center py-4 text-xs text-slate-500">
                        No se encontraron clientes con esa búsqueda.
                      </p>
                    )}
                  </div>

                  {selectedClientIds.length > 0 && (
                    <div className="pt-2 flex items-center justify-between border-t border-slate-800">
                      <span className="text-xs text-slate-400 font-medium">
                        <strong className="text-amber-300">{selectedClientIds.length}</strong> clientes seleccionados
                      </span>
                      <button
                        type="button"
                        onClick={handleStartDeleteSpecificClients}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Eliminar {selectedClientIds.length} Seleccionados</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 3. PRESUPUESTOS EMITIDOS */}
            <div className="space-y-2">
              <div
                className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                  deleteBudgets
                    ? 'bg-red-950/40 border-red-500/60 text-white'
                    : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div
                  onClick={() => setDeleteBudgets(!deleteBudgets)}
                  className="flex items-center gap-3 cursor-pointer flex-1"
                >
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                      deleteBudgets
                        ? 'bg-red-500 border-red-400 text-slate-950 font-black'
                        : 'border-slate-700 bg-slate-900'
                    }`}
                  >
                    {deleteBudgets && <span className="text-xs font-extrabold">✓</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold">Presupuestos Emitidos</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-slate-900 border border-slate-800 text-slate-400">
                    {budgetsCount} ítems
                  </span>

                  {budgets.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowSubBudgets(!showSubBudgets)}
                      className="px-2.5 py-1 text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg border border-slate-700 transition-colors flex items-center gap-1"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>{showSubBudgets ? 'Ocultar Lista' : 'Seleccionar Específicos'}</span>
                      {showSubBudgets ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>

              {/* Expandable list for Budgets */}
              {showSubBudgets && budgets.length > 0 && (
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-3 animate-in fade-in duration-150">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pb-2 border-b border-slate-800">
                    <div className="relative w-full sm:w-64">
                      <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={budgetSearch}
                        onChange={(e) => setBudgetSearch(e.target.value)}
                        placeholder="Buscar presupuesto, cliente..."
                        className="w-full pl-8 pr-2 py-1 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-hidden focus:border-amber-400"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={toggleSelectAllFilteredBudgets}
                      className="px-2 py-1 text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-colors"
                    >
                      {filteredBudgets.every((b) => selectedBudgetIds.includes(b.id))
                        ? 'Desmarcar Visibles'
                        : 'Marcar Visibles'}
                    </button>
                  </div>

                  <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                    {filteredBudgets.map((b) => {
                      const isSelected = selectedBudgetIds.includes(b.id);

                      return (
                        <div
                          key={b.id}
                          onClick={() => toggleSelectBudget(b.id)}
                          className={`p-2 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-red-950/50 border-red-500/60 text-white'
                              : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="w-4 h-4 rounded-md accent-red-500 cursor-pointer"
                            />
                            <div>
                              <span className="font-bold text-white">{b.numeroPresupuesto}</span>
                              <span className="mx-1.5 text-slate-600">|</span>
                              <span className="font-semibold text-slate-300">{b.clienteNombre}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="font-mono text-amber-400 font-bold text-xs">
                              ${b.total?.toLocaleString('es-AR')}
                            </span>
                            <span className="text-[10px] text-slate-500">{b.fecha || ''}</span>
                          </div>
                        </div>
                      );
                    })}

                    {filteredBudgets.length === 0 && (
                      <p className="text-center py-4 text-xs text-slate-500">
                        No se encontraron presupuestos con esa búsqueda.
                      </p>
                    )}
                  </div>

                  {selectedBudgetIds.length > 0 && (
                    <div className="pt-2 flex items-center justify-between border-t border-slate-800">
                      <span className="text-xs text-slate-400 font-medium">
                        <strong className="text-amber-300">{selectedBudgetIds.length}</strong> presupuestos seleccionados
                      </span>
                      <button
                        type="button"
                        onClick={handleStartDeleteSpecificBudgets}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Eliminar {selectedBudgetIds.length} Seleccionados</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 4. INVENTARIO / REPUESTOS */}
            <div className="space-y-2">
              <div
                className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                  deleteInventory
                    ? 'bg-red-950/40 border-red-500/60 text-white'
                    : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div
                  onClick={() => setDeleteInventory(!deleteInventory)}
                  className="flex items-center gap-3 cursor-pointer flex-1"
                >
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                      deleteInventory
                        ? 'bg-red-500 border-red-400 text-slate-950 font-black'
                        : 'border-slate-700 bg-slate-900'
                    }`}
                  >
                    {deleteInventory && <span className="text-xs font-extrabold">✓</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold">Inventario / Repuestos</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-slate-900 border border-slate-800 text-slate-400">
                    {inventoryCount} repuestos
                  </span>

                  {inventory.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowSubInventory(!showSubInventory)}
                      className="px-2.5 py-1 text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg border border-slate-700 transition-colors flex items-center gap-1"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>{showSubInventory ? 'Ocultar Lista' : 'Seleccionar Específicos'}</span>
                      {showSubInventory ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>

              {/* Expandable list for Inventory */}
              {showSubInventory && inventory.length > 0 && (
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-3 animate-in fade-in duration-150">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pb-2 border-b border-slate-800">
                    <div className="relative w-full sm:w-64">
                      <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={inventorySearch}
                        onChange={(e) => setInventorySearch(e.target.value)}
                        placeholder="Buscar repuesto, código, categoría..."
                        className="w-full pl-8 pr-2 py-1 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-hidden focus:border-amber-400"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={toggleSelectAllFilteredInventory}
                      className="px-2 py-1 text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-colors"
                    >
                      {filteredInventory.every((i) => selectedInventoryIds.includes(i.id))
                        ? 'Desmarcar Visibles'
                        : 'Marcar Visibles'}
                    </button>
                  </div>

                  <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                    {filteredInventory.map((item) => {
                      const isSelected = selectedInventoryIds.includes(item.id);

                      return (
                        <div
                          key={item.id}
                          onClick={() => toggleSelectInventory(item.id)}
                          className={`p-2 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-red-950/50 border-red-500/60 text-white'
                              : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="w-4 h-4 rounded-md accent-red-500 cursor-pointer"
                            />
                            <div>
                              <span className="font-mono text-amber-400 font-bold">[{item.codigo}]</span>
                              <span className="mx-1.5 text-slate-600">|</span>
                              <span className="font-bold text-white">{item.nombre}</span>
                              {item.categoria && (
                                <span className="ml-2 px-1.5 py-0.2 bg-slate-800 text-slate-400 rounded text-[10px]">
                                  {item.categoria}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-[11px]">
                            <span className="text-slate-400">Stock: <strong className="text-white">{item.stockActual}</strong></span>
                            <span className="font-mono text-emerald-400 font-bold">${item.precioVenta?.toLocaleString('es-AR')}</span>
                          </div>
                        </div>
                      );
                    })}

                    {filteredInventory.length === 0 && (
                      <p className="text-center py-4 text-xs text-slate-500">
                        No se encontraron repuestos con esa búsqueda.
                      </p>
                    )}
                  </div>

                  {selectedInventoryIds.length > 0 && (
                    <div className="pt-2 flex items-center justify-between border-t border-slate-800">
                      <span className="text-xs text-slate-400 font-medium">
                        <strong className="text-amber-300">{selectedInventoryIds.length}</strong> repuestos seleccionados
                      </span>
                      <button
                        type="button"
                        onClick={handleStartDeleteSpecificInventory}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Eliminar {selectedInventoryIds.length} Seleccionados</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 5. MECÁNICOS / PERSONAL */}
            <div className="space-y-2">
              <div
                className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                  deleteMechanics
                    ? 'bg-red-950/40 border-red-500/60 text-white'
                    : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div
                  onClick={() => setDeleteMechanics(!deleteMechanics)}
                  className="flex items-center gap-3 cursor-pointer flex-1"
                >
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                      deleteMechanics
                        ? 'bg-red-500 border-red-400 text-slate-950 font-black'
                        : 'border-slate-700 bg-slate-900'
                    }`}
                  >
                    {deleteMechanics && <span className="text-xs font-extrabold">✓</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold">Mecánicos / Personal</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-slate-900 border border-slate-800 text-slate-400">
                    {mechanicsCount} mecánicos
                  </span>

                  {mechanics.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowSubMechanics(!showSubMechanics)}
                      className="px-2.5 py-1 text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg border border-slate-700 transition-colors flex items-center gap-1"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>{showSubMechanics ? 'Ocultar Lista' : 'Seleccionar Específicos'}</span>
                      {showSubMechanics ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>

              {/* Expandable list for Mechanics */}
              {showSubMechanics && mechanics.length > 0 && (
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-3 animate-in fade-in duration-150">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pb-2 border-b border-slate-800">
                    <div className="relative w-full sm:w-64">
                      <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={mechanicSearch}
                        onChange={(e) => setMechanicSearch(e.target.value)}
                        placeholder="Buscar mecánico, especialidad..."
                        className="w-full pl-8 pr-2 py-1 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-hidden focus:border-amber-400"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={toggleSelectAllFilteredMechanics}
                      className="px-2 py-1 text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-colors"
                    >
                      {filteredMechanics.every((m) => selectedMechanicIds.includes(m.id))
                        ? 'Desmarcar Visibles'
                        : 'Marcar Visibles'}
                    </button>
                  </div>

                  <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                    {filteredMechanics.map((m) => {
                      const isSelected = selectedMechanicIds.includes(m.id);

                      return (
                        <div
                          key={m.id}
                          onClick={() => toggleSelectMechanic(m.id)}
                          className={`p-2 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-red-950/50 border-red-500/60 text-white'
                              : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="w-4 h-4 rounded-md accent-red-500 cursor-pointer"
                            />
                            <div>
                              <span className="font-bold text-white">{m.nombre}</span>
                              {m.especialidad && (
                                <>
                                  <span className="mx-1.5 text-slate-600">|</span>
                                  <span className="text-amber-300 font-medium">{m.especialidad}</span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {m.telefono && <span className="text-[10px] text-slate-400">{m.telefono}</span>}
                            <span
                              className={`px-1.5 py-0.5 text-[9px] font-extrabold rounded uppercase ${
                                m.activo ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {m.activo ? 'Activo' : 'Inactivo'}
                            </span>
                          </div>
                        </div>
                      );
                    })}

                    {filteredMechanics.length === 0 && (
                      <p className="text-center py-4 text-xs text-slate-500">
                        No se encontraron mecánicos con esa búsqueda.
                      </p>
                    )}
                  </div>

                  {selectedMechanicIds.length > 0 && (
                    <div className="pt-2 flex items-center justify-between border-t border-slate-800">
                      <span className="text-xs text-slate-400 font-medium">
                        <strong className="text-amber-300">{selectedMechanicIds.length}</strong> mecánicos seleccionados
                      </span>
                      <button
                        type="button"
                        onClick={handleStartDeleteSpecificMechanics}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Eliminar {selectedMechanicIds.length} Seleccionados</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Action trigger button */}
          {!showConfirm ? (
            <div className="pt-2">
              <button
                type="button"
                onClick={handleStartDeleteCategories}
                disabled={totalCategorySelectedCount === 0}
                className="w-full py-3 px-4 bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:hover:bg-red-600 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>
                  Eliminar Categorías Completas Seleccionadas ({totalCategorySelectedCount} ítems)
                </span>
              </button>
            </div>
          ) : (
            /* Warning Confirmation Panel */
            <div className="p-4 bg-red-950/90 border-2 border-red-500 rounded-2xl space-y-3 animate-in fade-in duration-200">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-red-900/80 rounded-xl text-red-300 shrink-0">
                  <AlertTriangle className="w-6 h-6 text-amber-400" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-black text-white">
                    ¿ESTÁS SEGURO QUE QUIERES BORRAR?
                  </h4>
                  <p className="text-xs text-red-200 leading-relaxed">
                    Se eliminarán de forma permanente{' '}
                    <strong className="text-amber-300 font-extrabold">
                      {confirmMode === 'categories'
                        ? `${totalCategorySelectedCount} elementos de las categorías completas`
                        : confirmMode === 'duplicates'
                        ? `${duplicateInfo.duplicateIds.length} órdenes duplicadas`
                        : confirmMode === 'specificWorkOrders'
                        ? `${selectedOrderIds.length} órdenes de trabajo seleccionadas`
                        : confirmMode === 'specificClients'
                        ? `${selectedClientIds.length} clientes seleccionados`
                        : confirmMode === 'specificBudgets'
                        ? `${selectedBudgetIds.length} presupuestos seleccionados`
                        : confirmMode === 'specificInventory'
                        ? `${selectedInventoryIds.length} repuestos seleccionados`
                        : `${selectedMechanicIds.length} mecánicos seleccionados`}
                    </strong>{' '}
                    de la base de datos en la nube (Firestore) y del almacenamiento local.
                  </p>
                  <p className="text-[11px] font-bold text-red-300 uppercase tracking-wider">
                    ⚠️ Esta acción NO SE PUEDE DESHACER.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-red-800/80">
                <button
                  type="button"
                  onClick={() => setShowConfirm(false)}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs rounded-xl border border-slate-700 transition-colors"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 px-3 bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  <span>{isDeleting ? 'Borrando...' : 'Sí, Borrar Ahora'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
