import { GoogleAuthProvider, signInWithPopup, User } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { Client, InventoryItem, WorkOrder, Vehicle } from '../types/tallerya';
import { saveClient, saveInventoryItem, saveWorkOrder } from './tallerService';

export interface ParsedSheetData {
  title?: string;
  headers: string[];
  rows: Record<string, string>[];
}

export interface ImportPreviewResult {
  clients: Client[];
  inventory: InventoryItem[];
  workOrders: WorkOrder[];
  rawRowsCount: number;
}

/**
 * Extract Spreadsheet ID and GID from any Google Sheets link
 */
export function parseGoogleSheetsUrl(urlOrId: string): { spreadsheetId: string; gid?: string } | null {
  const clean = urlOrId.trim();
  if (!clean) return null;

  // Match /d/SPREADSHEET_ID
  const matchD = clean.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (matchD && matchD[1]) {
    const spreadsheetId = matchD[1];
    const gidMatch = clean.match(/[?&]gid=([0-9]+)/) || clean.match(/#gid=([0-9]+)/);
    const gid = gidMatch ? gidMatch[1] : undefined;
    return { spreadsheetId, gid };
  }

  // If user passed just the raw spreadsheet ID (e.g. 1sDufW3RfiwFiycDESZOzXSm9CsFm35VMfcR35PrqhNw)
  if (/^[a-zA-Z0-9-_]{20,}$/.test(clean)) {
    return { spreadsheetId: clean };
  }

  return null;
}

/**
 * Authenticate with Google to obtain an Access Token with Google Drive / Sheets permissions
 */
export async function getGoogleOAuthToken(): Promise<string> {
  const provider = new GoogleAuthProvider();
  provider.addScope('https://www.googleapis.com/auth/spreadsheets.readonly');
  provider.addScope('https://www.googleapis.com/auth/drive.readonly');
  provider.addScope('https://www.googleapis.com/auth/drive.file');

  const result = await signInWithPopup(auth, provider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  if (!credential?.accessToken) {
    throw new Error('No se pudo obtener el token de acceso de Google');
  }
  return credential.accessToken;
}

/**
 * Fetch raw sheet data via Google Sheets CSV export endpoint or API
 */
export async function fetchGoogleSheetData(
  spreadsheetId: string,
  gid: string = '0',
  oauthToken?: string
): Promise<ParsedSheetData> {
  let csvText = '';

  // Attempt 1: Try public CSV export URL first
  try {
    const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
    const headers: Record<string, string> = oauthToken ? { Authorization: `Bearer ${oauthToken}` } : {};
    const response = await fetch(csvUrl, { headers });

    if (response.ok) {
      csvText = await response.text();
    }
  } catch (err) {
    console.warn('Public CSV export endpoint failed, trying alternative endpoint:', err);
  }

  // Attempt 2: Google Sheets API v4 if OAuth token is available
  if (!csvText && oauthToken) {
    try {
      const apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:ZZ1000?key=`;
      const apiResp = await fetch(apiUrl, {
        headers: { Authorization: `Bearer ${oauthToken}` },
      });

      if (apiResp.ok) {
        const json = await apiResp.json();
        const values: string[][] = json.values || [];
        if (values.length > 0) {
          const headers = values[0].map((h) => h.trim());
          const rows: Record<string, string>[] = [];

          for (let i = 1; i < values.length; i++) {
            const rowArr = values[i];
            const rowObj: Record<string, string> = {};
            let hasData = false;

            headers.forEach((h, colIdx) => {
              const val = rowArr[colIdx] ? String(rowArr[colIdx]).trim() : '';
              rowObj[h] = val;
              if (val) hasData = true;
            });

            if (hasData) {
              rows.push(rowObj);
            }
          }

          return { headers, rows };
        }
      }
    } catch (e) {
      console.warn('Google Sheets API request error:', e);
    }
  }

  // Fallback parsing if csvText was fetched
  if (csvText) {
    return parseCsvContent(csvText);
  }

  throw new Error(
    'No se pudo acceder a la hoja de Google Sheets. Asegúrate de iniciar sesión con Google o de que la hoja esté compartida como "Cualquier persona con el enlace".'
  );
}

/**
 * Parse CSV format text into headers and row objects
 */
export function parseCsvContent(csvText: string): ParsedSheetData {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const parseCsvLine = (line: string): string[] => {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' || char === "'") {
        inQuotes = !inQuotes;
      } else if ((char === ',' || char === ';') && !inQuotes) {
        result.push(cur.trim().replace(/^["']|["']$/g, ''));
        cur = '';
      } else {
        cur += char;
      }
    }
    result.push(cur.trim().replace(/^["']|["']$/g, ''));
    return result;
  };

  const headers = parseCsvLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const rowObj: Record<string, string> = {};
    let hasData = false;

    headers.forEach((h, idx) => {
      const key = h || `Columna_${idx + 1}`;
      const val = values[idx] || '';
      rowObj[key] = val;
      if (val) hasData = true;
    });

    if (hasData) {
      rows.push(rowObj);
    }
  }

  return { headers, rows };
}

/**
 * Intelligent mapping of spreadsheet rows to Clients, Inventory, and Work Orders
 */
export function mapSheetRowsToEntities(
  rows: Record<string, string>[],
  tallerId: string,
  targetType: 'auto' | 'clients' | 'inventory' | 'orders' = 'auto'
): ImportPreviewResult {
  const clients: Client[] = [];
  const inventory: InventoryItem[] = [];
  const workOrders: WorkOrder[] = [];

  if (rows.length === 0) {
    return { clients: [], inventory: [], workOrders: [], rawRowsCount: 0 };
  }

  rows.forEach((row, index) => {
    const keys = Object.keys(row);

    // Helper to find column value by keyword
    const getValue = (...keywords: string[]): string => {
      for (const kw of keywords) {
        const foundKey = keys.find((k) => k.toLowerCase().includes(kw.toLowerCase()));
        if (foundKey && row[foundKey]) {
          return row[foundKey].trim();
        }
      }
      return '';
    };

    const nombre = getValue('nombre', 'cliente', 'razon social', 'titular', 'item', 'descripcion');
    const telefono = getValue('telefono', 'celular', 'tel', 'contacto', 'movil');
    const email = getValue('email', 'correo', 'mail');
    const direccion = getValue('direccion', 'domicilio', 'ubicacion');

    const patente = getValue('patente', 'dominio', 'placa', 'chapa', 'vehiculo');
    const marca = getValue('marca');
    const modelo = getValue('modelo');
    const anioStr = getValue('año', 'anio', 'year');
    const kmStr = getValue('km', 'kilometraje', 'kilometros');

    const repuestoCodigo = getValue('codigo', 'sku', 'cod', 'referencia');
    const repuestoNombre = getValue('repuesto', 'producto', 'servicio', 'articulo', 'detalle');
    const stockStr = getValue('stock', 'cantidad', 'cant', 'unidades');
    const precioStr = getValue('precio', 'valor', 'monto', 'pvp', 'tarifa');
    const costoStr = getValue('costo', 'costo unitario', 'compra');
    const categoria = getValue('categoria', 'tipo', 'rubro') || 'General';

    const falla = getValue('falla', 'problema', 'observacion', 'motivo', 'trabajo');
    const estado = getValue('estado', 'status') || 'ingresado';

    const cleanNumber = (str: string, fallback: number = 0): number => {
      if (!str) return fallback;
      const num = parseFloat(str.replace(/[^0-9.-]/g, ''));
      return isNaN(num) ? fallback : num;
    };

    // 1. Check if it's a Client
    if (targetType === 'clients' || (targetType === 'auto' && (nombre || patente) && (telefono || email || marca))) {
      if (nombre || patente) {
        const vehiculos: Vehicle[] = [];
        if (patente || marca || modelo) {
          vehiculos.push({
            id: `v_${Date.now()}_${index}`,
            patente: patente ? patente.toUpperCase() : `S/P-${index + 1}`,
            marca: marca || 'Genérico',
            modelo: modelo || 'Estándar',
            anio: cleanNumber(anioStr, new Date().getFullYear()),
            kilometraje: cleanNumber(kmStr, 0),
            nivelCombustible: '1/2',
          });
        }

        clients.push({
          id: `c_import_${Date.now()}_${index}`,
          tallerId,
          nombre: nombre || (patente ? `Cliente ${patente}` : `Cliente ${index + 1}`),
          telefono: telefono || '+595900000000',
          email: email || '',
          direccion: direccion || '',
          vehiculos,
        });
      }
    }

    // 2. Check if it's an Inventory Item / Service
    if (targetType === 'inventory' || (targetType === 'auto' && (repuestoNombre || repuestoCodigo || stockStr || costoStr))) {
      const nameVal = repuestoNombre || nombre;
      if (nameVal) {
        inventory.push({
          id: `inv_import_${Date.now()}_${index}`,
          tallerId,
          codigo: repuestoCodigo || `COD-${1000 + index}`,
          nombre: nameVal,
          categoria: categoria,
          stockActual: cleanNumber(stockStr, 10),
          stockMinimo: 2,
          precioCosto: cleanNumber(costoStr, 0),
          precioVenta: cleanNumber(precioStr, cleanNumber(costoStr, 0) * 1.3),
          ubicacion: 'Depósito Central',
        });
      }
    }

    // 3. Check if it's a Work Order
    if (targetType === 'orders' || (targetType === 'auto' && (falla || patente) && nombre)) {
      if (nombre && (patente || falla)) {
        workOrders.push({
          id: `wo_import_${Date.now()}_${index}`,
          tallerId,
          numeroOrden: `OT-IMP-${1000 + index}`,
          fechaIngreso: new Date().toISOString(),
          clienteId: `c_import_${Date.now()}_${index}`,
          clienteNombre: nombre,
          clienteTelefono: telefono || '',
          vehiculo: {
            id: `v_${Date.now()}_${index}`,
            patente: patente ? patente.toUpperCase() : 'S/P',
            marca: marca || 'Marca',
            modelo: modelo || 'Modelo',
            anio: cleanNumber(anioStr, new Date().getFullYear()),
            kilometraje: cleanNumber(kmStr, 0),
            nivelCombustible: '1/2',
          },
          fallaReportada: falla || 'Mantenimiento General importado',
          estado: 'ingresado',
          servicios: [],
          mecanicoAsignado: 'Sin Asignar',
          totalEstimado: cleanNumber(precioStr, 0),
        });
      }
    }
  });

  return {
    clients,
    inventory,
    workOrders,
    rawRowsCount: rows.length,
  };
}

/**
 * Execute batch save of imported data into Firestore
 */
export async function executeImportToFirestore(
  tallerId: string,
  data: { clients: Client[]; inventory: InventoryItem[]; workOrders: WorkOrder[] }
): Promise<{ clientsSaved: number; inventorySaved: number; ordersSaved: number }> {
  let clientsSaved = 0;
  let inventorySaved = 0;
  let ordersSaved = 0;

  for (const client of data.clients) {
    try {
      await saveClient(client, tallerId);
      clientsSaved++;
    } catch (e) {
      console.warn('Error importing client:', e);
    }
  }

  for (const item of data.inventory) {
    try {
      await saveInventoryItem(item, tallerId);
      inventorySaved++;
    } catch (e) {
      console.warn('Error importing inventory item:', e);
    }
  }

  for (const order of data.workOrders) {
    try {
      await saveWorkOrder(order, tallerId);
      ordersSaved++;
    } catch (e) {
      console.warn('Error importing work order:', e);
    }
  }

  return { clientsSaved, inventorySaved, ordersSaved };
}
