import { WorkOrder, Client, Vehicle } from '../types/tallerya';
import { parseAndNormalizeDate, formatDateSpanish } from '../utils/dateUtils';

export type MaintenanceCategory = 'motor' | 'caja' | 'distribucion' | 'general';

export interface MaintenanceReminderItem {
  clientId: string;
  clientNombre: string;
  clientTelefono: string;
  vehiculo: Vehicle;
  // Service date details (requested by user)
  ultimoServiceFecha: string; // ISO date of when service was performed
  ultimoServiceFechaFormateada: string; // e.g. 13/05/2026
  ultimoServiceKm: number; // Km in workshop when service was performed
  proximoKmService: number; // Target sticker km
  kmActuales: number; // Highest recorded km in workshop
  diferenciaKm: number; // Reference only
  // Time and months calculation (core user requirement)
  categoriaMantenimiento: MaintenanceCategory;
  tipoServicioEtiqueta: string; // e.g. "Mantenimiento de Motor (5.000 km / 6 meses)" o "Mantenimiento de Caja (24 meses)"
  intervaloMeses: number; // 6 para 5k motor, 12 para 10k motor, 24 para caja
  intervaloKm: number; // 5000, 10000, 50000, etc.
  fechaVencimiento: string; // ISO date of expiration
  fechaVencimientoFormateada: string; // e.g. 13/11/2026
  diasDesdeUltimoService: number; // Days elapsed since service
  mesesDesdeUltimoService: number; // Months elapsed since service
  diasRestantesParaVencer: number; // >0: days until due, <=0: overdue
  mesesRestantesParaVencer: number; // Approximate months remaining/overdue
  maxMesesService?: number; // Backward compatibility
  maxDiasService?: number; // Backward compatibility
  estadoRecordatorio: 'overdue' | 'due_soon' | 'upcoming';
  esMantenimientoCaja: boolean;
  esMantenimientoMotor: boolean;
  // Work order tracking
  ordenTrabajoId?: string;
  notasService?: string;
  ultimoAviso?: string; // Fecha ISO o texto del último aviso enviado
  diasDesdeUltimoAviso?: number; // Días transcurridos desde el último aviso registrado
  notificadoRecientemente?: boolean; // True si ya fue notificado hace pocos días
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
 * Checks if a work order involves gearbox / transmission maintenance.
 */
export function isGearboxService(wo: Partial<WorkOrder>): boolean {
  if (wo.mantenimiento?.aceiteCajaAutomatica || wo.mantenimiento?.filtroCajaATF) {
    return true;
  }
  const corpus = [
    wo.fallaReportada || '',
    wo.diagnosticoTecnico || '',
    wo.mantenimiento?.notasService || '',
    ...(wo.servicios || []).map((s) => s.descripcion || ''),
  ]
    .join(' ')
    .toLowerCase();

  return (
    corpus.includes('caja automatica') ||
    corpus.includes('caja automática') ||
    corpus.includes('caja de cambios') ||
    corpus.includes('caja mecanica') ||
    corpus.includes('caja mecánica') ||
    corpus.includes('aceite de caja') ||
    corpus.includes('fluido de caja') ||
    corpus.includes('filtro atf') ||
    corpus.includes('filtro caja') ||
    corpus.includes('transmision') ||
    corpus.includes('transmisión') ||
    corpus.includes('atf')
  );
}

/**
 * Automatically extracts or resolves the maintenance interval in KM for a work order.
 * Accurately detects and distinguishes 5,000 km (mineral), 7,000 km (semisynthetic),
 * 10,000 km (synthetic), 20,000 km, 50,000 km (ATF), 100,000 km (distribución).
 */
export function detectServiceInterval(wo: Partial<WorkOrder>): number {
  const isCaja = isGearboxService(wo);
  if (isCaja && !wo.mantenimiento?.aceiteMotor && !wo.mantenimiento?.filtroAceite) {
    return 50000;
  }

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
  if (isCaja) {
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
 * Calculates the exact duration in months according to the service type & user rules:
 * - Mantenimiento de Motor 5.000 km -> 6 meses
 * - Mantenimiento de Motor 7.000 km -> 8 meses
 * - Mantenimiento de Motor 10.000 km -> 12 meses
 * - Mantenimiento de Caja (Aceite / Filtro ATF / Transmisión) -> 24 meses (a partir de la fecha realizada)
 * - Distribución -> 36 meses
 */
export function getMonthsForService(intervaloKm = 10000, isCaja = false): number {
  if (isCaja) {
    return 24; // Caja de cambios: 24 meses
  }
  const sanitizedKm = (intervaloKm > 0 && intervaloKm <= 50) ? intervaloKm * 1000 : (intervaloKm || 10000);
  if (sanitizedKm <= 5000) return 6; // 5.000 km -> 6 meses
  if (sanitizedKm <= 7000) return 8; // 7.000 km -> 8 meses
  if (sanitizedKm <= 10000) return 12; // 10.000 km -> 12 meses
  if (sanitizedKm <= 30000) return 12; // 12 meses
  if (sanitizedKm <= 50000) return 24; // 50.000 km (caja/atf) -> 24 meses
  return 36; // 100.000 km -> 36 meses
}

/**
 * Calculates the exact expiration date by adding months to the service date.
 */
export function calculateExpirationDate(fechaRealizadaStr: string, meses: number): Date {
  const parsedIso = parseAndNormalizeDate(fechaRealizadaStr);
  const base = new Date(parsedIso);
  if (isNaN(base.getTime())) {
    const fallback = new Date();
    fallback.setMonth(fallback.getMonth() + meses);
    return fallback;
  }
  const target = new Date(base.getFullYear(), base.getMonth() + meses, base.getDate(), 12, 0, 0);
  return target;
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
 * - 5,000 km -> 6 meses
 * - 7,000 km -> 8 meses
 * - 10,000 km -> 12 meses
 * - 50,000 km / Caja -> 24 meses
 * - 100,000 km -> 36 meses
 */
export function getTimeLimitsForInterval(intervaloKm = 10000): { maxDays: number; dueSoonDays: number; maxMonths: number } {
  const months = getMonthsForService(intervaloKm, false);
  const maxDays = months * 30;
  const dueSoonDays = Math.max(0, maxDays - 30);
  return { maxDays, dueSoonDays, maxMonths: months };
}

/**
 * Calculates maintenance reminders from WorkOrders & Clients.
 *
 * CRITICAL RULE REQUESTED BY USER:
 * Does NOT calculate expiration by kilometers because the workshop cannot know
 * real-life customer mileage once the car leaves.
 *
 * Instead:
 * - Clearly tracks the date the maintenance was performed (fecha del día que se realizó el mantenimiento).
 * - Calculates expiration by MONTHS from that date:
 *   - Motor 5.000 km -> 6 meses
 *   - Motor 10.000 km -> 12 meses
 *   - Caja de cambios (ATF/transmisión) -> 24 meses (a partir de la fecha realizada)
 * - Sets status:
 *   - 'overdue' (Vencido): when the expiration date has passed (días restantes <= 0)
 *   - 'due_soon' (Próximo a Vencer): within 30 days of reaching expiration
 *   - 'upcoming' (Al Día): more than 30 days remaining
 */
export function calculateReminders(
  workOrders: WorkOrder[],
  clients: Client[],
  _thresholdKmIgnored = 1000,
  options?: CalculateRemindersOptions
): MaintenanceReminderItem[] {
  const reminders: MaintenanceReminderItem[] = [];
  const processedVehicleServiceKeys = new Set<string>();

  // Helper to extract timestamp for sorting orders newest-first
  const getOrderTimestamp = (wo: WorkOrder): number => {
    if (wo.fechaIngreso) {
      const t = new Date(parseAndNormalizeDate(wo.fechaIngreso)).getTime();
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

  // Reference date (today at midnight)
  const hoy = new Date();
  const todayZero = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime();

  // Helper to build a reminder item
  const buildReminder = (
    wo: WorkOrder,
    category: MaintenanceCategory,
    isCaja: boolean,
    intervalKm: number,
    intervalMonths: number,
    label: string
  ): MaintenanceReminderItem => {
    const ultimoAvisoStr = wo.ultimoAviso || wo.ultimoAvisoWhatsApp;
    let diasDesdeUltimoAviso: number | undefined = undefined;
    let notificadoRecientemente = false;

    if (ultimoAvisoStr) {
      const parsedAvisoIso = parseAndNormalizeDate(ultimoAvisoStr);
      const avisoDate = new Date(parsedAvisoIso);
      if (!isNaN(avisoDate.getTime())) {
        const diffMs = hoy.getTime() - avisoDate.getTime();
        diasDesdeUltimoAviso = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
        const minDias = options?.minDiasEntreAvisos ?? 7;
        notificadoRecientemente = diasDesdeUltimoAviso < minDias;
      }
    }

    const ultimoKm = wo.vehiculo?.kilometraje || 0;
    const kmActuales = Math.max(vehicleMaxKm.get((wo.vehiculo?.patente || '').trim().toUpperCase()) || 0, ultimoKm);
    const rawProximo = wo.mantenimiento?.proximoKmService;
    const proximoKm = resolveProximoKm(ultimoKm, kmActuales, rawProximo, intervalKm);

    // Service Date (fecha del día que se realizó el mantenimiento)
    const fechaIngresoIso = parseAndNormalizeDate(wo.fechaIngreso);
    const fechaIngresoDate = new Date(fechaIngresoIso);
    const fechaIngresoZero = new Date(
      fechaIngresoDate.getFullYear(),
      fechaIngresoDate.getMonth(),
      fechaIngresoDate.getDate()
    ).getTime();

    const diffMs = todayZero - fechaIngresoZero;
    const diasDesdeUltimoService = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    const mesesDesdeUltimoService = Math.floor(diasDesdeUltimoService / 30);

    // Target expiration date calculated by MONTHS from service date
    const expirationDate = calculateExpirationDate(fechaIngresoIso, intervalMonths);
    const expirationZero = new Date(
      expirationDate.getFullYear(),
      expirationDate.getMonth(),
      expirationDate.getDate()
    ).getTime();

    // Days remaining until expiration (negative means overdue)
    const diffExpirationMs = expirationZero - todayZero;
    const diasRestantesParaVencer = Math.round(diffExpirationMs / (1000 * 60 * 60 * 24));
    const mesesRestantesParaVencer = Math.round(diasRestantesParaVencer / 30);

    // Determine status based strictly on expiration date
    let estadoRecordatorio: 'overdue' | 'due_soon' | 'upcoming' = 'upcoming';
    if (diasRestantesParaVencer <= 0) {
      estadoRecordatorio = 'overdue'; // Plazo vencido
    } else if (diasRestantesParaVencer <= 30) {
      estadoRecordatorio = 'due_soon'; // Vence en los próximos 30 días
    } else {
      estadoRecordatorio = 'upcoming'; // Al día
    }

    return {
      clientId: wo.clienteId,
      clientNombre: wo.clienteNombre || 'Cliente',
      clientTelefono: wo.clienteTelefono || '',
      vehiculo: wo.vehiculo,
      ultimoServiceFecha: fechaIngresoIso,
      ultimoServiceFechaFormateada: formatDateSpanish(fechaIngresoIso),
      ultimoServiceKm: ultimoKm,
      proximoKmService: proximoKm,
      kmActuales,
      diferenciaKm: proximoKm - kmActuales,
      categoriaMantenimiento: category,
      tipoServicioEtiqueta: label,
      intervaloMeses: intervalMonths,
      intervaloKm: intervalKm,
      fechaVencimiento: expirationDate.toISOString(),
      fechaVencimientoFormateada: formatDateSpanish(expirationDate.toISOString()),
      diasDesdeUltimoService,
      mesesDesdeUltimoService,
      diasRestantesParaVencer,
      mesesRestantesParaVencer,
      maxMesesService: intervalMonths,
      maxDiasService: intervalMonths * 30,
      estadoRecordatorio,
      esMantenimientoCaja: isCaja,
      esMantenimientoMotor: !isCaja,
      ordenTrabajoId: wo.id,
      notasService: wo.mantenimiento?.notasService || wo.fallaReportada,
      ultimoAviso: ultimoAvisoStr,
      diasDesdeUltimoAviso,
      notificadoRecientemente,
    };
  };

  // Process work orders
  sortedWorkOrders.forEach((wo) => {
    const patente = wo.vehiculo?.patente?.trim().toUpperCase() || '';
    const baseVehicleKey = patente && patente !== 'S/P'
      ? patente
      : `${(wo.clienteNombre || '').toLowerCase().trim()}_${(wo.vehiculo?.marca || '').toLowerCase().trim()}_${(wo.vehiculo?.modelo || '').toLowerCase().trim()}`;

    const isCaja = isGearboxService(wo);
    const intervalKm = detectServiceInterval(wo);

    // 1. If order has Caja maintenance (avisar a los 24 meses)
    if (isCaja) {
      const cajaKey = `${baseVehicleKey}_caja`;
      if (!processedVehicleServiceKeys.has(cajaKey)) {
        processedVehicleServiceKeys.add(cajaKey);
        const item = buildReminder(
          wo,
          'caja',
          true,
          50000,
          24, // Caja: 24 meses
          'Mantenimiento de Caja (24 meses)'
        );
        if (!options?.soloSinAvisoReciente || !item.notificadoRecientemente) {
          reminders.push(item);
        }
      }
    }

    // 2. Motor maintenance check (5k -> 6 meses, 10k -> 12 meses)
    const motorKey = `${baseVehicleKey}_motor`;
    if (!processedVehicleServiceKeys.has(motorKey)) {
      let motorMonths = 12;
      let motorLabel = 'Mantenimiento de Motor (10.000 km / 12 meses)';
      let motorKm = intervalKm;

      if (intervalKm <= 5000) {
        motorMonths = 6;
        motorLabel = 'Mantenimiento de Motor (5.000 km / 6 meses)';
        motorKm = 5000;
      } else if (intervalKm === 7000) {
        motorMonths = 8;
        motorLabel = 'Mantenimiento de Motor (7.000 km / 8 meses)';
        motorKm = 7000;
      } else if (intervalKm === 100000) {
        motorMonths = 36;
        motorLabel = 'Correa de Distribución (100.000 km / 36 meses)';
        motorKm = 100000;
      }

      processedVehicleServiceKeys.add(motorKey);
      const item = buildReminder(
        wo,
        intervalKm === 100000 ? 'distribucion' : 'motor',
        false,
        motorKm,
        motorMonths,
        motorLabel
      );
      if (!options?.soloSinAvisoReciente || !item.notificadoRecientemente) {
        reminders.push(item);
      }
    }
  });

  // Also include vehicles registered in client records without orders
  clients.forEach((c) => {
    c.vehiculos.forEach((v) => {
      const patente = v.patente?.trim().toUpperCase() || '';
      const baseVehicleKey = patente && patente !== 'S/P'
        ? patente
        : `${(c.nombre || '').toLowerCase().trim()}_${(v.marca || '').toLowerCase().trim()}_${(v.modelo || '').toLowerCase().trim()}`;

      const motorKey = `${baseVehicleKey}_motor`;
      if (processedVehicleServiceKeys.has(motorKey)) return;

      const kmActuales = v.kilometraje || 0;
      if (kmActuales > 0) {
        processedVehicleServiceKeys.add(motorKey);
        // Default standard 6 months for 5.000 km
        const intervalKm = 5000;
        const intervalMonths = 6;
        const expirationDate = new Date();
        expirationDate.setMonth(expirationDate.getMonth() + intervalMonths);

        reminders.push({
          clientId: c.id,
          clientNombre: c.nombre,
          clientTelefono: c.telefono,
          vehiculo: v,
          ultimoServiceFecha: '',
          ultimoServiceFechaFormateada: 'Registro inicial',
          ultimoServiceKm: kmActuales,
          proximoKmService: kmActuales + intervalKm,
          kmActuales,
          diferenciaKm: intervalKm,
          categoriaMantenimiento: 'motor',
          tipoServicioEtiqueta: 'Mantenimiento de Motor (5.000 km / 6 meses)',
          intervaloMeses: intervalMonths,
          intervaloKm: intervalKm,
          fechaVencimiento: expirationDate.toISOString(),
          fechaVencimientoFormateada: formatDateSpanish(expirationDate.toISOString()),
          diasDesdeUltimoService: 0,
          mesesDesdeUltimoService: 0,
          diasRestantesParaVencer: intervalMonths * 30,
          mesesRestantesParaVencer: intervalMonths,
          maxMesesService: intervalMonths,
          maxDiasService: intervalMonths * 30,
          estadoRecordatorio: 'upcoming',
          esMantenimientoCaja: false,
          esMantenimientoMotor: true,
        });
      }
    });
  });

  // Sort by urgency:
  // 1. Overdue first (ordered by most overdue days)
  // 2. Due soon (ordered by nearest expiration)
  // 3. Upcoming
  return reminders.sort((a, b) => {
    if (a.estadoRecordatorio === 'overdue' && b.estadoRecordatorio !== 'overdue') return -1;
    if (a.estadoRecordatorio !== 'overdue' && b.estadoRecordatorio === 'overdue') return 1;
    if (a.estadoRecordatorio === 'due_soon' && b.estadoRecordatorio === 'upcoming') return -1;
    if (a.estadoRecordatorio === 'upcoming' && b.estadoRecordatorio === 'due_soon') return 1;
    return a.diasRestantesParaVencer - b.diasRestantesParaVencer;
  });
}

/**
 * Builds standard Spanish WhatsApp message text with the exact service date
 * and expiration calculated by months.
 */
export function buildWhatsAppMessage(
  reminder: MaintenanceReminderItem,
  tallerNombre = 'MiTaller Mecánico',
  customNote?: string
): string {
  const vehiculoDesc = `${reminder.vehiculo.marca} ${reminder.vehiculo.modelo} ${reminder.vehiculo.patente ? `(${reminder.vehiculo.patente})` : ''}`.trim();
  const fechaRealizada = reminder.ultimoServiceFechaFormateada;
  const fechaVence = reminder.fechaVencimientoFormateada;
  const kmInicial = reminder.ultimoServiceKm > 0 ? `${reminder.ultimoServiceKm.toLocaleString('es-PY')} km` : null;
  const kmProximo = (reminder.proximoKmService || (reminder.ultimoServiceKm > 0 ? reminder.ultimoServiceKm + reminder.intervaloKm : 0));
  const kmProximoStr = kmProximo > 0 ? `${kmProximo.toLocaleString('es-PY')} km` : null;

  let text = `👋 Hola *${reminder.clientNombre}*, le saludamos de *${tallerNombre}*.\n\n`;

  if (reminder.esMantenimientoCaja) {
    text += `🚗 Le informamos sobre el mantenimiento de *caja de cambios* de su vehículo *${vehiculoDesc}*.\n`;
    text += `📅 *Fecha Realizada:* ${fechaRealizada}\n`;
    if (kmInicial) {
      text += `📍 *Km Inicial:* ${kmInicial}\n`;
    }
    if (kmProximoStr) {
      text += `🎯 *Próximo Km:* ${kmProximoStr} (+${reminder.intervaloKm.toLocaleString('es-PY')} km)\n`;
    }
    text += `\n⚙️ *Mantenimiento de Caja de Cambios (Plazo: 24 meses):*\n`;

    if (reminder.diasRestantesParaVencer <= 0) {
      const diasVencido = Math.abs(reminder.diasRestantesParaVencer);
      const mesesVencido = Math.max(1, Math.floor(diasVencido / 30));
      text += `⚠️ *Atención:* El plazo de 24 meses *venció el ${fechaVence}* (hace ${diasVencido} días / aprox. ${mesesVencido} meses).\n`;
    } else if (reminder.diasRestantesParaVencer <= 30) {
      text += `⏳ Su próximo mantenimiento de caja *vence el ${fechaVence}* (en los próximos ${reminder.diasRestantesParaVencer} días).\n`;
    } else {
      text += `📅 Su próximo mantenimiento de caja está programado para el *${fechaVence}* (a los 24 meses).\n`;
    }

    text += `\n💡 La revisión y cambio preventivo de fluido/filtro de caja cada 24 meses es esencial para evitar desgastes de discos, sobrecalentamiento y reparaciones costosas de transmisión.\n\n`;
  } else {
    text += `🚗 Le recordamos los datos del servicio de mantenimiento de su vehículo *${vehiculoDesc}*.\n`;
    text += `📅 *Fecha Realizada:* ${fechaRealizada}\n`;
    if (kmInicial) {
      text += `📍 *Km Inicial:* ${kmInicial}\n`;
    }
    if (kmProximoStr) {
      text += `🎯 *Próximo Km:* ${kmProximoStr} (+${reminder.intervaloKm.toLocaleString('es-PY')} km)\n`;
    }
    text += `\n🛠️ *${reminder.tipoServicioEtiqueta}:*\n`;

    if (reminder.diasRestantesParaVencer <= 0) {
      const diasVencido = Math.abs(reminder.diasRestantesParaVencer);
      const mesesVencido = Math.max(1, Math.floor(diasVencido / 30));
      text += `⚠️ *Atención:* El período de ${reminder.intervaloMeses} meses *venció el ${fechaVence}* (hace ${diasVencido} días / aprox. ${mesesVencido} meses).\n`;
    } else if (reminder.diasRestantesParaVencer <= 30) {
      text += `⏳ Su próximo cambio de aceite y filtros *vence el ${fechaVence}* (en los próximos ${reminder.diasRestantesParaVencer} días).\n`;
    } else {
      text += `📅 Su próximo cambio de aceite y filtros está programado para el *${fechaVence}* (a los ${reminder.intervaloMeses} meses).\n`;
    }

    text += `\n💡 El cambio periódico de aceite y filtros por tiempo (meses) previene la degradación por condensación y oxidación, protegiendo la compresión y vida útil del motor.\n\n`;
  }

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
  customNote?: string,
  customMessageText?: string
): string {
  const phone = formatWhatsAppPhone(reminder.clientTelefono);
  const message = (customMessageText !== undefined && customMessageText.trim() !== '')
    ? customMessageText
    : buildWhatsAppMessage(reminder, tallerNombre, customNote);
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
