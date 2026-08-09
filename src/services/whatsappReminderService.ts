import { WorkOrder, Client, Vehicle } from '../types/tallerya';

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
  estadoRecordatorio: 'overdue' | 'due_soon' | 'upcoming';
  ordenTrabajoId?: string;
  notasService?: string;
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
 * Resolves the true target "Próximo Service (km)" given current vehicle km, raw value, and interval.
 */
export function resolveProximoKm(
  baseKm: number,
  rawProximo?: number,
  intervalo = 10000
): number {
  const chosenInterval = (intervalo && intervalo > 0) ? intervalo : 10000;

  if (rawProximo && rawProximo > baseKm) {
    return rawProximo;
  }
  if (rawProximo && rawProximo > 0 && rawProximo <= 50000) {
    return baseKm + rawProximo;
  }
  return baseKm > 0 ? baseKm + chosenInterval : (rawProximo || chosenInterval);
}

/**
 * Calculates maintenance reminders from WorkOrders & Clients
 */
export function calculateReminders(
  workOrders: WorkOrder[],
  clients: Client[],
  thresholdKm = 1000 // Remind when within 1000 km or 180 days
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

    // Mileage at the time of THIS specific work order / service
    const ultimoKm = wo.vehiculo?.kilometraje || 0;
    // Highest known current mileage for this vehicle across all records
    const kmActuales = Math.max(vehicleMaxKm.get(patente) || 0, ultimoKm);

    const rawProximo = wo.mantenimiento?.proximoKmService;
    const intervalo = wo.mantenimiento?.intervaloKm || 10000;

    // Calculate next service target based on last service mileage (ultimoKm)
    const proximoKm = resolveProximoKm(ultimoKm, rawProximo, intervalo);

    if (proximoKm <= 0 && kmActuales <= 0) return;

    const diferenciaKm = proximoKm - kmActuales;
    
    // Calculate days since this service accurately
    let diasDesdeUltimo = 0;
    if (wo.fechaIngreso) {
      const fechaIngresoDate = new Date(wo.fechaIngreso);
      if (!isNaN(fechaIngresoDate.getTime())) {
        const hoy = new Date();
        const todayZero = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime();
        const ingresoZero = new Date(fechaIngresoDate.getFullYear(), fechaIngresoDate.getMonth(), fechaIngresoDate.getDate()).getTime();
        const diffMs = todayZero - ingresoZero;
        diasDesdeUltimo = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      }
    }

    // Determine status
    let estadoRecordatorio: 'overdue' | 'due_soon' | 'upcoming' | null = null;

    if (diferenciaKm <= 0 || diasDesdeUltimo >= 180) {
      estadoRecordatorio = 'overdue';
    } else if (diferenciaKm <= thresholdKm || diasDesdeUltimo >= 150) {
      estadoRecordatorio = 'due_soon';
    }

    if (estadoRecordatorio) {
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
        estadoRecordatorio,
        ordenTrabajoId: wo.id,
        notasService: wo.mantenimiento?.notasService || wo.fallaReportada,
      });
    }
  });

  // Also scan Clients with vehicles not covered in work orders
  clients.forEach((c) => {
    c.vehiculos.forEach((v) => {
      const patente = v.patente?.trim().toUpperCase() || '';
      const vehicleKey = patente && patente !== 'S/P' ? patente : `${(c.nombre || '').toLowerCase().trim()}_${(v.marca || '').toLowerCase().trim()}_${(v.modelo || '').toLowerCase().trim()}`;

      if (processedVehicleKeys.has(vehicleKey)) return;

      const kmActuales = v.kilometraje || 0;
      if (kmActuales > 0) {
        // Assume next service at next multiple of 10,000 km
        const nextTarget = Math.ceil((kmActuales + 1) / 10000) * 10000;
        const diff = nextTarget - kmActuales;

        if (diff <= thresholdKm && diff > 0) {
          processedVehicleKeys.add(vehicleKey);
          reminders.push({
            clientId: c.id,
            clientNombre: c.nombre,
            clientTelefono: c.telefono,
            vehiculo: v,
            ultimoServiceKm: Math.max(0, kmActuales - (10000 - diff)),
            ultimoServiceFecha: '',
            proximoKmService: nextTarget,
            kmActuales,
            diferenciaKm: diff,
            diasDesdeUltimoService: 0,
            estadoRecordatorio: 'due_soon',
          });
        }
      }
    });
  });

  // Sort by urgency (overdue first, then smallest diferenciaKm)
  return reminders.sort((a, b) => a.diferenciaKm - b.diferenciaKm);
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
  if (reminder.diferenciaKm <= 0) {
    kmInfo = `ya ha alcanzado/superado su kilometraje de mantenimiento programado (Próximo objetivo: ${reminder.proximoKmService.toLocaleString('es-PY')} km | Kilometraje actual: ${reminder.kmActuales.toLocaleString('es-PY')} km).`;
  } else {
    kmInfo = `se encuentra a solo ${reminder.diferenciaKm.toLocaleString('es-PY')} km de cumplir su próximo mantenimiento de ${reminder.proximoKmService.toLocaleString('es-PY')} km (Kilometraje actual: ${reminder.kmActuales.toLocaleString('es-PY')} km).`;
  }

  let text = `👋 Hola *${reminder.clientNombre}*, le saludamos de *${tallerNombre}*.\n\n`;
  text += `🚗 Le recordamos que su vehículo *${vehiculoDesc}* ${kmInfo}\n\n`;
  text += `💡 *Mantenimiento recomendado:* Cambio de aceite, filtros y revisión preventiva general para garantizar el óptimo funcionamiento de su vehículo.\n\n`;
  
  if (customNote) {
    text += `📝 *Nota adicional:* ${customNote}\n\n`;
  }

  text += `📲 ¿Le gustaría agendar un turno para esta semana? Responda a este mensaje y con gusto le reservaremos un horario. ¡Muchas gracias!`;

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
