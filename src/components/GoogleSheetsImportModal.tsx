import { useState } from 'react';
import {
  FileSpreadsheet,
  Link as LinkIcon,
  LogIn,
  CheckCircle2,
  AlertCircle,
  Users,
  Package,
  ClipboardList,
  Loader2,
  Sparkles,
  Download,
  RefreshCw,
  FileCode2
} from 'lucide-react';
import {
  parseGoogleSheetsUrl,
  fetchGoogleSheetData,
  parseCsvContent,
  mapSheetRowsToEntities,
  executeImportToFirestore,
  getGoogleOAuthToken,
  ParsedSheetData,
  ImportPreviewResult
} from '../services/googleDriveImportService';
import { Client, InventoryItem, WorkOrder } from '../types/tallerya';

interface GoogleSheetsImportModalProps {
  tallerId: string;
  onClose: () => void;
  onImportSuccess?: (data: { clients: Client[]; inventory: InventoryItem[]; workOrders: WorkOrder[] }) => void;
}

export function GoogleSheetsImportModal({
  tallerId,
  onClose,
  onImportSuccess,
}: GoogleSheetsImportModalProps) {
  // Pre-filled with user's unified Google Sheets link
  const DEFAULT_LINK = 'https://docs.google.com/spreadsheets/d/18Pt10K0g_KAlzQzFjoXzT8n6eMttLgk9G5Zu0dDFYfA/edit?gid=0#gid=0';

  const [sheetUrl, setSheetUrl] = useState<string>(DEFAULT_LINK);
  const [gid, setGid] = useState<string>('0');
  const [importType, setImportType] = useState<'auto' | 'clients' | 'inventory' | 'orders'>('auto');

  // Manual fallback paste mode
  const [manualMode, setManualMode] = useState<boolean>(false);
  const [pastedCsv, setPastedCsv] = useState<string>('');

  // OAuth & Fetch states
  const [oauthToken, setOauthToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Parsed results
  const [parsedData, setParsedData] = useState<ParsedSheetData | null>(null);
  const [previewResult, setPreviewResult] = useState<ImportPreviewResult | null>(null);

  // Success state
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSummary, setSaveSummary] = useState<{
    clientsSaved: number;
    inventorySaved: number;
    ordersSaved: number;
  } | null>(null);

  // Handle Google Sign In to authorize sheet access
  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      setStatusMessage('Conectando con tu cuenta de Google...');
      const token = await getGoogleOAuthToken();
      setOauthToken(token);
      setStatusMessage('¡Conexión exitosa con Google Drive!');
    } catch (err: any) {
      console.error('Error Google OAuth:', err);
      setErrorMessage(
        'No se pudo autenticar con Google. ' + (err?.message || 'Intenta nuevamente.')
      );
    } finally {
      setLoading(false);
    }
  };

  // Fetch sheet from URL or OAuth
  const handleFetchSheet = async () => {
    setErrorMessage('');
    setSaveSummary(null);

    if (manualMode) {
      if (!pastedCsv.trim()) {
        setErrorMessage('Por favor pega el contenido de la hoja o archivo CSV.');
        return;
      }
      try {
        setLoading(true);
        setStatusMessage('Procesando texto CSV/Tabla...');
        const data = parseCsvContent(pastedCsv);
        setParsedData(data);

        const mapped = mapSheetRowsToEntities(data.rows, tallerId, importType);
        setPreviewResult(mapped);
        setStatusMessage(`Analizadas ${mapped.rawRowsCount} filas correctamente.`);
      } catch (err: any) {
        setErrorMessage('Error al procesar el texto: ' + (err?.message || String(err)));
      } finally {
        setLoading(false);
      }
      return;
    }

    const parsedUrl = parseGoogleSheetsUrl(sheetUrl);
    if (!parsedUrl) {
      setErrorMessage(
        'El enlace de Google Sheets no es válido. Debe tener el formato https://docs.google.com/spreadsheets/d/ID_HOJA/...'
      );
      return;
    }

    try {
      setLoading(true);
      setStatusMessage('Leyendo datos desde Google Sheets...');

      const sheetGid = parsedUrl.gid || gid || '0';
      const data = await fetchGoogleSheetData(parsedUrl.spreadsheetId, sheetGid, oauthToken || undefined);

      setParsedData(data);
      const mapped = mapSheetRowsToEntities(data.rows, tallerId, importType);
      setPreviewResult(mapped);

      setStatusMessage(`Se leyeron ${mapped.rawRowsCount} registros desde Google Sheets.`);
    } catch (err: any) {
      console.warn('Fetch sheet error:', err);
      setErrorMessage(
        err?.message ||
          'No se pudo leer la hoja. Si es privada, haz clic en "Iniciar Sesión con Google" o asegúrate de que el enlace esté disponible.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Execute import to Firestore
  const handleImportToFirebase = async () => {
    if (!previewResult) return;
    try {
      setSaving(true);
      setErrorMessage('');
      const res = await executeImportToFirestore(tallerId, {
        clients: previewResult.clients,
        inventory: previewResult.inventory,
        workOrders: previewResult.workOrders,
      });

      setSaveSummary(res);
      if (onImportSuccess && previewResult) {
        onImportSuccess({
          clients: previewResult.clients,
          inventory: previewResult.inventory,
          workOrders: previewResult.workOrders,
        });
      }

      // Auto close modal smoothly after 1.5 seconds
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMessage('Error al guardar en Firebase: ' + (err?.message || String(err)));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full p-5 sm:p-7 space-y-5 shadow-2xl border border-slate-200 my-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-600 rounded-xl">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                Importar Base de Datos desde <span className="text-emerald-600">Google Drive</span>
              </h3>
              <p className="text-xs text-slate-500">
                Sincroniza tus clientes, vehículos, servicios e inventario a Firebase
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-2xl font-bold p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            &times;
          </button>
        </div>

        {/* Informative banner */}
        <div className="bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 rounded-xl p-3.5 text-xs text-slate-800 space-y-1.5">
          <div className="flex items-center gap-2 font-bold text-emerald-900">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Enlace de tu Hoja de Google Sheets detectado</span>
          </div>
          <p className="text-slate-600 leading-relaxed">
            Hemos configurado tu enlace de Google Drive. Puedes conectarte con Google si la hoja es privada o hacer clic en <b>"Analizar y Cargar Hoja"</b> para importar tus datos.
          </p>
        </div>

        {/* Input Controls */}
        <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <LinkIcon className="w-4 h-4 text-emerald-600" />
              URL de Google Sheets (Google Drive):
            </label>

            <button
              onClick={() => setManualMode(!manualMode)}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold underline flex items-center gap-1"
            >
              <FileCode2 className="w-3.5 h-3.5" />
              {manualMode ? 'Usar Enlace URL' : 'Pegar texto CSV/Tabla directamente'}
            </button>
          </div>

          {!manualMode ? (
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                className="flex-1 px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
              <button
                onClick={handleGoogleSignIn}
                className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 shrink-0 transition-colors"
                title="Iniciar sesión con Google para acceder a archivos de Google Drive privados"
              >
                <LogIn className="w-4 h-4 text-emerald-400" />
                <span>{oauthToken ? ' Google Conectado' : 'Conectar Google'}</span>
              </button>
            </div>
          ) : (
            <textarea
              rows={4}
              value={pastedCsv}
              onChange={(e) => setPastedCsv(e.target.value)}
              placeholder="Pega aquí el contenido copiado de Excel o Google Sheets (separado por comas o tabulaciones)..."
              className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
          )}

          {/* Import Entity Filter */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600">Tipo de Datos:</span>
              <select
                value={importType}
                onChange={(e: any) => setImportType(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none"
              >
                <option value="auto"> Detección Automática</option>
                <option value="clients"> Clientes y Vehículos</option>
                <option value="inventory"> Inventario / Repuestos / Servicios</option>
                <option value="orders"> Órdenes de Trabajo</option>
              </select>
            </div>

            <button
              onClick={handleFetchSheet}
              disabled={loading}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Procesando...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  <span>Analizar y Cargar Hoja</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Status or Error Messages */}
        {statusMessage && !errorMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Results Preview */}
        {previewResult && (
          <div className="space-y-3 border border-slate-200 rounded-2xl p-4 bg-white">
            <h4 className="font-extrabold text-slate-900 text-sm flex items-center justify-between">
              <span>Vista Previa de Registros Detectados:</span>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                {previewResult.rawRowsCount} Filas Analizadas
              </span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Clients Card */}
              <div className="p-3 rounded-xl border border-blue-200 bg-blue-50/50 space-y-1">
                <div className="flex items-center justify-between text-blue-900 font-bold text-xs">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span>Clientes & Vehículos</span>
                  </div>
                  <span className="bg-blue-600 text-white text-[11px] px-2 py-0.5 rounded-full">
                    {previewResult.clients.length}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  {previewResult.clients.length > 0
                    ? `Ej: ${previewResult.clients[0].nombre}`
                    : 'Sin clientes detectados'}
                </p>
              </div>

              {/* Inventory Card */}
              <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/50 space-y-1">
                <div className="flex items-center justify-between text-amber-950 font-bold text-xs">
                  <div className="flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-amber-600" />
                    <span>Repuestos / Servicios</span>
                  </div>
                  <span className="bg-amber-500 text-slate-950 text-[11px] px-2 py-0.5 rounded-full">
                    {previewResult.inventory.length}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  {previewResult.inventory.length > 0
                    ? `Ej: ${previewResult.inventory[0].nombre}`
                    : 'Sin items detectados'}
                </p>
              </div>

              {/* Work Orders Card */}
              <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-1">
                <div className="flex items-center justify-between text-emerald-950 font-bold text-xs">
                  <div className="flex items-center gap-1.5">
                    <ClipboardList className="w-4 h-4 text-emerald-600" />
                    <span>Órdenes de Trabajo</span>
                  </div>
                  <span className="bg-emerald-600 text-white text-[11px] px-2 py-0.5 rounded-full">
                    {previewResult.workOrders.length}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  {previewResult.workOrders.length > 0
                    ? `Ej: ${previewResult.workOrders[0].clienteNombre}`
                    : 'Sin órdenes detectadas'}
                </p>
              </div>
            </div>

            {/* First 3 Rows Preview Table */}
            {parsedData && parsedData.headers.length > 0 && (
              <div className="mt-3 overflow-x-auto max-h-40 border border-slate-200 rounded-xl">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      {parsedData.headers.slice(0, 6).map((h, i) => (
                        <th key={i} className="p-2 whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedData.rows.slice(0, 3).map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        {parsedData.headers.slice(0, 6).map((h, j) => (
                          <td key={j} className="p-2 text-slate-700 whitespace-nowrap">
                            {r[h] || '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Save Summary Toast */}
        {saveSummary && (
          <div className="p-4 bg-emerald-500 text-slate-950 font-bold rounded-2xl shadow-lg space-y-1">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="w-5 h-5 text-slate-950" />
              <span>¡Importación Completada con Éxito en Firebase!</span>
            </div>
            <div className="text-xs font-semibold text-slate-900 flex gap-4 pt-1">
              <span>👥 {saveSummary.clientsSaved} Clientes guardados</span>
              <span>📦 {saveSummary.inventorySaved} Items de Inventario guardados</span>
              <span>📋 {saveSummary.ordersSaved} Órdenes guardadas</span>
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900"
          >
            Cerrar
          </button>

          <div className="flex items-center gap-3">
            {previewResult && (
              <button
                onClick={handleImportToFirebase}
                disabled={saving || (previewResult.clients.length === 0 && previewResult.inventory.length === 0 && previewResult.workOrders.length === 0)}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Guardando en Firebase...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Confirmar e Importar a Firebase</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
