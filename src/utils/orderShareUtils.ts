import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { WorkOrder, OrderStatus } from '../types/tallerya';
import { formatDateSpanish } from './dateUtils';

const STATUS_LABELS: Record<OrderStatus, string> = {
  ingresado: '🔵 Ingresado',
  diagnostico: '🔵 Ingresado (En Diagnóstico)',
  reparacion: '🟡 En Reparación',
  repuestos: '🟡 En Reparación (Esp. Repuestos)',
  listo: '🟢 Listo para Entrega',
  entregado: '🟢 Entregado',
};

export interface OrderPartItem {
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  servicioDescripcion?: string;
}

export interface OrderFinancialSummary {
  servicios: { descripcion: string; costoManoObra: number }[];
  repuestos: OrderPartItem[];
  totalManoObra: number;
  totalRepuestos: number;
  totalGeneral: number;
}

/**
 * Extracts and disaggregates labor items, spare parts, and monetary totals
 * from any WorkOrder structure, handling nested and root-level parts defensively.
 */
export function extractOrderFinancials(order: Partial<WorkOrder>): OrderFinancialSummary {
  const rawServices = order.servicios || [];
  const repuestosList: OrderPartItem[] = [];
  const serviciosList: { descripcion: string; costoManoObra: number }[] = [];

  rawServices.forEach((s) => {
    const costoMO = Number(s.costoManoObra || 0);
    const desc = s.descripcion?.trim() || '';
    const isGenericPartContainer =
      desc.toLowerCase() === 'repuestos e insumos' ||
      desc.toLowerCase() === 'repuestos' ||
      desc.toLowerCase() === 'insumos';

    if (costoMO > 0 || (!isGenericPartContainer && desc.length > 0)) {
      serviciosList.push({
        descripcion: desc || 'Servicio Técnico',
        costoManoObra: costoMO,
      });
    }

    if (Array.isArray(s.repuestosUtilizados)) {
      s.repuestosUtilizados.forEach((r: any) => {
        const nombre = r.nombreRepuesto || r.nombre || r.repuestoNombre || r.descripcion || 'Repuesto';
        const cantidad = Math.max(1, Number(r.cantidad || r.cant || r.qty || 1));
        const precioUnitario = Number(r.precioUnitario || r.precio || r.precioVenta || r.costo || 0);
        repuestosList.push({
          nombre,
          cantidad,
          precioUnitario,
          subtotal: cantidad * precioUnitario,
          servicioDescripcion: desc,
        });
      });
    }
  });

  // Check if root-level repuestos exist (legacy or imported structures)
  const rootRepuestos = (order as any).repuestosUtilizados || (order as any).repuestos;
  if (Array.isArray(rootRepuestos)) {
    rootRepuestos.forEach((r: any) => {
      const nombre = r.nombreRepuesto || r.nombre || r.repuestoNombre || r.descripcion || 'Repuesto';
      const cantidad = Math.max(1, Number(r.cantidad || r.cant || r.qty || 1));
      const precioUnitario = Number(r.precioUnitario || r.precio || r.precioVenta || r.costo || 0);
      const alreadyExists = repuestosList.some(
        (p) => p.nombre.toLowerCase() === nombre.toLowerCase() && p.cantidad === cantidad && p.precioUnitario === precioUnitario
      );
      if (!alreadyExists) {
        repuestosList.push({
          nombre,
          cantidad,
          precioUnitario,
          subtotal: cantidad * precioUnitario,
        });
      }
    });
  }

  // If there were services registered but all had cost 0 and were filtered out, preserve them
  if (serviciosList.length === 0 && rawServices.length > 0 && repuestosList.length === 0) {
    rawServices.forEach((s) => {
      serviciosList.push({
        descripcion: s.descripcion || 'Servicio Técnico',
        costoManoObra: Number(s.costoManoObra || 0),
      });
    });
  }

  const totalManoObra = serviciosList.reduce((acc, s) => acc + s.costoManoObra, 0);
  const totalRepuestos = repuestosList.reduce((acc, r) => acc + r.subtotal, 0);
  const totalGeneral = Number(order.totalEstimado) || (totalManoObra + totalRepuestos);

  return {
    servicios: serviciosList,
    repuestos: repuestosList,
    totalManoObra,
    totalRepuestos,
    totalGeneral,
  };
}

/**
 * Downloads a high-quality PDF document for a Work Order.
 */
export function downloadOrderPDF(order: WorkOrder) {
  const doc = new jsPDF();

  const numeroOrden = order.numeroOrden || 'OT';
  const patente = (order.vehiculo?.patente || '').toUpperCase();
  const clienteNombre = order.clienteNombre || 'Cliente Contado';
  const clienteTelefono = order.clienteTelefono || 'Sin registrar';
  const mecanico = order.mecanicoAsignado || 'No asignado';
  const marca = order.vehiculo?.marca || '';
  const modelo = order.vehiculo?.modelo || '';
  const anio = order.vehiculo?.anio || '';
  const kilometraje = order.vehiculo?.kilometraje || 0;
  const nivelCombustible = order.vehiculo?.nivelCombustible || '1/2';
  const fechaIngreso = order.fechaIngreso || new Date().toISOString();
  const fallaReportada = order.fallaReportada || '';
  const diagnostico = order.diagnosticoTecnico || '';
  const servicios = order.servicios || [];

  // Calculate totals
  const totalManoObra = servicios.reduce((acc, s) => acc + (s.costoManoObra || 0), 0);
  const totalRepuestos = servicios.reduce((acc, s) => {
    const costRep = (s.repuestosUtilizados || []).reduce((rAcc, r) => rAcc + (r.precioUnitario * r.cantidad), 0);
    return acc + costRep;
  }, 0);
  const totalGeneral = order.totalEstimado || (totalManoObra + totalRepuestos);

  // Header Banner (Slate-900)
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 32, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('MI TALLER - ORDEN DE TRABAJO', 14, 18);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(245, 158, 11); // Amber
  doc.text(`N° ORDEN: ${numeroOrden}`, 14, 26);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text(`Fecha: ${formatDateSpanish(fechaIngreso)}`, 140, 26);

  let currentY = 40;

  // Client & Vehicle Details Box
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, currentY, 182, 38, 3, 3, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('DATOS DEL CLIENTE Y VEHÍCULO', 18, currentY + 8);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);

  // Col 1: Cliente
  doc.text(`Cliente: ${clienteNombre}`, 18, currentY + 16);
  doc.text(`Teléfono: ${clienteTelefono}`, 18, currentY + 23);
  doc.text(`Mecánico: ${mecanico}`, 18, currentY + 30);

  // Col 2: Vehículo
  doc.text(`Vehículo: ${marca} ${modelo} ${anio ? `(${anio})` : ''}`, 110, currentY + 16);
  doc.text(`Patente / Dominio: ${patente}`, 110, currentY + 23);
  doc.text(`Km: ${kilometraje ? `${Number(kilometraje).toLocaleString('es-AR')} km` : 'S/D'}  |  Combust: ${nivelCombustible}`, 110, currentY + 30);

  currentY += 44;

  // Diagnostics Box
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(14, currentY, 182, 30, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('MOTIVO DE INGRESO / FALLA REPORTADA:', 18, currentY + 7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  const fallaLines = doc.splitTextToSize(fallaReportada || 'Sin observaciones registradas.', 174);
  doc.text(fallaLines, 18, currentY + 13);

  if (diagnostico) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('DIAGNÓSTICO TÉCNICO:', 18, currentY + 20);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    const diagLines = doc.splitTextToSize(diagnostico, 174);
    doc.text(diagLines, 18, currentY + 25);
  }

  currentY += 36;

  // Services & Spare Parts Table
  const tableData = servicios.map((serv, index) => {
    const repuestosNombres = serv.repuestosUtilizados && serv.repuestosUtilizados.length > 0
      ? serv.repuestosUtilizados.map(r => `${r.nombreRepuesto} (x${r.cantidad})`).join(', ')
      : 'Sin repuestos';

    const costoRep = (serv.repuestosUtilizados || []).reduce((acc, r) => acc + (r.precioUnitario * r.cantidad), 0);
    const subtotal = (serv.costoManoObra || 0) + costoRep;

    return [
      `#${index + 1} - ${serv.descripcion}`,
      repuestosNombres,
      `$${(serv.costoManoObra || 0).toLocaleString('es-AR')}`,
      `$${costoRep.toLocaleString('es-AR')}`,
      `$${subtotal.toLocaleString('es-AR')}`
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [['Servicio / Trabajo Realizado', 'Repuestos Utilizados', 'M. Obra', 'Repuestos', 'Subtotal']],
    body: tableData.length > 0 ? tableData : [['Sin servicios registrados', '-', '$0', '$0', '$0']],
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [51, 65, 85],
    },
    columnStyles: {
      0: { cellWidth: 65 },
      1: { cellWidth: 50 },
      2: { cellWidth: 22, halign: 'right' },
      3: { cellWidth: 22, halign: 'right' },
      4: { cellWidth: 23, halign: 'right' },
    },
    margin: { left: 14, right: 14 },
  });

  const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 8 : currentY + 40;

  // Cost Summary Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(120, finalY, 76, 32, 3, 3, 'FD');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Total Mano de Obra:`, 124, finalY + 8);
  doc.text(`$${totalManoObra.toLocaleString('es-AR')}`, 192, finalY + 8, { align: 'right' });

  doc.text(`Total Repuestos:`, 124, finalY + 15);
  doc.text(`$${totalRepuestos.toLocaleString('es-AR')}`, 192, finalY + 15, { align: 'right' });

  doc.setDrawColor(203, 213, 225);
  doc.line(124, finalY + 18, 192, finalY + 18);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`TOTAL GENERAL:`, 124, finalY + 25);
  doc.setTextColor(217, 119, 6);
  doc.text(`$${totalGeneral.toLocaleString('es-AR')}`, 192, finalY + 25, { align: 'right' });

  // Signatures
  const sigY = Math.min(finalY + 48, 270);
  doc.setDrawColor(148, 163, 184);
  doc.line(25, sigY, 85, sigY);
  doc.line(125, sigY, 185, sigY);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Firma del Cliente', 55, sigY + 5, { align: 'center' });
  doc.text('Firma y Sello del Taller', 155, sigY + 5, { align: 'center' });

  const filename = `Orden_Trabajo_${numeroOrden}_${patente || 'VEHICULO'}.pdf`;
  doc.save(filename);
}

/**
 * Formats a message and opens WhatsApp with the order information.
 */
export function sendOrderWhatsApp(order: WorkOrder) {
  const numeroOrden = order.numeroOrden || 'OT';
  const patente = (order.vehiculo?.patente || '').toUpperCase();
  const marca = order.vehiculo?.marca || '';
  const modelo = order.vehiculo?.modelo || '';
  const estadoLabel = STATUS_LABELS[order.estado] || order.estado;
  const fallaReportada = order.fallaReportada || '';
  const diagnostico = order.diagnosticoTecnico || '';
  const total = order.totalEstimado || 0;
  const clienteTelefono = order.clienteTelefono || '';

  const portalLink = `${window.location.origin}${window.location.pathname}?portal=cliente&patente=${encodeURIComponent(patente)}`;

  let message = `*TALLER MECÁNICO - INFORMACIÓN DE SU ORDEN DE TRABAJO*\n\n`;
  message += `📋 *Orden N°:* ${numeroOrden}\n`;
  message += `🚗 *Vehículo:* ${marca} ${modelo} (${patente})\n`;
  message += `📊 *Estado:* ${estadoLabel}\n`;

  if (fallaReportada) {
    message += `🔧 *Trabajo Solicitado / Falla:* ${fallaReportada}\n`;
  }
  if (diagnostico) {
    message += `🔍 *Diagnóstico Técnico:* ${diagnostico}\n`;
  }
  if (total > 0) {
    message += `💰 *Presupuesto Estimado:* $${total.toLocaleString('es-AR')}\n`;
  }

  message += `\n🔗 *Siga el estado en vivo de su vehículo aquí:* ${portalLink}\n\n`;
  message += `¡Cualquier consulta estamos a su disposición! 🚘`;

  const cleanPhone = clienteTelefono.replace(/\D/g, '');
  let whatsappUrl = '';
  if (cleanPhone && cleanPhone.length >= 8) {
    whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  } else {
    whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
  }

  window.open(whatsappUrl, '_blank');
}
