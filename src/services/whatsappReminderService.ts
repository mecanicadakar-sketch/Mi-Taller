import { WorkOrder, Client, Vehicle } from '../types/tallerya';
import { parseAndNormalizeDate } from '../utils/dateUtils';

export interface MaintenanceReminderItem {
  clientId: string;
  clientNombre: string;
  clientTelefono: string;
  vehiculo: Vehicle;
  ultimoServiceKm: number;
  ultimoServiceFecha: string;
  proximoKmService: number;
  kmActuales: number;
  diferenciaKm: number; // e.g. -500 (pasado por 500km), +200 (le faltan 200km)
  diasDesdeUltimoService: number;
  intervaloKm: number;
  maxMesesService: number;
  maxDiasService: number;
  estadoRecordatorio: 'overdue' | 'due_soon' | 'upcoming';
  ordenTrabajoId?: string;
  notasService?: string;
  ultimoAviso?: string; // Fecha ISO o texto del último aviso enviado
  diasDesdeUltimoAviso?: number; // Días transcurridos desde el último aviso registrado
  notificadoRecientemente?: boolean; // True si ya fue notificado hace pocos días (ej. < 7 días) para evitar duplicados
}

export interface CalculateRemindersOptions {
  soloSinAvisoReciente?: boolean; // Si es true, excluye órdenes que ya fueron notificadas recientemente
  minDiasEntreAvisos?: number; // Ventana de días para considerar un aviso reciente (por defecto 7 días)
}

/**
 * Checks whether a notification was already sent recently (default 7 days)
 * to avoid duplicate WhatsApp messages / spamming the client.
 */
export function esAvisoDuplicado(
  woOrFecha: WorkOrder | string | undefined | null,
  minDias = 7
): boolean {
  if (!woOrFecha) return false;
  const fechaStr = typeof woOrFecha === 'string'
    ? woOrFecha
    : (woOrFecha.ultimoAviso || woOrFecha.ultimoAvisoWhatsApp);

  if (!fechaStr) return false;

  const parsedIso = parseAndNormalizeDate(fechaStr);
  const avisoDate = new Date(parsedIso);
  if (isNaN(avisoDate.getTime())) return false;

  const hoy = new Date();
  const diffMs = hoy.getTime() - avisoDate.getTime();
  const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return diffDias >= 0 && diffDias < minDias;
}

/**
 * Registers an 'ultimo aviso' timestamp on a WorkOrder to track notifications and prevent duplicates.
 */
export function registrarUltimoAviso(wo: WorkOrder, fecha?: string): WorkOrder {
  const timestamp = fecha || new Date().toISOString();
  return {
    ...wo,
    ultimoAviso: timestamp,
    ultimoAvisoWhatsApp: timestamp,
  };
}

/**
 * Updates a list of WorkOrders by marking the matching order with 'ultimoAviso'.
 */
export function marcarOrdenComoAvisada(
  workOrders: WorkOrder[],
  orderId: string,
  fecha?: string
): WorkOrder[] {
  const timestamp = fecha || new Date().toISOString();
  return workOrders.map((o) =>
    o.id === orderId
      ? { ...o, ultimoAviso: timestamp, ultimoAvisoWhatsApp: timestamp }
      : o
  );
}

export interface TwilioConfig {
  accountSid?: string;
  authToken?: string;
  fromPhoneNumber?: string; // e.g., whatsapp:+14155238886
}

/**
 * Normalizes phone numbers for WhatsApp API / wa.me links
 */
export function formatWhatsAppPhone(phone: string): string {
  if (!phone) return '';
  // Clean all non-digit characters except leading plus if any
  let cleaned = phone.replace(/[^\d+]/g, '');
  if (!cleaned) return '';

  // If starts with +, remove + for wa.me URL
  if (cleaned.startsWith('+')) {
    return cleaned.replace('+', '');
  }

  // Handle local Paraguay numbers starting with 0 (e.g., 0981xxxxxx -> 595981xxxxxx)
  if (cleaned.startsWith('09') && cleaned.length === 10) {
    return '595' + cleaned.substring(1);
  }
  
  // Handle local Argentina numbers (e.g. 011 -> 54911)
  if (cleaned.startsWith('0') && cleaned.length >= 9) {
    return '549' + cleaned.substring(1);
  }

  // Default fallback if no country code present
  if (cleaned.length === 9 || cleaned.length === 8) {
    return '595' + cleaned;
  }

  return cleaned;
}

/**
 * Automatically extracts or resolves the maintenance interval in KM for a work order.
 * Accurately detects and distinguishes 5,000 km (mineral), 7,000 km (semisynthetic),
 * 10,000 km (synthetic), 20,000 km, 50,000 km (ATF), 100,000 km (distribución).
 */
export function detectServiceInterval(wo: Partial<WorkOrder>): number {
  // 1. Direct explicit interval in mantenimiento (if specifically chosen)
  const rawInterval = wo.mantenimiento?.intervaloKm;
  if (typeof rawInterval === 'number' && rawInterval > 0) {
    const sanitized = rawInterval <= 50 ? rawInterval * 1000 : rawInterval;
    // Specific intervals like 5000, 7000, 20000, 50000, 100000 take high precedence
    if (sanitized === 5000 || sanitized === 7000 || sanitized === 20000 || sanitized === 50000 || sanitized === 100000) {
      return sanitized;
    }
  }

  // 2. Scan text corpus and oil types for explicit keywords
  const tipoAceite = (wo.mantenimiento?.tipoAceiteMotor || '').toLowerCase();
  const corpus = [
    wo.fallaReportada || '',
    wo.diagnosticoTecnico || '',
    wo.mantenimiento?.notasService || '',
    tipoAceite,
    ...(wo.servicios || []).map((s) => s.descripcion || ''),
  ]
    .join(' ')
    .toLowerCase();

  // Explicit check for 5.000 / 5000 km (mineral oil / standard 5k service)
  if (
    corpus.includes('5.000') ||
    corpus.includes('5000') ||
    corpus.includes('5 mil') ||
    corpus.includes('5k') ||
    corpus.includes('cada 5.000') ||
    corpus.includes('cada 5000') ||
    corpus.includes('mineral') ||
    corpus.includes('15w40') ||
    corpus.includes('20w50')
  ) {
    return 5000;
  }

  // Check for 7.000 / 7000 km (semisynthetic / 10w40)
  if (
    corpus.includes('7.000') ||
    corpus.includes('7000') ||
    corpus.includes('7 mil') ||
    corpus.includes('7k') ||
    corpus.includes('semisintético') ||
    corpus.includes('semisintetico') ||
    corpus.includes('10w40')
  ) {
    return 7000;
  }

  // Check for 20.000 km
  if (corpus.includes('20.000') || corpus.includes('20000')) {
    return 20000;
  }

  // Check for 50.000 km (ATF / Automatic gearbox)
  if (
    corpus.includes('50.000') ||
    corpus.includes('50000') ||
    corpus.includes('caja automatica') ||
    corpus.includes('caja automática') ||
    corpus.includes('atf') ||
    wo.mantenimiento?.filtroCajaATF ||
    wo.mantenimiento?.aceiteCajaAutomatica
  ) {
    return 50000;
  }

  // Check for 100.000 km (Timing belt / Distribución)
  if (
    corpus.includes('100.000') ||
    corpus.includes('100000') ||
    corpus.includes('correa') ||
    corpus.includes('distribucion') ||
    corpus.includes('distribución') ||
    wo.mantenimiento?.correaDistribucion
  ) {
    return 100000;
  }

  // If explicit rawInterval was set to 10000
  if (typeof rawInterval === 'number' && rawInterval > 0) {
    return rawInterval <= 50 ? rawInterval * 1000 : rawInterval;
  }

  // 3. From proximoKmService and vehicle km
  const ultimoKm = wo.vehiculo?.kilometraje || 0;
  const rawProximo = wo.mantenimiento?.proximoKmService;
  if (rawProximo && ultimoKm > 0 && rawProximo > ultimoKm) {
    const diff = rawProximo - ultimoKm;
    if (diff >= 1000 && diff <= 120000) {
      return diff;
    }
  }

  // Default standard interval
  return 10000;
}

/**
 * Resolves the true target "Próximo Service (km)" given last service mileage,
 * explicit target or current km, and interval.
 *
 * Supports both signatures:
 * - resolveProximoKm(ultimoKm, rawProximo, intervalo) [3 args, used in UI]
 * - resolveProximoKm(ultimoKm, kmActuales, rawProximo, intervalo) [4 args]
 */
export function resolveProximoKm(
  ultimoKm: number,
  arg2?: number,
  arg3?: number,
  arg4?: number
): number {
  let rawProximo: number | undefined;
  let intervalo = 10000;

  if (arg4 !== undefined) {
    // 4 arguments: (ultimoKm, kmActuales, rawProximo, intervalo)
    rawProximo = arg3 !== undefined && arg3 !== null && !isNaN(Number(arg3)) ? Number(arg3) : undefined;
    intervalo = arg4 && Number(arg4) > 0 ? Number(arg4) : 10000;
  } else {
    // 3 arguments: (ultimoKm, rawProximo, intervalo)
    rawProximo = arg2 !== undefined && arg2 !== null && !isNaN(Number(arg2)) ? Number(arg2) : undefined;
    intervalo = arg3 && Number(arg3) > 0 ? Number(arg3) : 10000;
  }

  // Sanitize interval if stored as thousands multiplier (e.g. 5 -> 5000)
  if (intervalo > 0 && intervalo <= 50) {
    intervalo = intervalo * 1000;
  }
  if (!intervalo || intervalo <= 0) {
    intervalo = 10000;
  }

  // Sanitize rawProximo if stored as e.g. 5 -> 5000
  if (rawProximo !== undefined && rawProximo > 0 && rawProximo <= 50) {
    rawProximo = rawProximo * 1000;
  }

  // Case 1: If rawProximo was specified as a relative delta (e.g. 5000 or <= 50000)
  // while the vehicle mileage at service is greater than that delta
  if (rawProximo && rawProximo > 0 && rawProximo <= 50000 && ultimoKm > rawProximo) {
    // If rawProximo was relative 10000 but the detected interval is 5000
    if (rawProximo === 10000 && intervalo === 5000) {
      return ultimoKm + 5000;
    }
    return ultimoKm + rawProximo;
  }

  // Case 2: If explicit rawProximo target was set and is strictly in the future
  if (rawProximo && rawProximo > ultimoKm) {
    // Reconcile if the detected interval is 5000 km, but rawProximo had the default 10k (+10000)
    if (intervalo === 5000 && (rawProximo - ultimoKm) >= 8000) {
      return ultimoKm + 5000;
    }
    // Reconcile if the detected interval is 7000 km, but rawProximo had +10000
    if (intervalo === 7000 && Math.abs((rawProximo - ultimoKm) - 10000) <= 500) {
      return ultimoKm + 7000;
    }
    return rawProximo;
  }

  // Case 3: Calculate from last service mileage + interval
  if (ultimoKm > 0) {
    return ultimoKm + intervalo;
  }

  return rawProximo && rawProximo > 0 ? rawProximo : intervalo;
}

/**
 * Calculates the time limits in days and months based on service interval in km.
 * Rules requested by user:
 * - 5,000 km -> 6 meses (180 días max, avisa desde 150 días) - Aceite
 * - 7,000 km -> 8 meses (240 días max, avisa desde 210 días) - Aceite Semisintético
 * - 10,000 km -> 12 meses (365 días max, avisa desde 335 días) - Aceite Estándar
 * - 30,000 km -> 12 meses (365 días max, avisa desde 335 días) - Mantenimiento de Inyección
 * - 50,000 km -> 24 meses (730 días max, avisa desde 700 días) - Caja Automática (ATF)
 * - 100,000 km -> 36 meses (1095 días max, avisa desde 1065 días) - Distribución
 */
export function getTimeLimitsForInterval(intervaloKm = 10000): { maxDays: number; dueSoonDays: number; maxMonths: number } {
  const sanitizedKm = (intervaloKm > 0 && intervaloKm <= 50) ? intervaloKm * 1000 : (intervaloKm || 10000);
  if (sanitizedKm <= 5000) {
    return { maxDays: 180, dueSoonDays: 150, maxMonths: 6 };
  }
  if (sanitizedKm <= 7000) {
    return { maxDays: 240, dueSoonDays: 210, maxMonths: 8 };
  }
  if (sanitizedKm <= 10000) {
    return { maxDays: 365, dueSoonDays: 335, maxMonths: 12 };
  }
  if (sanitizedKm <= 30000) {
    return { maxDays: 365, dueSoonDays: 335, maxMonths: 12 };
  }
  if (sanitizedKm <= 50000) {
    return { maxDays: 730, dueSoonDays: 700, maxMonths: 24 };
  }
  // 100,000 km or more
  return { maxDays: 1095, dueSoonDays: 1065, maxMonths: 36 };
}

/**
 * Calculates maintenance reminders from WorkOrders & Clients.
 * Accurately verifies mileage intervals (5,000 km vs 10,000 km) and tracks
 * 'ultimoAviso' on work orders to prevent duplicate notifications.
 */
export function calculateReminders(
  workOrders: WorkOrder[],
  clients: Client[],
  thresholdKm = 1000, // Remind when within thresholdKm
  options?: CalculateRemindersOptions
): MaintenanceReminderItem[] {
  const reminders: MaintenanceReminderItem[] = [];
  const processedVehicleKeys = new Set<string>();

  // Helper to extract timestamp for sorting orders newest-first
  const getOrderTimestamp = (wo: WorkOrder): number => {
    if (wo.fechaIngreso) {
      const t = new Date(wo.fechaIngreso).getTime();
      if (!isNaN(t)) return t;
    }
    if (wo.id && wo.id.startsWith('wo_')) {
      const parsed = Number(wo.id.replace('wo_', ''));
      if (!isNaN(parsed) && parsed > 1000000000000) return parsed;
    }
    return 0;
  };

  // Sort work orders descending (newest first)
  const sortedWorkOrders = [...workOrders].sort((a, b) => getOrderTimestamp(b) - getOrderTimestamp(a));

  // Map to find highest km vehicle info across clients and work orders
  const vehicleMaxKm = new Map<string, number>();
  clients.forEach((c) => {
    c.vehiculos.forEach((v) => {
      const key = (v.patente || '').trim().toUpperCase();
      if (key && key !== 'S/P') {
        const current = vehicleMaxKm.get(key) || 0;
        if ((v.kilometraje || 0) > current) {
          vehicleMaxKm.set(key, v.kilometraje || 0);
        }
      }
    });
  });

  sortedWorkOrders.forEach((wo) => {
    const patente = wo.vehiculo?.patente?.trim().toUpperCase();
    if (patente && patente !== 'S/P') {
      const current = vehicleMaxKm.get(patente) || 0;
      const woKm = wo.vehiculo?.kilometraje || 0;
      if (woKm > current) {
        vehicleMaxKm.set(patente, woKm);
      }
    }
  });

  // Process work orders (newest order first per vehicle)
  sortedWorkOrders.forEach((wo) => {
    const patente = wo.vehiculo?.patente?.trim().toUpperCase() || '';
    const vehicleKey = patente && patente !== 'S/P'
      ? patente
      : `${(wo.clienteNombre || '').toLowerCase().trim()}_${(wo.vehiculo?.marca || '').toLowerCase().trim()}_${(wo.vehiculo?.modelo || '').toLowerCase().trim()}`;

    if (processedVehicleKeys.has(vehicleKey)) return;

    // Extract 'ultimo aviso' timestamp to prevent duplicate notifications
    const ultimoAvisoStr = wo.ultimoAviso || wo.ultimoAvisoWhatsApp;
    let diasDesdeUltimoAviso: number | undefined = undefined;
    let notificadoRecientemente = false;

    if (ultimoAvisoStr) {
      const parsedAvisoIso = parseAndNormalizeDate(ultimoAvisoStr);
      const avisoDate = new Date(parsedAvisoIso);
      if (!isNaN(avisoDate.getTime())) {
        const hoy = new Date();
        const diffMs = hoy.getTime() - avisoDate.getTime();
        diasDesdeUltimoAviso = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
        const minDias = options?.minDiasEntreAvisos ?? 7;
        notificadoRecientemente = diasDesdeUltimoAviso < minDias;
      }
    }

    // If caller specifically requested to omit recently notified orders, skip
    if (options?.soloSinAvisoReciente && notificadoRecientemente) {
      return;
    }

    // Mileage at the time of THIS specific work order / service
    const ultimoKm = wo.vehiculo?.kilometraje || 0;
    // Highest known current mileage for this vehicle across all records
    const kmActuales = Math.max(vehicleMaxKm.get(patente) || 0, ultimoKm);

    // 1. Detect maintenance interval accurately (5.000, 7.000, 10.000, etc.)
    const intervalo = detectServiceInterval(wo);
    const { maxDays, dueSoonDays, maxMonths } = getTimeLimitsForInterval(intervalo);

    const rawProximo = wo.mantenimiento?.proximoKmService;

    // 2. Resolve target next service KM without artificially advancing it when reached
    const proximoKm = resolveProximoKm(ultimoKm, kmActuales, rawProximo, intervalo);

    if (proximoKm <= 0 && kmActuales <= 0) return;

    // 3. Difference: positive = remaining km, zero = exactly reached, negative = overdue/exceeded
    const diferenciaKm = proximoKm - kmActuales;
    
    // Calculate days since this service accurately
    let diasDesdeUltimo = 0;
    if (wo.fechaIngreso) {
      const parsedIso = parseAndNormalizeDate(wo.fechaIngreso);
      const fechaIngresoDate = new Date(parsedIso);
      if (!isNaN(fechaIngresoDate.getTime())) {
        const hoy = new Date();
        const todayZero = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime();
        const ingresoZero = new Date(fechaIngresoDate.getFullYear(), fechaIngresoDate.getMonth(), fechaIngresoDate.getDate()).getTime();
        const diffMs = todayZero - ingresoZero;
        diasDesdeUltimo = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      }
    }

    // 4. Determine reminder status:
    // When thresholdKm is 999999 (used in UI to view all reminders), we use a standard threshold
    // proportional to the service interval: e.g. 1.000 km for 5.000 km services, 1.500 km for 10.000 km services.
    const effectiveKmThreshold = thresholdKm < 999999
      ? thresholdKm
      : (intervalo <= 5000 ? 1000 : 1500);

    let estadoRecordatorio: 'overdue' | 'due_soon' | 'upcoming' = 'upcoming';

    if (diferenciaKm <= 0 || (diasDesdeUltimo > 0 && diasDesdeUltimo >= maxDays)) {
      estadoRecordatorio = 'overdue';
    } else if (diferenciaKm <= effectiveKmThreshold || (diasDesdeUltimo > 0 && diasDesdeUltimo >= dueSoonDays)) {
      estadoRecordatorio = 'due_soon';
    } else {
      estadoRecordatorio = 'upcoming';
    }

    processedVehicleKeys.add(vehicleKey);
    reminders.push({
      clientId: wo.clienteId,
      clientNombre: wo.clienteNombre || 'Cliente',
      clientTelefono: wo.clienteTelefono || '',
      vehiculo: wo.vehiculo,
      ultimoServiceKm: ultimoKm,
      ultimoServiceFecha: wo.fechaIngreso,
      proximoKmService: proximoKm,
      kmActuales,
      diferenciaKm,
      diasDesdeUltimoService: diasDesdeUltimo,
      intervaloKm: intervalo,
      maxMesesService: maxMonths,
      maxDiasService: maxDays,
      estadoRecordatorio,
      ordenTrabajoId: wo.id,
      notasService: wo.mantenimiento?.notasService || wo.fallaReportada,
      ultimoAviso: ultimoAvisoStr,
      diasDesdeUltimoAviso,
      notificadoRecientemente,
    });
  });

  // Also scan Clients with vehicles not covered in work orders (check against 5,000 km intervals)
  clients.forEach((c) => {
    c.vehiculos.forEach((v) => {
      const patente = v.patente?.trim().toUpperCase() || '';
      const vehicleKey = patente && patente !== 'S/P' ? patente : `${(c.nombre || '').toLowerCase().trim()}_${(v.marca || '').toLowerCase().trim()}_${(v.modelo || '').toLowerCase().trim()}`;

      if (processedVehicleKeys.has(vehicleKey)) return;

      const kmActuales = v.kilometraje || 0;
      if (kmActuales > 0) {
        // Standard check using 5,000 km intervals (so 5k oil changes are properly alerted)
        const interval = 5000;
        const nextTarget = Math.ceil((kmActuales + 1) / interval) * interval;
        const diff = nextTarget - kmActuales;
        const { maxDays, maxMonths } = getTimeLimitsForInterval(interval);

        if (diff <= thresholdKm && diff > 0) {
          processedVehicleKeys.add(vehicleKey);
          reminders.push({
            clientId: c.id,
            clientNombre: c.nombre,
            clientTelefono: c.telefono,
            vehiculo: v,
            ultimoServiceKm: Math.max(0, kmActuales - (interval - diff)),
            ultimoServiceFecha: '',
            proximoKmService: nextTarget,
            kmActuales,
            diferenciaKm: diff,
            diasDesdeUltimoService: 0,
            intervaloKm: interval,
            maxMesesService: maxMonths,
            maxDiasService: maxDays,
            estadoRecordatorio: diff <= 500 ? 'due_soon' : 'upcoming',
          });
        }
      }
    });
  });

  // Sort by urgency: overdue first, then nearest service
  return reminders.sort((a, b) => {
    if (a.estadoRecordatorio === 'overdue' && b.estadoRecordatorio !== 'overdue') return -1;
    if (a.estadoRecordatorio !== 'overdue' && b.estadoRecordatorio === 'overdue') return 1;
    return a.diferenciaKm - b.diferenciaKm;
  });
}

/**
 * Builds standard Spanish WhatsApp message text
 */
export function buildWhatsAppMessage(
  reminder: MaintenanceReminderItem,
  tallerNombre = 'MiTaller Mecánico',
  customNote?: string
): string {
  const vehiculoDesc = `${reminder.vehiculo.marca} ${reminder.vehiculo.modelo} ${reminder.vehiculo.patente ? `(${reminder.vehiculo.patente})` : ''}`.trim();

  let kmInfo = '';
  if (reminder.diferenciaKm === 0) {
    kmInfo = `ha alcanzado exactamente su kilometraje programado de mantenimiento (${reminder.proximoKmService.toLocaleString('es-PY')} km).`;
  } else if (reminder.diferenciaKm < 0) {
    kmInfo = `ha superado por ${Math.abs(reminder.diferenciaKm).toLocaleString('es-PY')} km su mantenimiento programado de ${reminder.proximoKmService.toLocaleString('es-PY')} km (Kilometraje actual: ${reminder.kmActuales.toLocaleString('es-PY')} km).`;
  } else {
    kmInfo = `se encuentra a solo ${reminder.diferenciaKm.toLocaleString('es-PY')} km de cumplir su próximo mantenimiento de ${reminder.proximoKmService.toLocaleString('es-PY')} km (Kilometraje actual: ${reminder.kmActuales.toLocaleString('es-PY')} km).`;
  }

  let text = `👋 Hola *${reminder.clientNombre}*, le saludamos de *${tallerNombre}*.\n\n`;
  text += `🚗 Le recordamos que su vehículo *${vehiculoDesc}* ${kmInfo}\n\n`;
  text += `💡 *Mantenimiento recomendado:* Cambio de aceite de motor (${reminder.intervaloKm?.toLocaleString('es-PY') || '5.000'} km), filtros y revisión preventiva general para garantizar el óptimo funcionamiento y vida útil de su motor.\n\n`;
  
  if (customNote) {
    text += `📝 *Nota adicional:* ${customNote}\n\n`;
  }

  text += `📲 ¿Le gustaría agendar un turno para esta semana? Responda a este mensaje y con gusto le reservamos un horario. ¡Muchas gracias!`;

  return text;
}

/**
 * Creates wa.me URL link for direct WhatsApp web/app sending
 */
export function getWhatsAppWebLink(
  reminder: MaintenanceReminderItem,
  tallerNombre = 'MiTaller Mecánico',
  customNote?: string
): string {
  const phone = formatWhatsAppPhone(reminder.clientTelefono);
  const message = buildWhatsAppMessage(reminder, tallerNombre, customNote);
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

/**
 * Simulates or sends via Twilio API endpoint proxy if configured
 */
export async function sendTwilioWhatsAppNotification(
  reminder: MaintenanceReminderItem,
  twilioConfig: TwilioConfig,
  tallerNombre = 'MiTaller Mecánico'
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const phone = formatWhatsAppPhone(reminder.clientTelefono);
  const text = buildWhatsAppMessage(reminder, tallerNombre);

  if (!phone) {
    return { success: false, error: 'El cliente no posee un número de teléfono válido.' };
  }

  // Check if Twilio config is available
  if (twilioConfig.accountSid && twilioConfig.authToken && twilioConfig.fromPhoneNumber) {
    try {
      const response = await fetch('/api/notifications/twilio-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: `whatsapp:+${phone}`,
          from: twilioConfig.fromPhoneNumber,
          body: text,
          accountSid: twilioConfig.accountSid,
          authToken: twilioConfig.authToken,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.message || `HTTP ${response.status}`);
      }

      const resData = await response.json();
      return { success: true, messageId: resData.sid || 'sent' };
    } catch (err: any) {
      console.warn('Twilio API call fallback to WhatsApp Web:', err);
      // Fallback
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
      return { success: true, messageId: 'web_fallback' };
    }
  } else {
    // Open direct WhatsApp Web if no server key is set
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
    return { success: true, messageId: 'wa_web_direct' };
  }
}
