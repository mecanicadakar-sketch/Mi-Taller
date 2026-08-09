import { GoogleAuthProvider, signInWithPopup, User } from 'firebase/auth';
import { doc, setDoc, writeBatch } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { Client, InventoryItem, WorkOrder, Vehicle, OrderStatus } from '../types/tallerya';
import { saveClient, saveInventoryItem, saveWorkOrder } from './tallerService';
import { resolveProximoKm } from './whatsappReminderService';

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

function cleanId(str: string): string {
  if (!str) return '';
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Deduplicate clients list by patente or normalized name+phone
 */
export function deduplicateClients(clientsList: Client[]): Client[] {
  const map = new Map<string, Client>();
  clientsList.forEach((c) => {
    const patente = c.vehiculos?.find((v) => v.patente && v.patente !== 'S/P')?.patente?.trim().toUpperCase();
    const namePhone = `${cleanId(c.nombre)}_${cleanId(c.telefono || '')}`;
    const key = patente ? `pat_${patente}` : (namePhone && namePhone !== '_' ? `np_${namePhone}` : c.id);

    if (!map.has(key)) {
      map.set(key, { ...c });
    } else {
      const existing = map.get(key)!;
      // Merge vehicles
      c.vehiculos.forEach((v) => {
        const existingVehicle = existing.vehiculos.find(
          (ev) => (ev.patente && v.patente && ev.patente.trim().toUpperCase() === v.patente.trim().toUpperCase()) ||
                  (ev.marca.toLowerCase() === v.marca.toLowerCase() && ev.modelo.toLowerCase() === v.modelo.toLowerCase())
        );
        if (!existingVehicle) {
          existing.vehiculos.push(v);
        } else {
          existingVehicle.kilometraje = Math.max(existingVehicle.kilometraje || 0, v.kilometraje || 0);
          if (v.patente && v.patente !== 'S/P' && (!existingVehicle.patente || existingVehicle.patente === 'S/P')) {
            existingVehicle.patente = v.patente;
          }
        }
      });
      if (!existing.telefono || existing.telefono === '+595900000000') {
        existing.telefono = c.telefono;
      }
      if (!existing.email) existing.email = c.email;
    }
  });
  return Array.from(map.values());
}

/**
 * Deduplicate work orders by numeroOrden or (patente + fecha + falla)
 */
export function deduplicateWorkOrders(ordersList: WorkOrder[]): WorkOrder[] {
  const map = new Map<string, WorkOrder>();
  ordersList.forEach((o) => {
    const key = o.id || `wo_${o.numeroOrden || ''}_${o.fechaIngreso || ''}`;
    if (!map.has(key)) {
      map.set(key, { ...o });
    } else {
      const existing = map.get(key)!;
      if ((o.vehiculo?.kilometraje || 0) > (existing.vehiculo?.kilometraje || 0)) {
        existing.vehiculo.kilometraje = o.vehiculo.kilometraje;
      }
      if (o.clienteTelefono && (!existing.clienteTelefono || existing.clienteTelefono === '+595900000000')) {
        existing.clienteTelefono = o.clienteTelefono;
      }
    }
  });
  return Array.from(map.values());
}

/**
 * Intelligent mapping of spreadsheet rows to Clients, Inventory, and Work Orders
 */
export function mapSheetRowsToEntities(
  rows: Record<string, string>[],
  tallerId: string,
  targetType: 'auto' | 'clients' | 'inventory' | 'orders' = 'auto'
): ImportPreviewResult {
  const clientsMap = new Map<string, Client>();
  const inventoryMap = new Map<string, InventoryItem>();
  const workOrdersMap = new Map<string, WorkOrder>();

  if (rows.length === 0) {
    return { clients: [], inventory: [], workOrders: [], rawRowsCount: 0 };
  }

  rows.forEach((row, index) => {
    const keys = Object.keys(row);

    // Helper to find column value by keyword, resilient to symbols, spaces, and punctuation
    const getValue = (...keywords: string[]): string => {
      for (const kw of keywords) {
        const normKw = kw.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!normKw) continue;
        const foundKey = keys.find((k) => {
          const normK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
          return normK.includes(normKw);
        });
        if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null) {
          const val = String(row[foundKey]).trim();
          if (val) return val;
        }
      }
      return '';
    };

    const nombre = getValue('cliente nombre', 'nombre', 'cliente', 'razon social', 'titular', 'item', 'descripcion');
    const telefono = getValue('teléfono', 'telefono', 'celular', 'tel', 'contacto', 'movil');
    const email = getValue('email', 'correo', 'mail');
    const direccion = getValue('direccion', 'domicilio', 'ubicacion');

    const patenteRaw = getValue('idcodigoqr', 'patente o codigoqr', 'patenteocodigoqr', 'patente', 'codigoqr', 'dominio', 'placa', 'chapa', 'vehiculo');
    const patente = patenteRaw ? patenteRaw.toUpperCase().trim() : '';

    const marcaModeloRaw = getValue('marca y modelo', 'marcaymodelo', 'marca/modelo');
    let marca = getValue('marca');
    let modelo = getValue('modelo');

    if (marcaModeloRaw && (!marca || !modelo)) {
      const parts = marcaModeloRaw.split(' ');
      if (parts.length > 1) {
        marca = parts[0];
        modelo = parts.slice(1).join(' ');
      } else {
        marca = marcaModeloRaw;
        modelo = 'Estándar';
      }
    }

    const anioStr = getValue('año', 'anio', 'year');
    const kmStr = getValue('kilometros actual', 'kilometros', 'kilometraje', 'km');
    const intervaloStr = getValue('intervalo kms', 'intervalo');
    const proximoCambioStr = getValue('proximo cambio', 'proximo km', 'proximo');
    const tipoAceite = getValue('tipo de aceite', 'aceite motor', 'aceite');
    const filtrosCambiados = getValue('filtros cambiados', 'filtros');
    const fecha = getValue('fecha', 'date');
    const idServicio = getValue('idservicio', 'id servicio', 'codigo');

    const repuestoCodigo = idServicio || getValue('codigo', 'sku', 'cod', 'referencia');
    const repuestoNombre = getValue('repuesto', 'producto', 'articulo', 'detalle');
    const stockStr = getValue('stock', 'cantidad', 'cant', 'unidades');
    const precioStr = getValue('precio', 'valor', 'monto', 'pvp', 'tarifa');
    const costoStr = getValue('costo', 'costo unitario', 'compra');
    const categoria = getValue('categoria', 'tipo', 'rubro') || 'General';

    const falla = getValue('notas/observaciones', 'notas', 'observaciones', 'falla', 'problema', 'motivo', 'trabajo');
    const estadoRaw = getValue('estado', 'status');
    const estadoVal = (estadoRaw ? estadoRaw.toLowerCase() : '') as OrderStatus;
    const validStatuses: OrderStatus[] = ['ingresado', 'diagnostico', 'reparacion', 'repuestos', 'listo', 'entregado'];
    const estado: OrderStatus = validStatuses.includes(estadoVal) ? estadoVal : 'ingresado';

    const cleanNumber = (str: string, fallback: number = 0): number => {
      if (!str) return fallback;
      let s = str.trim();
      s = s.replace(/[$sS\s]/g, '').replace(/km/gi, '').trim();
      if (!s) return fallback;

      if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
        s = s.replace(/\./g, '');
      } else if (/^\d{1,3}(,\d{3})+$/.test(s)) {
        s = s.replace(/,/g, '');
      } else if (s.includes(',') && !s.includes('.')) {
        if (/,\d{2}$/.test(s)) {
          s = s.replace(',', '.');
        } else {
          s = s.replace(/,/g, '');
        }
      } else if (s.includes('.') && s.includes(',')) {
        s = s.replace(/\./g, '').replace(',', '.');
      }

      const num = parseFloat(s.replace(/[^0-9.-]/g, ''));
      return isNaN(num) ? fallback : num;
    };

    let kmCurrent = cleanNumber(kmStr, 0);
    const intervalKm = cleanNumber(intervaloStr, 10000);
    const nextKm = cleanNumber(proximoCambioStr, 0);

    if (kmCurrent === 0 && nextKm > 0 && intervalKm > 0 && nextKm > intervalKm) {
      kmCurrent = nextKm - intervalKm;
    }

    const baseKm = kmCurrent;
    const calculatedNextKm = resolveProximoKm(baseKm, nextKm, intervalKm);

    // Build maintenance object if service log details are present
    const filtrosLower = (filtrosCambiados || '').toLowerCase();
    const hasServiceDetails = Boolean(filtrosCambiados || tipoAceite || intervaloStr || idServicio);

    const maintenanceObj = hasServiceDetails
      ? {
          intervaloKm: intervalKm || 10000,
          tipoAceiteMotor: tipoAceite || '5W30 Sintético',
          proximoKmService: calculatedNextKm,
          filtroAceite: filtrosLower.includes('aceite') || filtrosLower.length === 0,
          filtroAire: filtrosLower.includes('aire') || filtrosLower.length === 0,
          filtroCombustible: filtrosLower.includes('combustible'),
          filtroHabitaculo: filtrosLower.includes('habitaculo') || filtrosLower.includes('a/a') || filtrosLower.includes('aa'),
          filtroCajaATF: filtrosLower.includes('atf') || filtrosLower.includes('caja'),
          aceiteCajaAutomatica: filtrosLower.includes('atf') || filtrosLower.includes('caja'),
          aceiteMotor: true,
          notasService: falla || '',
        }
      : undefined;

    // Stable Client ID
    const clientId = patente
      ? `c_${cleanId(patente)}`
      : (nombre && telefono)
      ? `c_${cleanId(nombre)}_${cleanId(telefono)}`
      : nombre
      ? `c_${cleanId(nombre)}`
      : `c_row_${index}`;

    // 1. Check if it's a Client / Vehicle entry
    if (targetType === 'clients' || (targetType === 'auto' && (nombre || patente))) {
      if (nombre || patente) {
        const vehiculos: Vehicle[] = [];
        if (patente || marca || modelo) {
          vehiculos.push({
            id: `v_${cleanId(patente || (marca + '_' + modelo) || 'std')}`,
            patente: patente || `S/P-${index + 1}`,
            marca: marca || 'Toyota',
            modelo: modelo || 'Estándar',
            anio: cleanNumber(anioStr, new Date().getFullYear()),
            kilometraje: kmCurrent,
            nivelCombustible: '1/2',
          });
        }

        if (clientsMap.has(clientId)) {
          const existingClient = clientsMap.get(clientId)!;
          if (telefono && (!existingClient.telefono || existingClient.telefono === '+595900000000')) {
            existingClient.telefono = telefono;
          }
          if (email && !existingClient.email) existingClient.email = email;
          vehiculos.forEach((v) => {
            const ev = existingClient.vehiculos.find(
              (x) => x.patente?.trim().toUpperCase() === v.patente?.trim().toUpperCase()
            );
            if (!ev) {
              existingClient.vehiculos.push(v);
            } else {
              ev.kilometraje = Math.max(ev.kilometraje || 0, v.kilometraje || 0);
            }
          });
        } else {
          clientsMap.set(clientId, {
            id: clientId,
            tallerId,
            nombre: nombre || `Cliente ${patente || index + 1}`,
            telefono: telefono || '+595900000000',
            email: email || '',
            direccion: direccion || '',
            vehiculos,
          });
        }
      }
    }

    // 2. Check if it's an Inventory Item / Spare Part
    if (targetType === 'inventory' || (targetType === 'auto' && (repuestoNombre || stockStr || costoStr))) {
      if (repuestoNombre) {
        const invId = repuestoCodigo ? `inv_${cleanId(repuestoCodigo)}` : `inv_${cleanId(repuestoNombre)}`;
        inventoryMap.set(invId, {
          id: invId,
          tallerId,
          codigo: repuestoCodigo || `COD-${1000 + index}`,
          nombre: repuestoNombre,
          categoria: categoria,
          stockActual: cleanNumber(stockStr, 10),
          stockMinimo: 2,
          precioCosto: cleanNumber(costoStr, 0),
          precioVenta: cleanNumber(precioStr, cleanNumber(costoStr, 0) * 1.3),
          ubicacion: 'Depósito Central',
        });
      }
    }

    // 3. Check if it's a Work Order / Service Log
    if (targetType === 'orders' || (targetType === 'auto' && (patente || falla || hasServiceDetails))) {
      if (patente || nombre || hasServiceDetails) {
        const orderSummary = `Service de ${intervalKm || 10000} km. Filtros: ${filtrosCambiados || 'Aceite y Aire'}. Aceite: ${tipoAceite || 'Sintético'}. ${falla ? 'Notas: ' + falla : ''}`;

        const orderId = idServicio
          ? `wo_${cleanId(idServicio)}`
          : (patente && fecha)
          ? `wo_${cleanId(patente)}_${cleanId(fecha)}_${index + 1}`
          : patente
          ? `wo_${cleanId(patente)}_${cleanId(kmStr || falla.substring(0, 15) || String(index))}_${index + 1}`
          : `wo_row_${index + 1}`;

        const numOrd = idServicio
          ? (idServicio.toUpperCase().startsWith('OT') ? idServicio.toUpperCase() : `OT-${idServicio}`)
          : (patente ? `OT-${patente}-${index + 1}` : `OT-IMP-${1000 + index + 1}`);

    const workOrderData: WorkOrder = {
          id: orderId,
          tallerId,
          numeroOrden: numOrd,
          fechaIngreso: fecha || new Date().toISOString().split('T')[0],
          clienteId: clientId,
          clienteNombre: nombre || `Cliente ${patente || index + 1}`,
          clienteTelefono: telefono || '',
          vehiculo: {
            id: `v_${cleanId(patente || (marca + '_' + modelo) || 'std')}`,
            patente: patente || 'S/P',
            marca: marca || 'Toyota',
            modelo: modelo || 'Estándar',
            anio: cleanNumber(anioStr, new Date().getFullYear()),
            kilometraje: kmCurrent,
            nivelCombustible: '1/2',
          },
          fallaReportada: orderSummary,
          estado,
          servicios: [],
          mecanicoAsignado: 'Taller',
          totalEstimado: cleanNumber(precioStr, 0),
        };

        if (maintenanceObj) {
          workOrderData.mantenimiento = maintenanceObj;
        }

        workOrdersMap.set(orderId, workOrderData);
      }
    }
  });

  const rawClients = Array.from(clientsMap.values());
  const rawOrders = Array.from(workOrdersMap.values());

  // Cross-synchronize vehicle kilometraje and client metadata between clients and workOrders
  rawOrders.forEach((order) => {
    const orderPatente = order.vehiculo?.patente?.trim().toUpperCase();
    const matchingClient = rawClients.find((c) => {
      if (c.id === order.clienteId) return true;
      if (orderPatente && c.vehiculos.some((v) => v.patente?.trim().toUpperCase() === orderPatente)) return true;
      if (c.nombre && order.clienteNombre && c.nombre.trim().toLowerCase() === order.clienteNombre.trim().toLowerCase()) return true;
      return false;
    });

    if (matchingClient) {
      order.clienteId = matchingClient.id;
      order.clienteNombre = matchingClient.nombre;
      if (matchingClient.telefono && matchingClient.telefono !== '+595900000000') {
        order.clienteTelefono = matchingClient.telefono;
      }

      const matchingVehicle = matchingClient.vehiculos.find(
        (v) => (orderPatente && v.patente?.trim().toUpperCase() === orderPatente) ||
               (v.marca.toLowerCase() === order.vehiculo.marca.toLowerCase() && v.modelo.toLowerCase() === order.vehiculo.modelo.toLowerCase())
      ) || matchingClient.vehiculos[0];

      if (matchingVehicle) {
        const maxKm = Math.max(matchingVehicle.kilometraje || 0, order.vehiculo.kilometraje || 0);
        matchingVehicle.kilometraje = maxKm;
        order.vehiculo.kilometraje = maxKm;

        if (matchingVehicle.patente && matchingVehicle.patente !== 'S/P' && (!order.vehiculo.patente || order.vehiculo.patente === 'S/P')) {
          order.vehiculo.patente = matchingVehicle.patente;
        }
      }
    }
  });

  rawClients.forEach((c) => {
    c.vehiculos.forEach((v) => {
      if (v.kilometraje > 0 && v.patente) {
        rawOrders.forEach((wo) => {
          if (wo.vehiculo.patente?.trim().toUpperCase() === v.patente.trim().toUpperCase()) {
            if (!wo.vehiculo.kilometraje || wo.vehiculo.kilometraje < v.kilometraje) {
              wo.vehiculo.kilometraje = v.kilometraje;
            }
          }
        });
      }
    });
  });

  const clients = deduplicateClients(rawClients);
  const workOrders = deduplicateWorkOrders(rawOrders);
  const inventory = Array.from(inventoryMap.values());

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
async function saveWithTimeout(promise: Promise<void>, timeoutMs = 2500): Promise<void> {
  let timer: any;
  const timeoutPromise = new Promise<void>((resolve) => {
    timer = setTimeout(() => resolve(), timeoutMs);
  });

  return Promise.race([
    promise.then(() => clearTimeout(timer)),
    timeoutPromise,
  ]);
}

function sanitizeForFirestore<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeForFirestore(item)) as any;
  }
  if (typeof obj === 'object') {
    const newObj: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        newObj[key] = sanitizeForFirestore(value);
      }
    }
    return newObj;
  }
  return obj;
}

/**
 * Saves processed data to Firestore and LocalStorage cleanly and persistently.
 */
export async function executeImportToFirestore(
  tallerId: string,
  data: { clients: Client[]; inventory: InventoryItem[]; workOrders: WorkOrder[] }
): Promise<{ clientsSaved: number; inventorySaved: number; ordersSaved: number }> {
  // 1. Immediately persist to LocalStorage backup so data is NEVER lost on refresh or listener reset
  try {
    const existingGuestClients = JSON.parse(localStorage.getItem('mitaller_guest_clients') || '[]');
    const existingGuestInv = JSON.parse(localStorage.getItem('mitaller_guest_inventory') || '[]');
    const existingGuestOrders = JSON.parse(localStorage.getItem('mitaller_guest_workOrders') || '[]');

    const mergedClients = deduplicateClients([...data.clients, ...existingGuestClients]);
    const mergedInvMap = new Map<string, InventoryItem>();
    existingGuestInv.forEach((i: any) => mergedInvMap.set(i.id, i));
    data.inventory.forEach((i) => mergedInvMap.set(i.id, i));
    const mergedInv = Array.from(mergedInvMap.values());
    const mergedOrders = deduplicateWorkOrders([...data.workOrders, ...existingGuestOrders]);

    localStorage.setItem('mitaller_guest_clients', JSON.stringify(mergedClients));
    localStorage.setItem('mitaller_guest_inventory', JSON.stringify(mergedInv));
    localStorage.setItem('mitaller_guest_workOrders', JSON.stringify(mergedOrders));

    if (tallerId) {
      localStorage.setItem(`mitaller_${tallerId}_clients`, JSON.stringify(mergedClients));
      localStorage.setItem(`mitaller_${tallerId}_inventory`, JSON.stringify(mergedInv));
      localStorage.setItem(`mitaller_${tallerId}_workOrders`, JSON.stringify(mergedOrders));
    }
  } catch (e) {
    console.warn('LocalStorage backup error:', e);
  }

  // 2. Prepare Firestore documents to save in atomic batches
  const docsToWrite: Array<{ collectionName: string; id: string; data: any }> = [
    ...data.clients.map((c) => ({ collectionName: 'clients', id: c.id, data: { ...c, tallerId } })),
    ...data.inventory.map((i) => ({ collectionName: 'inventory', id: i.id, data: { ...i, tallerId } })),
    ...data.workOrders.map((w) => ({ collectionName: 'workOrders', id: w.id, data: { ...w, tallerId } })),
  ];

  if (docsToWrite.length === 0) {
    return { clientsSaved: 0, inventorySaved: 0, ordersSaved: 0 };
  }

  // Commit in chunks of 50 docs per writeBatch
  const BATCH_SIZE = 50;
  for (let i = 0; i < docsToWrite.length; i += BATCH_SIZE) {
    const chunk = docsToWrite.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);

    for (const item of chunk) {
      const docRef = doc(db, item.collectionName, item.id);
      const sanitized = sanitizeForFirestore(item.data);
      batch.set(docRef, sanitized, { merge: true });
    }

    try {
      await batch.commit();
    } catch (err) {
      console.warn('Error guardando lote en Firestore (batch commit error), intentando uno a uno:', err);
      // Fallback: save individually
      for (const item of chunk) {
        try {
          const docRef = doc(db, item.collectionName, item.id);
          const sanitized = sanitizeForFirestore(item.data);
          await setDoc(docRef, sanitized, { merge: true });
        } catch (singleErr) {
          console.warn(`Could not save single item ${item.id} to Firestore:`, singleErr);
        }
      }
    }
  }

  return {
    clientsSaved: data.clients.length,
    inventorySaved: data.inventory.length,
    ordersSaved: data.workOrders.length,
  };
}
