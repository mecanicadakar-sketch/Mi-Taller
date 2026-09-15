import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Client, Vehicle, WorkOrder, Workshop, OrderStatus } from '../types/tallerya';
import { formatDateSpanish } from './dateUtils';

const STATUS_LABELS: Record<OrderStatus, string> = {
  ingresado: 'Ingresado',
  diagnostico: 'En Diagnóstico',
  reparacion: 'En Reparación',
  repuestos: 'Esp. Repuestos',
  listo: 'Listo p/ Entrega',
  entregado: 'Entregado',
};

export interface VehicleReportOptions {
  client: Client;
  vehicle: Vehicle;
  workOrders: WorkOrder[];
  workshop?: Workshop | null;
  includeCosts?: boolean;
}

/**
 * Generates and downloads a clean, professional PDF with the complete maintenance history of a vehicle.
 */
export function downloadVehicleHistoryPDF({
  client,
  vehicle,
  workOrders,
  workshop,
  includeCosts = true,
}: VehicleReportOptions) {
  const doc = new jsPDF();
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;

  const tallerNombre = workshop?.nombreTaller || 'MiTaller Mecánico';
  const tallerDireccion = workshop?.direccion
    ? `${workshop.direccion}${workshop.ciudad ? `, ${workshop.ciudad}` : ''}`
    : '';
  const tallerTelefono = workshop?.telefono || '';
  const tallerEmail = workshop?.email || '';

  const vehPatente = (vehicle.patente || '').toUpperCase().trim();
  const vehMarca = vehicle.marca || '';
  const vehModelo = vehicle.modelo || '';
  const vehAnio = vehicle.anio ? String(vehicle.anio) : '';
  const vehKm = vehicle.kilometraje || 0;

  // Filter and sort work orders for this vehicle (chronological from oldest to newest or newest to oldest)
  const vehicleOrders = (workOrders || [])
    .filter((wo) => {
      const woPat = wo.vehiculo?.patente?.toUpperCase().trim() || '';
      return (
        (woPat && vehPatente && woPat === vehPatente) ||
        (wo.vehiculo?.id && vehicle.id && wo.vehiculo.id === vehicle.id)
      );
    })
    .sort((a, b) => new Date(b.fechaIngreso || 0).getTime() - new Date(a.fechaIngreso || 0).getTime());

  const totalInvertido = vehicleOrders.reduce((acc, wo) => acc + (wo.totalEstimado || 0), 0);
  const latestOrder = vehicleOrders[0];
  const earliestOrder = vehicleOrders[vehicleOrders.length - 1];

  // Next service calculation from latest order if present
  const proximoKm = latestOrder?.mantenimiento?.proximoKmService || (vehKm > 0 ? vehKm + 10000 : 0);

  // 1. Header Banner (Slate-900)
  doc.setFillColor(15, 23, 42); // #0f172a
  doc.rect(0, 0, pageWidth, 36, 'F');

  // Workshop Name & Report Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(tallerNombre.toUpperCase(), margin, 16);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(245, 158, 11); // Amber-500
  doc.text('HISTORIAL COMPLETO DE MANTENIMIENTO VEHICULAR', margin, 24);

  // Contact info on top right
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225); // Slate-300
  const topInfoLines = [
    tallerDireccion,
    tallerTelefono ? `Tel: ${tallerTelefono}` : '',
    tallerEmail ? `Email: ${tallerEmail}` : '',
  ].filter(Boolean);

  let topInfoY = 14;
  topInfoLines.forEach((line) => {
    doc.text(line, pageWidth - margin, topInfoY, { align: 'right' });
    topInfoY += 5;
  });

  doc.text(`Fecha de emisión: ${formatDateSpanish(new Date().toISOString())}`, margin, 31);

  let currentY = 42;

  // 2. Client & Vehicle Details (Two Column Card)
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, currentY, pageWidth - margin * 2, 38, 3, 3, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('DATOS DEL VEHÍCULO Y PROPIETARIO', margin + 4, currentY + 7);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);

  // Column 1: Vehicle info
  doc.setFont('helvetica', 'bold');
  doc.text('Vehículo:', margin + 4, currentY + 15);
  doc.setFont('helvetica', 'normal');
  doc.text(`${vehMarca} ${vehModelo} ${vehAnio ? `(${vehAnio})` : ''}`, margin + 22, currentY + 15);

  doc.setFont('helvetica', 'bold');
  doc.text('Patente / Dominio:', margin + 4, currentY + 22);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(180, 83, 9); // Amber-700
  doc.setFont('helvetica', 'bold');
  doc.text(vehPatente || 'SIN PATENTE', margin + 34, currentY + 22);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);

  doc.setFont('helvetica', 'bold');
  doc.text('Kilometraje Actual:', margin + 4, currentY + 29);
  doc.setFont('helvetica', 'normal');
  doc.text(`${vehKm.toLocaleString('es-AR')} km`, margin + 34, currentY + 29);

  // Column 2: Client info
  const col2X = 110;
  doc.setFont('helvetica', 'bold');
  doc.text('Propietario:', col2X, currentY + 15);
  doc.setFont('helvetica', 'normal');
  doc.text(client.nombre || 'Cliente', col2X + 20, currentY + 15);

  doc.setFont('helvetica', 'bold');
  doc.text('Teléfono:', col2X, currentY + 22);
  doc.setFont('helvetica', 'normal');
  doc.text(client.telefono || 'Sin registrar', col2X + 20, currentY + 22);

  doc.setFont('helvetica', 'bold');
  doc.text('Email / Dir:', col2X, currentY + 29);
  doc.setFont('helvetica', 'normal');
  const contactText = [client.email, client.direccion].filter(Boolean).join(' • ') || 'Sin dirección';
  const shortContact = contactText.length > 40 ? contactText.slice(0, 37) + '...' : contactText;
  doc.text(shortContact, col2X + 20, currentY + 29);

  currentY += 42;

  // 3. KPI / Summary Metrics Box
  const kpiBoxWidth = (pageWidth - margin * 2 - 9) / 4;
  const kpiBoxHeight = 18;

  const kpis = [
    { label: 'SERVICIOS TOTALES', value: `${vehicleOrders.length} orden${vehicleOrders.length === 1 ? '' : 'es'}`, color: [15, 23, 42] },
    { label: 'PRIMER SERVICIO', value: earliestOrder ? formatDateSpanish(earliestOrder.fechaIngreso) : 'N/A', color: [71, 85, 105] },
    { label: 'ÚLTIMO SERVICIO', value: latestOrder ? formatDateSpanish(latestOrder.fechaIngreso) : 'N/A', color: [180, 83, 9] },
    {
      label: includeCosts ? 'TOTAL INVERTIDO' : 'PRÓXIMO SERVICE',
      value: includeCosts
        ? `$${totalInvertido.toLocaleString('es-AR')}`
        : (proximoKm ? `${proximoKm.toLocaleString('es-AR')} km` : 'N/A'),
      color: [16, 185, 129],
    },
  ];

  kpis.forEach((kpi, idx) => {
    const boxX = margin + idx * (kpiBoxWidth + 3);
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(boxX, currentY, kpiBoxWidth, kpiBoxHeight, 2, 2, 'FD');

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, boxX + 3, currentY + 6);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.text(kpi.value, boxX + 3, currentY + 13);
  });

  currentY += kpiBoxHeight + 8;

  // 4. Work Orders History Table
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('REGISTRO CRONOLÓGICO DE INTERVENCIONES Y MANTENIMIENTO', margin, currentY);
  currentY += 4;

  const tableHead = includeCosts
    ? [['N° OT / Fecha', 'Kilometraje', 'Motivo / Diagnóstico', 'Servicios y Repuestos Utilizados', 'Mecánico', 'Total']]
    : [['N° OT / Fecha', 'Kilometraje', 'Motivo / Diagnóstico', 'Servicios y Repuestos Utilizados', 'Mecánico', 'Estado']];

  const tableBody = vehicleOrders.map((wo) => {
    const fecha = formatDateSpanish(wo.fechaIngreso);
    const otCol = `${wo.numeroOrden}\n${fecha}`;
    const kmCol = wo.vehiculo?.kilometraje
      ? `${Number(wo.vehiculo.kilometraje).toLocaleString('es-AR')} km`
      : 'S/D';

    // Falla y Diagnostico
    let motivo = wo.fallaReportada ? `Motivo: ${wo.fallaReportada}` : 'Service de rutina';
    if (wo.diagnosticoTecnico) {
      motivo += `\nDiag: ${wo.diagnosticoTecnico}`;
    }

    // Servicios & Repuestos
    const serviciosDesc: string[] = [];
    if (wo.servicios && wo.servicios.length > 0) {
      wo.servicios.forEach((s) => {
        let line = `• ${s.descripcion}`;
        if (s.repuestosUtilizados && s.repuestosUtilizados.length > 0) {
          const partsStr = s.repuestosUtilizados.map((r) => `${r.nombreRepuesto} (x${r.cantidad})`).join(', ');
          line += ` [${partsStr}]`;
        }
        serviciosDesc.push(line);
      });
    }

    // Checklist info
    if (wo.mantenimiento) {
      const checks: string[] = [];
      if (wo.mantenimiento.aceiteMotor) checks.push(`Aceite (${wo.mantenimiento.tipoAceiteMotor || 'Sintético'})`);
      if (wo.mantenimiento.filtroAceite) checks.push('F.Aceite');
      if (wo.mantenimiento.filtroAire) checks.push('F.Aire');
      if (wo.mantenimiento.filtroCombustible) checks.push('F.Combust');
      if (wo.mantenimiento.filtroHabitaculo) checks.push('F.Habitáculo');
      if (checks.length > 0) {
        serviciosDesc.push(`Mantenimiento: ${checks.join(', ')}`);
      }
      if (wo.mantenimiento.proximoKmService) {
        serviciosDesc.push(`Próx. Objetivo: ${wo.mantenimiento.proximoKmService.toLocaleString('es-AR')} km`);
      }
    }

    const servicesStr = serviciosDesc.length > 0 ? serviciosDesc.join('\n') : 'Mantenimiento preventivo general';
    const mecanico = wo.mecanicoAsignado || 'Taller';
    const estado = STATUS_LABELS[wo.estado] || wo.estado;

    if (includeCosts) {
      const totalStr = `$${(wo.totalEstimado || 0).toLocaleString('es-AR')}`;
      return [otCol, kmCol, motivo, servicesStr, mecanico, totalStr];
    } else {
      return [otCol, kmCol, motivo, servicesStr, mecanico, estado];
    }
  });

  if (tableBody.length === 0) {
    tableBody.push([
      'Sin registros',
      '-',
      'No existen órdenes de trabajo registradas para este vehículo.',
      '-',
      '-',
      includeCosts ? '$0' : '-',
    ]);
  }

  autoTable(doc, {
    startY: currentY,
    head: tableHead,
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [51, 65, 85],
      cellPadding: 2.5,
    },
    columnStyles: includeCosts
      ? {
          0: { cellWidth: 26, fontStyle: 'bold', halign: 'center' },
          1: { cellWidth: 20, halign: 'center' },
          2: { cellWidth: 42 },
          3: { cellWidth: 58 },
          4: { cellWidth: 20, halign: 'center' },
          5: { cellWidth: 16, halign: 'right', fontStyle: 'bold' },
        }
      : {
          0: { cellWidth: 28, fontStyle: 'bold', halign: 'center' },
          1: { cellWidth: 22, halign: 'center' },
          2: { cellWidth: 45 },
          3: { cellWidth: 60 },
          4: { cellWidth: 20, halign: 'center' },
          5: { cellWidth: 17, halign: 'center' },
        },
    margin: { left: margin, right: margin },
    didDrawPage: () => {
      // Table fits or breaks across pages
    },
  });

  const lastTableY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 6 : currentY + 60;

  // Next recommendations / Signatures block
  let footerBlockY = lastTableY;
  if (footerBlockY > pageHeight - 45) {
    doc.addPage();
    footerBlockY = 20;
  }

  // Recommended next service summary box
  doc.setDrawColor(245, 158, 11);
  doc.setFillColor(254, 243, 199);
  doc.roundedRect(margin, footerBlockY, pageWidth - margin * 2, 14, 2, 2, 'FD');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(180, 83, 9);
  doc.text('RECOMENDACIÓN TÉCNICA Y PRÓXIMO CONTROL:', margin + 4, footerBlockY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 53, 15);
  const proxText = proximoKm > 0
    ? `Realizar el próximo servicio preventivo a los ${proximoKm.toLocaleString('es-AR')} km o cumplidos 6 a 12 meses desde la última fecha registrada.`
    : 'Realizar revisiones periódicas de fluidos, frenos y neumáticos cada 5.000 a 10.000 km.';
  doc.text(proxText, margin + 4, footerBlockY + 10);

  // Signatures
  let sigY = footerBlockY + 30;
  if (sigY > pageHeight - 20) {
    doc.addPage();
    sigY = 35;
  }

  doc.setDrawColor(148, 163, 184);
  doc.line(margin + 15, sigY, margin + 75, sigY);
  doc.line(pageWidth - margin - 75, sigY, pageWidth - margin - 15, sigY);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Firma / Conformidad del Cliente', margin + 45, sigY + 5, { align: 'center' });
  doc.text(`Firma y Sello: ${tallerNombre}`, pageWidth - margin - 45, sigY + 5, { align: 'center' });

  // Page Numbers across all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Historial Vehicular - ${vehPatente} • Generado por ${tallerNombre} • Página ${i} de ${totalPages}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );
  }

  // Save the PDF
  const filename = `Historial_Mantenimiento_${vehPatente || 'VEHICULO'}.pdf`;
  doc.save(filename);
}
