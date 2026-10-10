import React, { useState, useMemo } from 'react';
import {
  MessageSquare,
  X,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Send,
  ExternalLink,
  Settings,
  ShieldCheck,
  RefreshCw,
  Phone,
  Car,
  ChevronRight,
  Sliders,
  Sparkles,
  BellOff,
  History,
  Edit3,
  Copy,
  Check,
  RotateCcw
} from 'lucide-react';
import { WorkOrder, Client } from '../types/tallerya';
import { formatDateSpanish } from '../utils/dateUtils';
import {
  calculateReminders,
  buildWhatsAppMessage,
  getWhatsAppWebLink,
  formatWhatsAppPhone,
  registrarUltimoAviso,
  MaintenanceReminderItem,
  TwilioConfig,
} from '../services/whatsappReminderService';

interface WhatsAppReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  workOrders: WorkOrder[];
  clients: Client[];
  tallerNombre?: string;
  onUpdateWorkOrder?: (updatedOrder: WorkOrder) => void;
}

export function WhatsAppReminderModal({
  isOpen,
  onClose,
  workOrders,
  clients,
  tallerNombre = 'MiTaller Mecánico',
  onUpdateWorkOrder,
}: WhatsAppReminderModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'overdue' | 'due_soon'>('all');
  const [timeWindowFilter, setTimeWindowFilter] = useState<'all' | 'overdue' | '30days' | '60days'>('all');
  const [selectedServiceFilter, setSelectedServiceFilter] = useState<'all' | 'motor_5k' | 'motor_10k' | 'caja' | 'distribucion'>('all');
  const [hideRecentlyNotified, setHideRecentlyNotified] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState<MaintenanceReminderItem | null>(null);
  const [customNote, setCustomNote] = useState('');
  const [editedMessage, setEditedMessage] = useState('');
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [sentLog, setSentLog] = useState<Set<string>>(new Set());

  // Twilio settings (saved in LocalStorage)
  const [twilioConfig, setTwilioConfig] = useState<TwilioConfig>(() => {
    try {
      const saved = localStorage.getItem('mitaller_twilio_config');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [twilioForm, setTwilioForm] = useState<TwilioConfig>(twilioConfig);
  const [configSaved, setConfigSaved] = useState(false);

  // Compute maintenance reminders dynamically (based strictly on date and months)
  const reminders = useMemo(() => {
    return calculateReminders(workOrders, clients);
  }, [workOrders, clients]);

  const filteredReminders = useMemo(() => {
    return reminders.filter((item) => {
      // Filter by quick button status
      if (filterType === 'overdue' && item.estadoRecordatorio !== 'overdue') return false;
      if (filterType === 'due_soon' && item.estadoRecordatorio !== 'due_soon') return false;

      // Filter out recently notified if toggle is active
      if (hideRecentlyNotified && item.notificadoRecientemente) {
        return false;
      }

      // Filter by Time Window
      if (timeWindowFilter === 'overdue' && item.diasRestantesParaVencer > 0) {
        return false;
      }
      if (timeWindowFilter === '30days') {
        if (item.diasRestantesParaVencer <= 0 || item.diasRestantesParaVencer > 30) {
          return false;
        }
      }
      if (timeWindowFilter === '60days') {
        if (item.diasRestantesParaVencer <= 0 || item.diasRestantesParaVencer > 60) {
          return false;
        }
      }

      // Filter by Service Type
      if (selectedServiceFilter === 'motor_5k') {
        if (!item.esMantenimientoMotor || item.intervaloKm > 5000) return false;
      }
      if (selectedServiceFilter === 'motor_10k') {
        if (!item.esMantenimientoMotor || item.intervaloKm <= 5000 || item.intervaloKm > 15000) return false;
      }
      if (selectedServiceFilter === 'caja') {
        if (!item.esMantenimientoCaja) return false;
      }
      if (selectedServiceFilter === 'distribucion') {
        if (item.categoriaMantenimiento !== 'distribucion') return false;
      }

      // Filter by search term
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      const matchClient = item.clientNombre.toLowerCase().includes(term);
      const matchPhone = item.clientTelefono.includes(term);
      const matchMarca = item.vehiculo.marca.toLowerCase().includes(term);
      const matchModelo = item.vehiculo.modelo.toLowerCase().includes(term);
      const matchPatente = (item.vehiculo.patente || '').toLowerCase().includes(term);

      return matchClient || matchPhone || matchMarca || matchModelo || matchPatente;
    });
  }, [reminders, filterType, timeWindowFilter, selectedServiceFilter, hideRecentlyNotified, searchTerm]);

  const stats = useMemo(() => {
    const overdue = reminders.filter((r) => r.estadoRecordatorio === 'overdue').length;
    const dueSoon = reminders.filter((r) => r.estadoRecordatorio === 'due_soon').length;
    return { total: reminders.length, overdue, dueSoon };
  }, [reminders]);

  if (!isOpen) return null;

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('mitaller_twilio_config', JSON.stringify(twilioForm));
    setTwilioConfig(twilioForm);
    setConfigSaved(true);
    setTimeout(() => setConfigSaved(false), 3000);
  };

  const handleOpenPreview = (item: MaintenanceReminderItem) => {
    setSelectedReminder(item);
    setEditedMessage(buildWhatsAppMessage(item, tallerNombre, customNote));
  };

  const handleResetMessage = () => {
    if (selectedReminder) {
      setEditedMessage(buildWhatsAppMessage(selectedReminder, tallerNombre, customNote));
    }
  };

  const handleCopyMessage = async () => {
    if (!editedMessage) return;
    try {
      await navigator.clipboard.writeText(editedMessage);
      setCopiedSuccess(true);
      setTimeout(() => setCopiedSuccess(false), 2000);
    } catch (e) {
      console.warn('Clipboard write failed:', e);
    }
  };

  const handleSendWhatsApp = (item: MaintenanceReminderItem, directCustomText?: string) => {
    const textToSend = directCustomText !== undefined && directCustomText.trim() !== ''
      ? directCustomText
      : buildWhatsAppMessage(item, tallerNombre, customNote);
    const link = getWhatsAppWebLink(item, tallerNombre, customNote, textToSend);
    window.open(link, '_blank');
    setSentLog((prev) => new Set(prev).add(`${item.clientId}_${item.vehiculo.patente}`));

    // Update work order with 'ultimoAviso' timestamp to track notifications & prevent duplicates
    if (item.ordenTrabajoId) {
      const targetWo = workOrders.find((w) => w.id === item.ordenTrabajoId);
      if (targetWo) {
        const updatedWo = registrarUltimoAviso(targetWo);
        if (onUpdateWorkOrder) {
          onUpdateWorkOrder(updatedWo);
        }
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Recordatorios de Mantenimiento por WhatsApp
                <span className="text-xs bg-emerald-500/20 text-emerald-300 font-semibold px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                  Automático / 1-Clic
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Notifica a tus clientes cuando sus vehículos se acerquen a su próximo servicio por kilometraje o fecha.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowConfig(!showConfig)}
              className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                showConfig
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Configurar Twilio API</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Twilio API Setup Accordion */}
          {showConfig && (
            <div className="p-4 bg-slate-800/60 border border-slate-700/80 rounded-xl space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" /> Configuración de API de Twilio WhatsApp (Opcional)
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Por defecto, los mensajes se envían con 1-clic directo a WhatsApp Web (<code className="text-emerald-400">wa.me</code>). Si dispones de una cuenta de Twilio WhatsApp API, puedes configurar tus llaves para envíos automatizados desde el servidor.
                  </p>
                </div>
                {configSaved && (
                  <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                    Guardado
                  </span>
                )}
              </div>

              <form onSubmit={handleSaveConfig} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Account SID</label>
                  <input
                    type="text"
                    placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxx"
                    value={twilioForm.accountSid || ''}
                    onChange={(e) => setTwilioForm({ ...twilioForm, accountSid: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Auth Token</label>
                  <input
                    type="password"
                    placeholder="••••••••••••••••••••••••"
                    value={twilioForm.authToken || ''}
                    onChange={(e) => setTwilioForm({ ...twilioForm, authToken: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Número Twilio WhatsApp</label>
                  <input
                    type="text"
                    placeholder="whatsapp:+14155238886"
                    value={twilioForm.fromPhoneNumber || ''}
                    onChange={(e) => setTwilioForm({ ...twilioForm, fromPhoneNumber: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="sm:col-span-3 flex justify-end">
                  <button
                    type="submit"
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 rounded-lg transition text-xs"
                  >
                    Guardar Configuración
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-800/40 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 font-medium block">Total Monitoreados</span>
                <span className="text-2xl font-bold text-white mt-1 block">{stats.total}</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold">
                <Car className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-slate-800/40 border border-red-500/20 p-4 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs text-red-400 font-medium block">Mantenimientos Vencidos</span>
                <span className="text-2xl font-bold text-red-400 mt-1 block">{stats.overdue}</span>
                <span className="text-[10px] text-red-400/80">Plazo de meses cumplido</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center font-bold">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-slate-800/40 border border-amber-500/20 p-4 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs text-amber-400 font-medium block">Próximos a Vencer (30 días)</span>
                <span className="text-2xl font-bold text-amber-400 mt-1 block">{stats.dueSoon}</span>
                <span className="text-[10px] text-amber-400/80">Vencen este mes</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
                <Clock className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Controls Bar: Search & Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-800/40 p-3 rounded-xl border border-slate-800">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por cliente, marca, modelo o patente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  filterType === 'all'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Todos ({stats.total})
              </button>
              <button
                onClick={() => setFilterType('overdue')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  filterType === 'overdue'
                    ? 'bg-red-500 text-white font-bold'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Vencidos ({stats.overdue})
              </button>
              <button
                onClick={() => setFilterType('due_soon')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  filterType === 'due_soon'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Próximos ({stats.dueSoon})
              </button>

              <div className="h-4 w-px bg-slate-700 mx-1 hidden sm:block" />

              {/* Time Window Dropdown */}
              <div className="flex items-center gap-1.5 text-xs text-slate-400 whitespace-nowrap">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Vencimiento:</span>
                <select
                  value={timeWindowFilter}
                  onChange={(e) => setTimeWindowFilter(e.target.value as any)}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs font-semibold focus:outline-hidden focus:border-amber-400"
                >
                  <option value="all">Todos los plazos</option>
                  <option value="overdue">Solo Vencidos (tiempo cumplido)</option>
                  <option value="30days">Vencen este mes (próximos 30 días)</option>
                  <option value="60days">Vencen en 60 días</option>
                </select>
              </div>

              {/* Service Category Dropdown */}
              <div className="flex items-center gap-1.5 text-xs text-slate-400 whitespace-nowrap">
                <span>Tipo Service:</span>
                <select
                  value={selectedServiceFilter}
                  onChange={(e) => setSelectedServiceFilter(e.target.value as any)}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-amber-300 text-xs font-bold focus:outline-hidden focus:border-amber-400"
                >
                  <option value="all">Todos los servicios</option>
                  <option value="motor_5k">Motor: 5.000 km (6 meses)</option>
                  <option value="motor_10k">Motor: 10.000 km (12 meses)</option>
                  <option value="caja">Caja de Cambios (24 meses)</option>
                  <option value="distribucion">Distribución (36 meses)</option>
                </select>
              </div>

              <div className="h-4 w-px bg-slate-700 mx-1 hidden sm:block" />

              {/* Toggle to hide recently notified to prevent duplicates */}
              <button
                onClick={() => setHideRecentlyNotified(!hideRecentlyNotified)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer ${
                  hideRecentlyNotified
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
                title="Ocultar vehículos notificados en los últimos 7 días para evitar avisos duplicados"
              >
                <BellOff className="w-3.5 h-3.5" />
                <span>Ocultar ya avisados</span>
              </button>
            </div>
          </div>

          {/* List of Maintenance Reminders */}
          <div className="space-y-3">
            {filteredReminders.length === 0 ? (
              <div className="p-8 text-center bg-slate-800/20 rounded-2xl border border-dashed border-slate-800 space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto opacity-80" />
                <p className="text-sm font-semibold text-slate-300">
                  No se encontraron vehículos pendientes en este filtro
                </p>
                <p className="text-xs text-slate-500">
                  Todos los mantenimientos registrados están al día en sus plazos por meses.
                </p>
              </div>
            ) : (
              filteredReminders.map((item) => {
                const key = `${item.clientId}_${item.vehiculo.patente}_${item.categoriaMantenimiento}`;
                const isSentSession = sentLog.has(key);
                const hasUltimoAviso = Boolean(item.ultimoAviso);
                const isRecentlyNotified = item.notificadoRecientemente;

                return (
                  <div
                    key={key}
                    className={`p-4 rounded-xl border transition flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      item.estadoRecordatorio === 'overdue'
                        ? 'bg-red-950/20 border-red-500/30 hover:border-red-500/50'
                        : item.estadoRecordatorio === 'due_soon'
                        ? 'bg-amber-950/20 border-amber-500/30 hover:border-amber-500/50'
                        : 'bg-slate-800/40 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* Left Info */}
                    <div className="space-y-2 flex-1">
                      {/* Line 1: Client, Phone, Status & Service Badges */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-white text-sm">{item.clientNombre}</span>
                        {item.clientTelefono ? (
                          <span className="text-xs bg-slate-900 text-slate-300 px-2 py-0.5 rounded-md border border-slate-800 flex items-center gap-1">
                            <Phone className="w-3 h-3 text-emerald-400" />
                            {item.clientTelefono}
                          </span>
                        ) : (
                          <span className="text-xs text-red-400 bg-red-500/10 px-2 py-0.5 rounded-md border border-red-500/20">
                            Sin Teléfono
                          </span>
                        )}

                        {/* Status Badge */}
                        {item.estadoRecordatorio === 'overdue' ? (
                          <span className="text-xs bg-red-500/20 text-red-300 border border-red-500/40 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 shadow-2xs">
                            <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                            <span>Mantenimiento Vencido</span>
                          </span>
                        ) : item.estadoRecordatorio === 'due_soon' ? (
                          <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 shadow-2xs">
                            <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span>Próximo a Vencer ({item.diasRestantesParaVencer} d)</span>
                          </span>
                        ) : (
                          <span className="text-xs bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>Al Día</span>
                          </span>
                        )}

                        {/* Service Type Tag */}
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                          item.esMantenimientoCaja
                            ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                            : item.intervaloMeses === 6
                            ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                            : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        }`}>
                          {item.tipoServicioEtiqueta}
                        </span>

                        {/* Last Notice Indicator */}
                        {hasUltimoAviso && (
                          <span
                            className={`text-xs px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1 border ${
                              isRecentlyNotified
                                ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                                : 'bg-slate-800 text-slate-400 border-slate-700'
                            }`}
                            title={`Último aviso enviado el ${formatDateSpanish(item.ultimoAviso!)}`}
                          >
                            <History className="w-3 h-3 text-sky-400" />
                            {item.diasDesdeUltimoAviso === 0
                              ? 'Aviso enviado hoy'
                              : `Avisado hace ${item.diasDesdeUltimoAviso} d`}
                          </span>
                        )}

                        {isSentSession && !hasUltimoAviso && (
                          <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Enviado ahora
                          </span>
                        )}
                      </div>

                      {/* Line 2: Vehicle, Km Details (Agrandado & Calculado) & Specific Dates */}
                      <div className="text-xs text-slate-200 flex items-center gap-3 sm:gap-4 flex-wrap bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                        <span>
                          <strong className="text-slate-400">Vehículo:</strong>{' '}
                          <span className="font-bold text-white">
                            {item.vehiculo.marca} {item.vehiculo.modelo}
                          </span>{' '}
                          <span className="font-mono text-amber-400 font-bold">
                            ({item.vehiculo.patente || 'S/P'})
                          </span>
                        </span>

                        {/* Kilometraje Inicial (Agrandado a pedido del usuario) */}
                        <span className="flex items-center gap-1.5 bg-slate-800/90 px-2 py-1 rounded-lg border border-slate-700">
                          <strong className="text-slate-400 text-xs">Km Inicial:</strong>
                          <span className="font-black text-sm text-white">
                            {item.ultimoServiceKm > 0 ? `${item.ultimoServiceKm.toLocaleString('es-PY')} km` : 'Sin registro'}
                          </span>
                        </span>

                        {/* Próximo Kilometraje sumando lo seleccionado */}
                        {item.ultimoServiceKm > 0 && (
                          <span className="flex items-center gap-1.5 bg-emerald-950/50 px-2 py-1 rounded-lg border border-emerald-700/50">
                            <strong className="text-emerald-400 text-xs">Próximo Km:</strong>
                            <span className="font-black text-sm text-emerald-300">
                              {(item.ultimoServiceKm + item.intervaloKm).toLocaleString('es-PY')} km
                            </span>
                            <span className="text-[10px] text-emerald-400/80 font-bold">
                              (+{item.intervaloKm.toLocaleString('es-PY')} km)
                            </span>
                          </span>
                        )}

                        {/* Fecha en que se realizó el mantenimiento */}
                        <span className="flex items-center gap-1">
                          <strong className="text-slate-400">Fecha Realizada:</strong>{' '}
                          <span className="font-bold text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                            {item.ultimoServiceFechaFormateada}
                          </span>
                        </span>

                        {/* Fecha de vencimiento calculada por meses (los vencimientos siguen por fechas) */}
                        <span className="flex items-center gap-1">
                          <strong className="text-slate-400">Próximo Vencimiento:</strong>{' '}
                          <span className={`font-black px-2 py-0.5 rounded border ${
                            item.estadoRecordatorio === 'overdue'
                              ? 'bg-red-500/20 text-red-300 border-red-500/40'
                              : item.estadoRecordatorio === 'due_soon'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          }`}>
                            {item.fechaVencimientoFormateada}
                          </span>
                          <span className="text-[11px] text-amber-300/80 font-semibold ml-0.5">
                            ({item.intervaloMeses} meses)
                          </span>
                        </span>
                      </div>

                      {/* Line 3: Timeline status message (Time-based elapsed / remaining) */}
                      <div className="text-xs flex items-center gap-2 flex-wrap">
                        {item.estadoRecordatorio === 'overdue' ? (
                          <span className="text-red-400 font-bold flex items-center gap-1">
                            <span>⚠️ Plazo Vencido:</span>
                            <span>
                              Han pasado {item.diasDesdeUltimoService} días del último service (venció hace {Math.abs(item.diasRestantesParaVencer)} días / {Math.max(1, Math.floor(Math.abs(item.diasRestantesParaVencer) / 30))} meses).
                            </span>
                          </span>
                        ) : item.estadoRecordatorio === 'due_soon' ? (
                          <span className="text-amber-400 font-bold flex items-center gap-1">
                            <span>⏳ Próximo a Cumplir Plazo:</span>
                            <span>
                              Vence en {item.diasRestantesParaVencer} días (plazo de {item.intervaloMeses} meses).
                            </span>
                          </span>
                        ) : (
                          <span className="text-emerald-400 font-medium flex items-center gap-1">
                            <span>✓ Al Día:</span>
                            <span>
                              Vence el {item.fechaVencimientoFormateada} (quedan {Math.max(1, Math.round(item.diasRestantesParaVencer / 30))} meses).
                            </span>
                          </span>
                        )}

                        {item.notasService && (
                          <span className="text-slate-400 text-[11px] italic">
                            • Detalle: {item.notasService}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleOpenPreview(item)}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer hover:border-slate-600 border border-slate-700/50"
                        title="Ver y editar mensaje antes de enviar"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-amber-400" /> Previsualizar / Editar
                      </button>

                      <button
                        onClick={() => handleSendWhatsApp(item)}
                        disabled={!item.clientTelefono}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md cursor-pointer ${
                          !item.clientTelefono
                            ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                            : isRecentlyNotified || isSentSession
                            ? 'bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30'
                            : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20 active:scale-95'
                        }`}
                        title={isRecentlyNotified ? `Ya se notificó hace ${item.diasDesdeUltimoAviso} días. Clic para reenviar si es necesario.` : undefined}
                      >
                        <Send className="w-3.5 h-3.5" />
                        {isRecentlyNotified || isSentSession ? 'Reenviar WhatsApp' : 'Enviar WhatsApp'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between text-xs text-slate-400">
          <span>Mostrando {filteredReminders.length} recordatorios detectados</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl transition cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* Previewer & Message Editor Modal Overlay */}
      {selectedReminder && (
        <div className="fixed inset-0 z-60 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl p-5 shadow-2xl space-y-4 my-auto">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Edit3 className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
                      Previsualizar y Editar Mensaje
                      <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full">
                        Editable
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Puedes modificar cualquier palabra o agregar indicaciones antes de abrir WhatsApp.
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedReminder(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Client and vehicle meta chip */}
            <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-semibold">Destinatario:</span>
                <span className="font-bold text-white">{selectedReminder.clientNombre}</span>
                <span className="text-emerald-400 font-mono font-bold">
                  ({selectedReminder.clientTelefono || 'Sin teléfono'})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Vehículo:</span>
                <span className="font-bold text-slate-200">
                  {selectedReminder.vehiculo.marca} {selectedReminder.vehiculo.modelo}
                </span>
                <span className="text-amber-400 font-mono font-bold">
                  ({selectedReminder.vehiculo.patente || 'S/P'})
                </span>
              </div>
            </div>

            {/* Quick Note input that can be injected into the message */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-300">
                  Nota rápida / Promoción (opcional):
                </label>
                {customNote && (
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedReminder) {
                        setEditedMessage(buildWhatsAppMessage(selectedReminder, tallerNombre, customNote));
                      }
                    }}
                    className="text-[11px] text-amber-400 hover:text-amber-300 font-bold underline cursor-pointer"
                  >
                    Insertar en mensaje
                  </button>
                )}
              </div>
              <input
                type="text"
                placeholder="Ej. Contamos con 15% de descuento en cambio de aceite o filtros este mes..."
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Editable Text Area Box */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" />
                  Previsualización editable del mensaje:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetMessage}
                    className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 hover:underline cursor-pointer"
                    title="Restablecer plantilla automática por defecto"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Restablecer
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyMessage}
                    className={`text-[11px] px-2 py-0.5 rounded-md border flex items-center gap-1 font-semibold transition cursor-pointer ${
                      copiedSuccess
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    {copiedSuccess ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" /> ¡Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" /> Copiar texto
                      </>
                    )}
                  </button>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {editedMessage.length} car.
                  </span>
                </div>
              </div>

              <textarea
                rows={11}
                value={editedMessage}
                onChange={(e) => setEditedMessage(e.target.value)}
                placeholder="Escribe o modifica el mensaje de WhatsApp..."
                className="w-full bg-slate-950/90 border border-emerald-500/40 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/50 rounded-xl p-3.5 text-xs font-mono text-emerald-100 placeholder-slate-600 focus:outline-none leading-relaxed resize-y selection:bg-emerald-500/30 shadow-inner"
              />

              <p className="text-[11px] text-slate-400 flex items-center justify-between">
                <span>
                  💡 <strong>Tip WhatsApp:</strong> Usa <code className="text-emerald-300">*negrita*</code>, <code className="text-emerald-300">_cursiva_</code> o emojis para personalizar el formato.
                </span>
                <span className="text-slate-500 text-[10px]">
                  El mensaje se enviará exactamente como lo edites arriba.
                </span>
              </p>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedReminder(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={handleCopyMessage}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                Copiar
              </button>
              <button
                type="button"
                onClick={() => {
                  handleSendWhatsApp(selectedReminder, editedMessage);
                  setSelectedReminder(null);
                }}
                disabled={!selectedReminder.clientTelefono}
                className={`px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition cursor-pointer ${
                  !selectedReminder.clientTelefono ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <Send className="w-4 h-4" />
                Abrir y Enviar por WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
