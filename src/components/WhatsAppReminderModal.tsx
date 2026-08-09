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
  Sparkles
} from 'lucide-react';
import { WorkOrder, Client } from '../types/tallerya';
import {
  calculateReminders,
  buildWhatsAppMessage,
  getWhatsAppWebLink,
  formatWhatsAppPhone,
  MaintenanceReminderItem,
  TwilioConfig,
} from '../services/whatsappReminderService';

interface WhatsAppReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  workOrders: WorkOrder[];
  clients: Client[];
  tallerNombre?: string;
}

export function WhatsAppReminderModal({
  isOpen,
  onClose,
  workOrders,
  clients,
  tallerNombre = 'MiTaller Mecánico',
}: WhatsAppReminderModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'overdue' | 'due_soon'>('all');
  const [thresholdKm, setThresholdKm] = useState<number>(1000);
  const [selectedReminder, setSelectedReminder] = useState<MaintenanceReminderItem | null>(null);
  const [customNote, setCustomNote] = useState('');
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

  // Compute maintenance reminders dynamically
  const reminders = useMemo(() => {
    return calculateReminders(workOrders, clients, thresholdKm);
  }, [workOrders, clients, thresholdKm]);

  const filteredReminders = useMemo(() => {
    return reminders.filter((item) => {
      // Filter by type
      if (filterType === 'overdue' && item.estadoRecordatorio !== 'overdue') return false;
      if (filterType === 'due_soon' && item.estadoRecordatorio !== 'due_soon') return false;

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
  }, [reminders, filterType, searchTerm]);

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

  const handleSendWhatsApp = (item: MaintenanceReminderItem) => {
    const link = getWhatsAppWebLink(item, tallerNombre, customNote);
    window.open(link, '_blank');
    setSentLog((prev) => new Set(prev).add(`${item.clientId}_${item.vehiculo.patente}`));
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
                <span className="text-xs text-slate-400 font-medium block">Total Requieren Servicio</span>
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
              </div>
              <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center font-bold">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-slate-800/40 border border-amber-500/20 p-4 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs text-amber-400 font-medium block">Próximos (Próximos km)</span>
                <span className="text-2xl font-bold text-amber-400 mt-1 block">{stats.dueSoon}</span>
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
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  filterType === 'all'
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Todos ({stats.total})
              </button>
              <button
                onClick={() => setFilterType('overdue')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  filterType === 'overdue'
                    ? 'bg-red-500 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Vencidos ({stats.overdue})
              </button>
              <button
                onClick={() => setFilterType('due_soon')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  filterType === 'due_soon'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Próximos ({stats.dueSoon})
              </button>

              <div className="h-4 w-px bg-slate-700 mx-1" />

              {/* Threshold Dropdown */}
              <div className="flex items-center gap-1.5 text-xs text-slate-400 whitespace-nowrap">
                <Sliders className="w-3.5 h-3.5" />
                <span>Margen:</span>
                <select
                  value={thresholdKm}
                  onChange={(e) => setThresholdKm(Number(e.target.value))}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs focus:outline-none"
                >
                  <option value={500}>500 km</option>
                  <option value={1000}>1.000 km</option>
                  <option value={2000}>2.000 km</option>
                  <option value={5000}>5.000 km</option>
                  <option value={7000}>7.000 km</option>
                  <option value={10000}>10.000 km</option>
                  <option value={50000}>50.000 km</option>
                  <option value={100000}>100.000 km</option>
                </select>
              </div>
            </div>
          </div>

          {/* List of Maintenance Reminders */}
          <div className="space-y-3">
            {filteredReminders.length === 0 ? (
              <div className="p-8 text-center bg-slate-800/20 rounded-2xl border border-dashed border-slate-800 space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto opacity-80" />
                <p className="text-sm font-semibold text-slate-300">
                  No se encontraron vehículos pendientes en este rango
                </p>
                <p className="text-xs text-slate-500">
                  Todos los mantenimientos registrados están al día o no superan el margen de {thresholdKm.toLocaleString()} km.
                </p>
              </div>
            ) : (
              filteredReminders.map((item) => {
                const key = `${item.clientId}_${item.vehiculo.patente}`;
                const isSent = sentLog.has(key);
                const phoneFormatted = formatWhatsAppPhone(item.clientTelefono);

                return (
                  <div
                    key={key}
                    className="p-4 bg-slate-800/40 border border-slate-800 rounded-xl hover:border-slate-700 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    {/* Left Info */}
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white text-sm">{item.clientNombre}</span>
                        {item.clientTelefono ? (
                          <span className="text-xs bg-slate-900 text-slate-400 px-2 py-0.5 rounded-md border border-slate-800 flex items-center gap-1">
                            <Phone className="w-3 h-3 text-emerald-400" />
                            {item.clientTelefono}
                          </span>
                        ) : (
                          <span className="text-xs text-red-400 bg-red-500/10 px-2 py-0.5 rounded-md border border-red-500/20">
                            Sin Teléfono
                          </span>
                        )}

                        {item.estadoRecordatorio === 'overdue' ? (
                          <span className="text-xs bg-red-500/20 text-red-300 border border-red-500/30 px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Mantenimiento Vencido
                          </span>
                        ) : (
                          <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Próximo Service
                          </span>
                        )}

                        {isSent && (
                          <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Enviado
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-300 flex items-center gap-3 flex-wrap">
                        <span>
                          <strong>Vehículo:</strong> {item.vehiculo.marca} {item.vehiculo.modelo} ({item.vehiculo.patente || 'S/P'})
                        </span>
                        {item.ultimoServiceKm > 0 && (
                          <span>
                            <strong>Último Service:</strong> {item.ultimoServiceKm.toLocaleString('es-PY')} km
                            {item.ultimoServiceFecha ? ` (${new Date(item.ultimoServiceFecha).toLocaleDateString('es-PY')})` : ''}
                          </span>
                        )}
                        <span>
                          <strong>Km Actual:</strong> {item.kmActuales.toLocaleString('es-PY')} km
                        </span>
                        <span>
                          <strong>Objetivo Próximo:</strong> {item.proximoKmService.toLocaleString('es-PY')} km
                        </span>
                      </div>

                      <div className="text-xs text-slate-400 flex items-center gap-2 flex-wrap">
                        {item.diferenciaKm <= 0 ? (
                          <span className="text-red-400 font-semibold">
                            ⚠️ Excedido por {Math.abs(item.diferenciaKm).toLocaleString('es-PY')} km
                          </span>
                        ) : (
                          <span className="text-amber-400 font-semibold">
                            ⏳ Faltan {item.diferenciaKm.toLocaleString('es-PY')} km para el service
                          </span>
                        )}
                        <span className="text-slate-500">
                          {item.diasDesdeUltimoService === 0
                            ? '(Último ingreso registrado hoy)'
                            : `(Hace ${item.diasDesdeUltimoService} días del último servicio)`}
                        </span>
                      </div>
                    </div>

                    {/* Right Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setSelectedReminder(item)}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Previsualizar
                      </button>

                      <button
                        onClick={() => handleSendWhatsApp(item)}
                        disabled={!item.clientTelefono}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md ${
                          !item.clientTelefono
                            ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                            : isSent
                            ? 'bg-emerald-600/80 hover:bg-emerald-600 text-white'
                            : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                        }`}
                      >
                        <Send className="w-3.5 h-3.5" />
                        {isSent ? 'Volver a Enviar' : 'Enviar WhatsApp'}
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
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl transition"
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* Previewer Modal Overlay */}
      {selectedReminder && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-400" /> Vista Previa del Mensaje de WhatsApp
              </h3>
              <button
                onClick={() => setSelectedReminder(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Nota personalizada opcional:</label>
              <input
                type="text"
                placeholder="Ej. Contamos con 15% de descuento en cambio de aceite este mes..."
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-4 text-xs font-mono text-emerald-200 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
              {buildWhatsAppMessage(selectedReminder, tallerNombre, customNote)}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedReminder(null)}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  handleSendWhatsApp(selectedReminder);
                  setSelectedReminder(null);
                }}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20"
              >
                <Send className="w-3.5 h-3.5" /> Abrir en WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
