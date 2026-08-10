import React, { useState, useEffect } from 'react';
import { Workshop, PricingSettings } from '../types/tallerya';
import {
  getAllWorkshops,
  adminUpdateWorkshopSubscription,
  adminDeleteWorkshop,
  createLicenseCodeInFirestore,
  getAllLicenseCodesFromFirestore,
  LicenseCodeDoc,
  getPricingSettings,
  savePricingSettings,
  DEFAULT_PRICING_SETTINGS
} from '../services/tallerService';
import {
  ShieldAlert,
  Search,
  RefreshCw,
  Zap,
  Key,
  CheckCircle2,
  Clock,
  Copy,
  Plus,
  Send,
  X,
  Lock,
  Building2,
  User,
  Phone,
  Sparkles,
  Calendar,
  AlertCircle,
  Mail,
  Trash2,
  DollarSign,
  Coins,
  Save,
  Calculator
} from 'lucide-react';

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserEmail?: string | null;
}

export function AdminPanelModal({ isOpen, onClose, currentUserEmail }: AdminPanelModalProps) {
  // Security protection: Admin PIN
  const [pinInput, setPinInput] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinError, setPinError] = useState('');

  // Data states
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [licenses, setLicenses] = useState<LicenseCodeDoc[]>([]);
  const [pricingForm, setPricingForm] = useState<PricingSettings>(DEFAULT_PRICING_SETTINGS);
  const [savingPrices, setSavingPrices] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'workshops' | 'licenses' | 'prices'>('workshops');

  // License creation state
  const [newCodeCustom, setNewCodeCustom] = useState('');
  const [newCodePlan, setNewCodePlan] = useState<'pro' | 'basico'>('pro');
  const [newCodeDays, setNewCodeDays] = useState<number>(30);
  const [assignedEmail, setAssignedEmail] = useState('');
  const [assignedToName, setAssignedToName] = useState('');
  const [creatingLicense, setCreatingLicense] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');
  const [workshopToDelete, setWorkshopToDelete] = useState<Workshop | null>(null);

  useEffect(() => {
    // Auto-authenticate if email is owner mecanicadakar@gmail.com
    if (currentUserEmail === 'mecanicadakar@gmail.com') {
      setIsAuthenticated(true);
    }
  }, [currentUserEmail]);

  useEffect(() => {
    if (isOpen && isAuthenticated) {
      loadData();
    }
  }, [isOpen, isAuthenticated]);

  const loadData = async () => {
    setLoading(true);
    setActionSuccess('');
    setActionError('');
    try {
      const [wList, lList, priceData] = await Promise.all([
        getAllWorkshops(),
        getAllLicenseCodesFromFirestore(),
        getPricingSettings()
      ]);
      setWorkshops(wList);
      setLicenses(lList);
      setPricingForm(priceData);
    } catch (err: any) {
      console.warn('Error loading admin data:', err);
      setActionError('Error al cargar datos desde Firestore: ' + (err.message || String(err)));
    } finally {
      setLoading(false);
    }
  };

  const handleAutoCalculatePyg = () => {
    const rate = pricingForm.exchangeRateUsdToPyg || 7500;
    // Round to nearest 5000 or 10000 PYG for clean local pricing
    const calcPyg = (usd: number) => Math.round((usd * rate) / 5000) * 5000;

    setPricingForm((prev) => ({
      ...prev,
      basicoPricePyg: calcPyg(prev.basicoPriceUsd),
      proPricePyg: calcPyg(prev.proPriceUsd),
      anualPricePyg: calcPyg(prev.anualPriceUsd)
    }));
    setActionSuccess(`Precios en Guaraníes recalculados según cotización del Dólar ($1 USD = ${rate.toLocaleString('es-PY')} PYG).`);
  };

  const handleSavePricing = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPrices(true);
    setActionSuccess('');
    setActionError('');
    try {
      await savePricingSettings(pricingForm);
      setActionSuccess('¡Precios de Planes y Cotización guardados exitosamente en Firebase!');
    } catch (err: any) {
      console.error('Error saving pricing:', err);
      setActionError('Error al guardar precios: ' + (err.message || String(err)));
    } finally {
      setSavingPrices(false);
    }
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      pinInput === 'Cajiri120588#' ||
      pinInput === '2026' ||
      pinInput === 'admin' ||
      pinInput === 'dakar2026'
    ) {
      setIsAuthenticated(true);
      setPinError('');
    } else {
      setPinError('PIN de acceso incorrecto. Intenta nuevamente.');
    }
  };

  const handleUpdateSubscription = async (
    tallerId: string,
    plan: 'pro' | 'basico' | 'trial',
    status: 'active' | 'trial' | 'expired',
    days: number
  ) => {
    setLoading(true);
    setActionSuccess('');
    setActionError('');
    try {
      await adminUpdateWorkshopSubscription(tallerId, plan, status, days);
      setActionSuccess(`Plan ${plan.toUpperCase()} actualizado exitosamente (${days} días).`);
      await loadData();
    } catch (err: any) {
      console.error('Error updating subscription:', err);
      setActionError('Error al actualizar suscripción: ' + (err.message || String(err)));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWorkshop = (w: Workshop) => {
    setWorkshopToDelete(w);
  };

  const confirmDeleteWorkshop = async () => {
    if (!workshopToDelete) return;
    const w = workshopToDelete;
    setWorkshopToDelete(null);

    setLoading(true);
    setActionSuccess('');
    setActionError('');
    try {
      await adminDeleteWorkshop(w.id, w.email);
      setActionSuccess(`El taller "${w.nombreTaller || w.id}" ha sido eliminado exitosamente.`);
      await loadData();
    } catch (err: any) {
      console.error('Error deleting workshop:', err);
      setActionError('Error al eliminar taller: ' + (err.message || String(err)));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingLicense(true);
    setActionSuccess('');
    setActionError('');

    // Generate random code if empty
    const codeToUse =
      newCodeCustom.trim() ||
      `PRO-${Math.random().toString(36).substring(2, 7).toUpperCase()}-2026`;

    try {
      await createLicenseCodeInFirestore(
        codeToUse,
        newCodePlan,
        newCodeDays,
        assignedEmail,
        assignedToName
      );
      let successMsg = `Código de Licencia "${codeToUse}" creado con éxito.`;
      if (assignedEmail.trim()) {
        successMsg += ` Asignado a: ${assignedEmail.trim()}`;
      }
      setActionSuccess(successMsg);
      setNewCodeCustom('');
      setAssignedEmail('');
      setAssignedToName('');
      await loadData();
    } catch (err: any) {
      console.error('Error creating license code:', err);
      setActionError('Error al crear código de licencia: ' + (err.message || String(err)));
    } finally {
      setCreatingLicense(false);
    }
  };

  const handleAssignCodeToWorkshop = (w: Workshop) => {
    setActiveTab('licenses');
    setAssignedEmail(w.email || '');
    setAssignedToName(w.nombreTaller || w.nombreOwner || '');
    const cleanName = (w.nombreTaller || w.nombreOwner || 'TALLER')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');
    setNewCodeCustom(`PRO-${cleanName.substring(0, 8)}-2026`);
    setActionSuccess(`Formulario prellenado para el taller: ${w.nombreTaller || w.email}`);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setActionSuccess(`Código "${text}" copiado al portapapeles.`);
    setTimeout(() => setActionSuccess(''), 3000);
  };

  const generateWhatsAppShare = (lic: LicenseCodeDoc) => {
    const greeting = lic.assignedToName ? `Hola *${lic.assignedToName}*! ` : '¡Hola! ';
    const text = encodeURIComponent(
      `${greeting}Tu código de activación para MiTaller es: *${lic.code}*\n\nEste código te otorga *${lic.days} días* de acceso total al *Plan PRO*. Ingrésalo en la sección "Suscripción & Plan" dentro de tu aplicación.`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  if (!isOpen) return null;

  const filteredWorkshops = workshops.filter((w) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase().trim();
    const name = (w.nombreTaller || w.email || w.id || '').toLowerCase();
    const email = (w.email || '').toLowerCase();
    const owner = (w.nombreOwner || '').toLowerCase();
    const phone = w.telefono || '';
    const id = (w.id || '').toLowerCase();
    return (
      name.includes(term) ||
      email.includes(term) ||
      owner.includes(term) ||
      phone.includes(term) ||
      id.includes(term)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-hidden">
      <div className="bg-slate-900 rounded-2xl shadow-2xl max-w-4xl w-full border border-slate-800 overflow-hidden my-auto flex flex-col max-h-[90vh] h-[90vh] text-slate-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-slate-900 text-slate-950 p-5 sm:p-6 relative shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-slate-950 text-amber-400 rounded-xl font-black shadow-lg">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-950 tracking-tight">
                  Panel de Administración SuperAdmin
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-950 text-amber-400">
                  <span className="text-amber-400">Mi</span>Taller Master
                </span>
              </div>
              <p className="text-xs text-slate-900 font-semibold mt-0.5">
                Gestión central de talleres registrados, activación de suscripciones y códigos PRO
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-900 hover:bg-slate-950/20 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Auth Barrier if not authenticated */}
        {!isAuthenticated ? (
          <div className="p-8 max-w-md mx-auto text-center space-y-4 my-8">
            <div className="w-16 h-16 bg-amber-500/10 text-amber-400 rounded-full flex items-center justify-center mx-auto border border-amber-500/20">
              <Lock className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white">Acceso Restringido para Administrador</h3>
            <p className="text-xs text-slate-400">
              Introduce el PIN de seguridad o clave maestra para acceder a la gestión de clientes y licencias.
            </p>
            <form onSubmit={handlePinSubmit} className="space-y-3 pt-2">
              <input
                type="password"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="PIN o Clave de Administrador"
                className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-center font-mono text-sm font-bold text-amber-400 tracking-widest focus:outline-hidden focus:border-amber-400"
              />
              {pinError && <p className="text-xs font-semibold text-red-400 bg-red-950/50 p-2 rounded-lg border border-red-800">{pinError}</p>}
              <button
                type="submit"
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition-colors"
              >
                Ingresar al Panel SuperAdmin
              </button>
            </form>
          </div>
        ) : (
          <>
            {/* Tabs & Controls */}
            <div className="flex flex-wrap items-center justify-between border-b border-slate-800 bg-slate-950 px-6 py-3 gap-3">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('workshops')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                    activeTab === 'workshops'
                      ? 'bg-amber-500 text-slate-950 shadow-md'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  <span>Talleres Registrados ({workshops.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('licenses')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                    activeTab === 'licenses'
                      ? 'bg-amber-500 text-slate-950 shadow-md'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <Key className="w-4 h-4" />
                  <span>Generar / Ver Codigos PRO ({licenses.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('prices')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                    activeTab === 'prices'
                      ? 'bg-amber-500 text-slate-950 shadow-md'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <Coins className="w-4 h-4 text-emerald-400" />
                  <span>Precios & Cotización Dólar</span>
                </button>
              </div>

              <button
                onClick={loadData}
                disabled={loading}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs rounded-xl border border-slate-800 transition-colors flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
                <span>Actualizar Datos</span>
              </button>
            </div>

            {/* Notification Banners */}
            {actionSuccess && (
              <div className="mx-6 mt-4 p-3 bg-emerald-950/80 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{actionSuccess}</span>
              </div>
            )}
            {actionError && (
              <div className="mx-6 mt-4 p-3 bg-red-950/80 border border-red-500/40 rounded-xl text-xs text-red-300 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 text-red-400" />
                <span>{actionError}</span>
              </div>
            )}

            {/* Body Content */}
            <div className="p-4 sm:p-6 overflow-y-auto min-h-0 flex-1 space-y-6 bg-slate-900/50">
              {activeTab === 'workshops' && (
                <div className="space-y-4">
                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Buscar por nombre de taller, email, dueño o teléfono..."
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
                    />
                  </div>

                  {loading ? (
                    <div className="p-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                      <span>Cargando talleres registrados desde Firestore...</span>
                    </div>
                  ) : filteredWorkshops.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-2xl">
                      No se encontraron talleres con el criterio de búsqueda.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      {filteredWorkshops.map((w) => {
                        const sub = w.subscription || { plan: 'trial', status: 'trial' };
                        const isPro = sub.plan === 'pro';

                        return (
                          <div
                            key={w.id}
                            className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:border-slate-700 transition-all"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-white text-sm">{w.nombreTaller || w.email || `Taller (${w.id.substring(0, 8)})`}</h4>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                    isPro
                                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                      : 'bg-slate-800 text-slate-400'
                                  }`}
                                >
                                  {sub.plan ? sub.plan.toUpperCase() : 'PRUEBA'}
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                                <span className="flex items-center gap-1">
                                  <User className="w-3.5 h-3.5 text-slate-500" />
                                  {w.nombreOwner || 'Owner no especificado'}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                                  {w.telefono || 'Sin Teléfono'}
                                </span>
                                <span className="text-slate-500 font-mono text-[11px]">{w.email}</span>
                              </div>

                              {'subscriptionEndsAt' in sub && sub.subscriptionEndsAt && (
                                <p className="text-[11px] text-slate-500 flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-slate-600" />
                                  Vence: {new Date((sub as any).subscriptionEndsAt).toLocaleDateString()}
                                </p>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex flex-wrap items-center gap-2 shrink-0">
                              <button
                                onClick={() => handleAssignCodeToWorkshop(w)}
                                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs rounded-xl border border-slate-700 transition-colors flex items-center gap-1"
                                title="Generar código de acceso prefijando este usuario"
                              >
                                <Key className="w-3.5 h-3.5 text-amber-400" />
                                <span>Asignar Código</span>
                              </button>

                              <button
                                onClick={() => handleUpdateSubscription(w.id, 'pro', 'active', 30)}
                                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1"
                              >
                                <Zap className="w-3.5 h-3.5" />
                                <span>Activar PRO (30d)</span>
                              </button>

                              <button
                                onClick={() => handleUpdateSubscription(w.id, 'pro', 'active', 365)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1"
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>PRO (1 Año)</span>
                              </button>

                              <button
                                onClick={() => handleUpdateSubscription(w.id, 'trial', 'expired', 0)}
                                className="px-2.5 py-1.5 bg-slate-800 hover:bg-amber-950/60 hover:text-amber-400 text-slate-400 font-semibold text-xs rounded-xl transition-colors"
                              >
                                Expirar
                              </button>

                              <button
                                onClick={() => handleDeleteWorkshop(w)}
                                className="px-2.5 py-1.5 bg-red-950/50 hover:bg-red-600 text-red-400 hover:text-white font-semibold text-xs rounded-xl border border-red-800/60 transition-colors flex items-center gap-1"
                                title="Eliminar taller permanentemente"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Eliminar</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'licenses' && (
                <div className="space-y-6">
                  {/* Create License Form */}
                  <div className="p-5 bg-slate-950 border border-slate-800 rounded-2xl space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-bold text-white text-sm flex items-center gap-2">
                        <Plus className="w-4 h-4 text-amber-400" />
                        Generar Nuevo Código de Licencia y Asignar Usuario
                      </h3>

                      {workshops.length > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-400">Autollenar con taller:</span>
                          <select
                            onChange={(e) => {
                              const selected = workshops.find((w) => w.id === e.target.value);
                              if (selected) handleAssignCodeToWorkshop(selected);
                            }}
                            className="px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs text-amber-300 font-semibold focus:outline-hidden"
                            defaultValue=""
                          >
                            <option value="" disabled>-- Elegir Taller --</option>
                            {workshops.map((w) => (
                              <option key={w.id} value={w.id}>
                                {w.nombreTaller || w.email || w.id.substring(0, 8)}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    <form onSubmit={handleCreateLicense} className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1 mb-1">
                            <Mail className="w-3.5 h-3.5 text-amber-400" />
                            Email del Usuario / Taller Asignado (Opcional)
                          </label>
                          <input
                            type="email"
                            value={assignedEmail}
                            onChange={(e) => setAssignedEmail(e.target.value)}
                            placeholder="ejemplo@correo.com"
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-semibold text-white placeholder-slate-600 focus:outline-hidden focus:border-amber-400"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1 mb-1">
                            <User className="w-3.5 h-3.5 text-amber-400" />
                            Nombre del Taller / Destinatario (Opcional)
                          </label>
                          <input
                            type="text"
                            value={assignedToName}
                            onChange={(e) => setAssignedToName(e.target.value)}
                            placeholder="Ej: Taller Dakar / Juan Pérez"
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-semibold text-white placeholder-slate-600 focus:outline-hidden focus:border-amber-400"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                        <div>
                          <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                            Código Personalizado (o Dejar Vacío para Auto)
                          </label>
                          <input
                            type="text"
                            value={newCodeCustom}
                            onChange={(e) => setNewCodeCustom(e.target.value)}
                            placeholder="Ej: TALLERYA-PRO-2026"
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono font-bold text-amber-400 placeholder-slate-600 uppercase focus:outline-hidden focus:border-amber-400"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-slate-400 block mb-1">Duración (Días)</label>
                          <select
                            value={newCodeDays}
                            onChange={(e) => setNewCodeDays(Number(e.target.value))}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-hidden focus:border-amber-400"
                          >
                            <option value={30}>30 Días (1 Mes)</option>
                            <option value={90}>90 Días (3 Meses)</option>
                            <option value={180}>180 Días (6 Meses)</option>
                            <option value={365}>365 Días (1 Año)</option>
                          </select>
                        </div>

                        <div className="flex items-end">
                          <button
                            type="submit"
                            disabled={creatingLicense}
                            className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-xs rounded-xl shadow-md transition-colors flex items-center justify-center gap-1.5"
                          >
                            {creatingLicense ? (
                              <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                            ) : (
                              <Key className="w-4 h-4" />
                            )}
                            <span>{creatingLicense ? 'Generando...' : 'Generar Código y Asignar'}</span>
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>

                  {/* License Codes List */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Historial de Licencias Creadas ({licenses.length})
                    </h4>

                    {licenses.length === 0 ? (
                      <div className="p-6 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                        Aún no has generado códigos de licencia. Crea uno arriba para enviárselo a tus clientes por WhatsApp.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {licenses.map((lic) => (
                          <div
                            key={lic.code}
                            className={`p-4 rounded-xl border flex flex-col justify-between gap-3 ${
                              lic.used
                                ? 'bg-slate-950 border-slate-800/80 opacity-75'
                                : 'bg-slate-950 border-amber-500/40'
                            }`}
                          >
                            <div className="space-y-2">
                              <div className="flex items-start justify-between">
                                <div>
                                  <span className="font-mono font-black text-amber-400 text-sm tracking-wider block">
                                    {lic.code}
                                  </span>
                                  <span className="text-[11px] text-slate-400">
                                    {lic.days} días Plan {lic.plan.toUpperCase()}
                                  </span>
                                </div>

                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                    lic.used
                                      ? 'bg-slate-800 text-slate-400'
                                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  }`}
                                >
                                  {lic.used ? 'USADO' : 'DISPONIBLE'}
                                </span>
                              </div>

                              {/* Display assigned email or user if defined */}
                              {(lic.assignedEmail || lic.assignedToName) && (
                                <div className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-xs space-y-0.5">
                                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                                    Destinatario Asignado:
                                  </span>
                                  <div className="flex flex-wrap items-center gap-2 text-slate-200">
                                    {lic.assignedToName && (
                                      <span className="font-bold">{lic.assignedToName}</span>
                                    )}
                                    {lic.assignedEmail && (
                                      <span className="text-slate-400 text-[11px] font-mono flex items-center gap-1">
                                        <Mail className="w-3 h-3 text-slate-500 shrink-0" />
                                        {lic.assignedEmail}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>

                            {lic.used && (
                              <div className="text-[11px] text-slate-400 bg-slate-900/60 p-2 rounded-lg border border-slate-800 space-y-0.5">
                                <p>
                                  Canjeado por: <strong className="text-amber-300">{lic.usedByTallerName || lic.usedByTallerId || 'Taller'}</strong>
                                </p>
                                {lic.usedAt && (
                                  <p className="text-[10px] text-slate-500">
                                    Fecha de activación: {new Date(lic.usedAt).toLocaleString()}
                                  </p>
                                )}
                              </div>
                            )}

                            {!lic.used && (
                              <div className="flex items-center gap-2 pt-1 border-t border-slate-900">
                                <button
                                  onClick={() => copyToClipboard(lic.code)}
                                  className="flex-1 py-1.5 px-2 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-[11px] rounded-lg border border-slate-800 transition-colors flex items-center justify-center gap-1"
                                >
                                  <Copy className="w-3 h-3 text-amber-400" />
                                  <span>Copiar Clave</span>
                                </button>

                                <button
                                  onClick={() => generateWhatsAppShare(lic)}
                                  className="flex-1 py-1.5 px-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 font-bold text-[11px] rounded-lg border border-emerald-500/30 transition-colors flex items-center justify-center gap-1"
                                >
                                  <Send className="w-3 h-3 text-emerald-400" />
                                  <span>Enviar WhatsApp</span>
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: Pricing Settings ($ USD & PYG Exchange Rate) */}
              {activeTab === 'prices' && (
                <form onSubmit={handleSavePricing} className="space-y-6">
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
                      <div>
                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                          <Coins className="w-5 h-5 text-emerald-400" />
                          Cotización del Dólar y Configuración de Precios
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Ajusta los precios de los planes en Dólares (USD) y la equivalencia estimada en Guaraníes (PYG) para Paraguay.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleAutoCalculatePyg}
                        className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs rounded-xl border border-amber-500/30 transition-colors flex items-center gap-2"
                      >
                        <Calculator className="w-4 h-4 text-amber-400" />
                        <span>Recalcular PYG con Cotización</span>
                      </button>
                    </div>

                    {/* Exchange Rate Card */}
                    <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">
                          Tipo de Cambio / Cotización (1 USD a PYG)
                        </label>
                        <p className="text-[11px] text-slate-400 mb-2">
                          Ejemplo: Si $1 USD equivale a 7.500 Guaraníes, ingresa 7500.
                        </p>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-amber-400 font-bold text-xs">Gs.</span>
                          <input
                            type="number"
                            value={pricingForm.exchangeRateUsdToPyg || ''}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => setPricingForm({ ...pricingForm, exchangeRateUsdToPyg: e.target.value === '' ? 0 : Number(e.target.value) })}
                            className="w-full pl-10 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono font-bold text-sm focus:border-amber-400 focus:outline-hidden"
                            placeholder="7500"
                          />
                        </div>
                      </div>

                      <div className="bg-amber-950/30 border border-amber-800/40 p-3 rounded-xl text-xs text-amber-200/90 leading-relaxed">
                        <p className="font-bold flex items-center gap-1.5 text-amber-300 mb-1">
                          <Sparkles className="w-4 h-4 text-amber-400" />
                          Flexibilidad de Precios en Paraguay
                        </p>
                        Puedes modificar los precios manualmente o pulsar <strong>"Recalcular PYG con Cotización"</strong> para actualizar automáticamente las referencias en Guaraníes de todos los planes.
                      </div>
                    </div>

                    {/* Plans Pricing Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                      {/* Plan Básico */}
                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                          <span className="text-xs font-bold uppercase text-slate-300">Plan Básico / Inicial</span>
                          <span className="text-[10px] font-bold bg-slate-800 text-slate-400 px-2 py-0.5 rounded-md">Mensual</span>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-400 mb-1">Precio en USD ($)</label>
                          <div className="relative">
                            <span className="absolute left-3 top-2 text-slate-400 font-bold text-xs">$</span>
                            <input
                              type="number"
                              value={pricingForm.basicoPriceUsd || ''}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => setPricingForm({ ...pricingForm, basicoPriceUsd: e.target.value === '' ? 0 : Number(e.target.value) })}
                              className="w-full pl-7 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-sm font-bold focus:border-amber-400 focus:outline-hidden"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-400 mb-1">Referencia Estimada PYG (Gs.)</label>
                          <div className="relative">
                            <span className="absolute left-3 top-2 text-amber-400 font-bold text-xs">Gs.</span>
                            <input
                              type="number"
                              value={pricingForm.basicoPricePyg || ''}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => setPricingForm({ ...pricingForm, basicoPricePyg: e.target.value === '' ? 0 : Number(e.target.value) })}
                              className="w-full pl-10 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-amber-300 font-mono text-sm font-bold focus:border-amber-400 focus:outline-hidden"
                            />
                          </div>
                          <p className="text-[10px] text-slate-500 mt-1">Muestra: ~ {pricingForm.basicoPricePyg.toLocaleString('es-PY')} PYG al mes</p>
                        </div>
                      </div>

                      {/* Plan PRO */}
                      <div className="bg-slate-950 p-4 rounded-xl border-2 border-amber-500/60 space-y-3 relative">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                          <span className="text-xs font-bold uppercase text-amber-400 flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5" /> Plan PRO Taller
                          </span>
                          <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-md">Popular</span>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-400 mb-1">Precio en USD ($)</label>
                          <div className="relative">
                            <span className="absolute left-3 top-2 text-slate-400 font-bold text-xs">$</span>
                            <input
                              type="number"
                              value={pricingForm.proPriceUsd || ''}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => setPricingForm({ ...pricingForm, proPriceUsd: e.target.value === '' ? 0 : Number(e.target.value) })}
                              className="w-full pl-7 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-sm font-bold focus:border-amber-400 focus:outline-hidden"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-400 mb-1">Referencia Estimada PYG (Gs.)</label>
                          <div className="relative">
                            <span className="absolute left-3 top-2 text-amber-400 font-bold text-xs">Gs.</span>
                            <input
                              type="number"
                              value={pricingForm.proPricePyg || ''}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => setPricingForm({ ...pricingForm, proPricePyg: e.target.value === '' ? 0 : Number(e.target.value) })}
                              className="w-full pl-10 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-amber-300 font-mono text-sm font-bold focus:border-amber-400 focus:outline-hidden"
                            />
                          </div>
                          <p className="text-[10px] text-amber-400/80 mt-1">Muestra: ~ {pricingForm.proPricePyg.toLocaleString('es-PY')} PYG al mes</p>
                        </div>
                      </div>

                      {/* Plan Anual */}
                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                          <span className="text-xs font-bold uppercase text-slate-300">Plan Anual PRO</span>
                          <span className="text-[10px] font-bold bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded-md">Anual</span>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-400 mb-1">Precio en USD ($ / año)</label>
                          <div className="relative">
                            <span className="absolute left-3 top-2 text-slate-400 font-bold text-xs">$</span>
                            <input
                              type="number"
                              value={pricingForm.anualPriceUsd || ''}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => setPricingForm({ ...pricingForm, anualPriceUsd: e.target.value === '' ? 0 : Number(e.target.value) })}
                              className="w-full pl-7 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-sm font-bold focus:border-amber-400 focus:outline-hidden"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-400 mb-1">Referencia Estimada PYG (Gs.)</label>
                          <div className="relative">
                            <span className="absolute left-3 top-2 text-amber-400 font-bold text-xs">Gs.</span>
                            <input
                              type="number"
                              value={pricingForm.anualPricePyg || ''}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => setPricingForm({ ...pricingForm, anualPricePyg: e.target.value === '' ? 0 : Number(e.target.value) })}
                              className="w-full pl-10 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-amber-300 font-mono text-sm font-bold focus:border-amber-400 focus:outline-hidden"
                            />
                          </div>
                          <p className="text-[10px] text-emerald-400 mt-1">Muestra: ~ {pricingForm.anualPricePyg.toLocaleString('es-PY')} PYG al año</p>
                        </div>
                      </div>
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-end pt-3 border-t border-slate-800">
                      <button
                        type="submit"
                        disabled={savingPrices}
                        className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-lg transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <Save className="w-4 h-4" />
                        <span>{savingPrices ? 'Guardando en Firebase...' : 'Guardar Nuevos Precios en Firebase'}</span>
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400">
              <span>Soporte <span className="text-amber-400 font-bold">Mi</span>Taller WhatsApp: +595975635770</span>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors"
              >
                Cerrar Admin
              </button>
            </div>
          </>
        )}
      </div>

      {/* Workshop Deletion Confirmation Modal */}
      {workshopToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl text-slate-100">
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-2.5 bg-red-950/80 rounded-xl border border-red-800/50">
                <Trash2 className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-white">¿Eliminar Taller?</h3>
                <p className="text-xs text-slate-400">Confirmar acción irreversible</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              ¿Estás seguro de ELIMINAR permanentemente el taller <strong className="text-amber-300">{workshopToDelete.nombreTaller || workshopToDelete.email || workshopToDelete.id}</strong>? Esta acción borrará el registro del taller del sistema.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setWorkshopToDelete(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeleteWorkshop}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
              >
                Sí, Eliminar Taller
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
