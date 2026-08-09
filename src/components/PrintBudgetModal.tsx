import React, { useState } from 'react';
import { Budget, Workshop } from '../types/tallerya';
import { Printer, Wrench, ShieldCheck, Phone, MapPin, Mail, Edit3, Save, X, Check, Send, MessageSquare } from 'lucide-react';
import { formatDateSpanish } from '../utils/dateUtils';

interface PrintBudgetModalProps {
  budget: Budget;
  workshop?: Workshop | null;
  onClose: () => void;
}

interface PrintHeaderData {
  nombreTaller: string;
  subtitulo: string;
  direccion: string;
  telefono: string;
  email: string;
  validez: string;
  garantia: string;
}

export function PrintBudgetModal({ budget, workshop, onClose }: PrintBudgetModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Initialize header fields from localStorage or workshop props or defaults
  const [headerData, setHeaderData] = useState<PrintHeaderData>(() => {
    try {
      const saved = localStorage.getItem('mitaller_print_header_data');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {}

    return {
      nombreTaller: workshop?.nombreTaller || 'MiTaller',
      subtitulo: 'Servicios Mecánicos y Diagnóstico Computarizado',
      direccion: workshop?.direccion || 'Av. Libertador 4500, CABA',
      telefono: workshop?.telefono || '+54 9 11 4522-8901',
      email: workshop?.email || 'mecanicadakar@gmail.com',
      validez: '10 días hábiles',
      garantia: 'Garantía de 3 meses en repuestos originales y mano de obra.',
    };
  });

  const handlePrint = () => {
    try {
      const htmlContent = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <title>Presupuesto ${budget.numeroPresupuesto} - ${headerData.nombreTaller}</title>
          <style>
            @page { size: A4; margin: 15mm; }
            body {
              font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              color: #0f172a;
              margin: 0;
              padding: 24px;
              background: #ffffff;
              font-size: 13px;
              line-height: 1.4;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 2px solid #0f172a;
              padding-bottom: 16px;
              margin-bottom: 20px;
            }
            .title {
              font-size: 22px;
              font-weight: 800;
              margin: 0 0 4px 0;
              color: #0f172a;
            }
            .subtitle {
              font-size: 12px;
              font-weight: 600;
              color: #475569;
              margin: 0 0 8px 0;
            }
            .contact-info {
              font-size: 11px;
              color: #475569;
              line-height: 1.5;
            }
            .badge {
              background: #fef3c7;
              color: #78350f;
              padding: 4px 10px;
              border-radius: 6px;
              font-family: monospace;
              font-weight: bold;
              font-size: 13px;
              display: inline-block;
              border: 1px solid #fde68a;
            }
            .info-box {
              display: flex;
              gap: 20px;
              background: #f8fafc;
              padding: 12px 16px;
              border-radius: 8px;
              border: 1px solid #e2e8f0;
              margin-bottom: 20px;
            }
            .info-col { flex: 1; }
            .info-label {
              font-size: 10px;
              font-weight: 700;
              text-transform: uppercase;
              color: #64748b;
              margin-bottom: 2px;
            }
            .info-val { font-weight: 700; font-size: 13px; color: #0f172a; }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            th {
              border-bottom: 2px solid #cbd5e1;
              text-align: left;
              padding: 8px 4px;
              font-size: 10px;
              font-weight: 700;
              text-transform: uppercase;
              color: #475569;
            }
            td {
              border-bottom: 1px solid #e2e8f0;
              padding: 10px 4px;
              font-size: 12px;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: 700; }
            .totals {
              display: flex;
              justify-content: flex-end;
              margin-bottom: 30px;
            }
            .totals-box { width: 240px; }
            .total-row {
              display: flex;
              justify-content: space-between;
              padding: 4px 0;
              font-size: 12px;
            }
            .total-main {
              border-top: 2px solid #0f172a;
              padding-top: 8px;
              margin-top: 6px;
              font-size: 16px;
              font-weight: 900;
              color: #d97706;
            }
            .footer {
              border-top: 1px solid #e2e8f0;
              padding-top: 16px;
              font-size: 11px;
              color: #64748b;
            }
            .signatures {
              display: flex;
              justify-content: space-between;
              margin-top: 60px;
              padding-top: 10px;
            }
            .signature-line {
              width: 200px;
              border-top: 1px solid #cbd5e1;
              text-align: center;
              font-size: 11px;
              color: #94a3b8;
              padding-top: 4px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">${headerData.nombreTaller}</div>
              ${headerData.subtitulo ? `<div class="subtitle">${headerData.subtitulo}</div>` : ''}
              <div class="contact-info">
                ${headerData.direccion ? `<div>📍 ${headerData.direccion}</div>` : ''}
                ${headerData.telefono ? `<div>📞 Tel / WhatsApp: ${headerData.telefono}</div>` : ''}
                ${headerData.email ? `<div>✉️ ${headerData.email}</div>` : ''}
              </div>
            </div>
            <div style="text-align: right;">
              <div class="badge">${budget.numeroPresupuesto}</div>
              <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Fecha: ${formatDateSpanish(budget.fecha)}</div>
              ${headerData.validez ? `<div style="font-size: 11px; color: #047857; margin-top: 4px; font-weight: 600;">Validez: ${headerData.validez}</div>` : ''}
            </div>
          </div>

          <div class="info-box">
            <div class="info-col">
              <div class="info-label">CLIENTE</div>
              <div class="info-val">${budget.clienteNombre}</div>
              ${budget.clienteTelefono ? `<div style="font-size: 12px; color: #475569;">Tel: ${budget.clienteTelefono}</div>` : ''}
            </div>
            <div class="info-col">
              <div class="info-label">VEHÍCULO / DETALLE</div>
              <div class="info-val">${budget.vehiculoInfo}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Descripción</th>
                <th class="text-center" style="width: 60px;">Cant.</th>
                <th class="text-right" style="width: 120px;">Precio Unit.</th>
                <th class="text-right" style="width: 120px;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${budget.items
                .map(
                  (it) => `
                <tr>
                  <td>${it.descripcion}</td>
                  <td class="text-center">${it.cantidad}</td>
                  <td class="text-right">$${(it.precioUnitario || 0).toLocaleString('es-AR')}</td>
                  <td class="text-right font-bold">$${(it.subtotal || (it.cantidad * it.precioUnitario)).toLocaleString('es-AR')}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>

          <div class="totals">
            <div class="totals-box">
              ${
                budget.descuento > 0
                  ? `<div class="total-row"><span>Descuento:</span><span style="color: #047857; font-weight: bold;">-$${budget.descuento.toLocaleString('es-AR')}</span></div>`
                  : ''
              }
              <div class="total-row total-main">
                <span>TOTAL ESTIMADO:</span>
                <span>$${budget.total.toLocaleString('es-AR')}</span>
              </div>
            </div>
          </div>

          <div class="footer">
            ${headerData.garantia ? `<div style="margin-bottom: 20px; font-weight: 600; color: #334155;">🛡️ ${headerData.garantia}</div>` : ''}
            <div class="signatures">
              <div class="signature-line">Firma del Cliente</div>
              <div class="signature-line">Firma del Taller</div>
            </div>
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 250);
            };
          </script>
        </body>
        </html>
      `;

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(htmlContent);
        printWindow.document.close();
      } else {
        window.print();
      }
    } catch (e) {
      window.print();
    }
  };

  const handleSendWhatsApp = () => {
    const itemsList = budget.items
      .map(
        (it) =>
          `• ${it.descripcion} (x${it.cantidad}) - $${(
            it.subtotal || it.cantidad * it.precioUnitario
          ).toLocaleString('es-AR')}`
      )
      .join('\n');

    let text = `📋 *PRESUPUESTO ${budget.numeroPresupuesto}*\n`;
    text += `🏬 *${headerData.nombreTaller}*\n`;
    if (headerData.direccion) text += `📍 ${headerData.direccion}\n`;
    if (headerData.telefono) text += `📞 Tel/WA: ${headerData.telefono}\n`;
    text += `\n👤 *Cliente:* ${budget.clienteNombre}\n`;
    text += `🚗 *Vehículo:* ${budget.vehiculoInfo}\n`;
    text += `📅 *Fecha:* ${formatDateSpanish(budget.fecha)}\n`;
    if (headerData.validez) text += `⏳ *Validez:* ${headerData.validez}\n`;
    text += `\n🛠️ *DETALLE DE SERVICIOS Y REPUESTOS:*\n${itemsList}\n`;
    if (budget.descuento > 0) {
      text += `\n🏷️ *Descuento:* -$${budget.descuento.toLocaleString('es-AR')}\n`;
    }
    text += `\n💰 *TOTAL ESTIMADO:* *$${budget.total.toLocaleString('es-AR')}*\n`;
    if (headerData.garantia) {
      text += `\n🛡️ *Garantía:* ${headerData.garantia}\n`;
    }
    text += `\n¡Quedamos a su disposición para coordinar los trabajos!`;

    const encodedText = encodeURIComponent(text);
    const cleanPhone = budget.clienteTelefono ? budget.clienteTelefono.replace(/[^0-9]/g, '') : '';
    const waUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodedText}` : `https://wa.me/?text=${encodedText}`;

    window.open(waUrl, '_blank');
  };

  const handleSaveHeaderData = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      localStorage.setItem('mitaller_print_header_data', JSON.stringify(headerData));

      // Also update workshop profile in localStorage if available
      const savedProfile = localStorage.getItem('mitaller_workshop_profile');
      if (savedProfile) {
        const parsed = JSON.parse(savedProfile);
        parsed.nombreTaller = headerData.nombreTaller;
        parsed.direccion = headerData.direccion;
        parsed.telefono = headerData.telefono;
        parsed.email = headerData.email;
        localStorage.setItem('mitaller_workshop_profile', JSON.stringify(parsed));
      }
    } catch (err) {}

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
    setIsEditing(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200 my-8">
        {/* Action Controls Header (Hidden during print) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-4 gap-3 print:hidden">
          <div className="flex items-center gap-2 text-slate-900 font-bold">
            <Printer className="w-5 h-5 text-amber-500" />
            <span>Vista Previa del Presupuesto</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className={`px-3 py-2 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors border ${
                isEditing
                  ? 'bg-amber-500 text-slate-950 border-amber-400'
                  : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
              }`}
            >
              <Edit3 className="w-4 h-4" />
              {isEditing ? 'Cerrar Edición' : 'Editar Datos del Taller'}
            </button>

            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Enviar presupuesto detallado por WhatsApp"
            >
              <Send className="w-4 h-4 text-emerald-200" />
              Enviar WhatsApp
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              Imprimir / Guardar PDF
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>

        {/* Feedback message */}
        {savedSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 print:hidden">
            <Check className="w-4 h-4 text-emerald-600" />
            ¡Datos del taller guardados exitosamente para futuras impresiones!
          </div>
        )}

        {/* EDIT FORM PANEL (Hidden during print) */}
        {isEditing && (
          <form onSubmit={handleSaveHeaderData} className="bg-slate-50 border border-amber-200 p-4 rounded-xl space-y-3 print:hidden text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <Edit3 className="w-4 h-4 text-amber-600" />
                Personalizar Datos del Taller en la Hoja
              </span>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nombre del Taller</label>
                <input
                  type="text"
                  value={headerData.nombreTaller}
                  onChange={(e) => setHeaderData({ ...headerData, nombreTaller: e.target.value })}
                  placeholder="Ej. Mecánica Dakar"
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Subtítulo / Especialidad</label>
                <input
                  type="text"
                  value={headerData.subtitulo}
                  onChange={(e) => setHeaderData({ ...headerData, subtitulo: e.target.value })}
                  placeholder="Ej. Servicios Mecánicos y Diagnóstico Computarizado"
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Dirección</label>
                <input
                  type="text"
                  value={headerData.direccion}
                  onChange={(e) => setHeaderData({ ...headerData, direccion: e.target.value })}
                  placeholder="Ej. Av. Libertador 4500, CABA"
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Teléfono / WhatsApp</label>
                <input
                  type="text"
                  value={headerData.telefono}
                  onChange={(e) => setHeaderData({ ...headerData, telefono: e.target.value })}
                  placeholder="Ej. +54 9 11 4522-8901"
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Email del Taller</label>
                <input
                  type="email"
                  value={headerData.email}
                  onChange={(e) => setHeaderData({ ...headerData, email: e.target.value })}
                  placeholder="Ej. mecanicadakar@gmail.com"
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Validez del Presupuesto</label>
                <input
                  type="text"
                  value={headerData.validez}
                  onChange={(e) => setHeaderData({ ...headerData, validez: e.target.value })}
                  placeholder="Ej. 10 días hábiles"
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Texto de Garantía / Términos</label>
              <input
                type="text"
                value={headerData.garantia}
                onChange={(e) => setHeaderData({ ...headerData, garantia: e.target.value })}
                placeholder="Ej. Garantía de 3 meses en repuestos originales y mano de obra."
                className="w-full p-2 bg-white border border-slate-200 rounded-lg"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="submit"
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Save className="w-4 h-4" />
                Guardar Datos del Taller
              </button>
            </div>
          </form>
        )}

        {/* PRINTABLE SHEET CONTENT */}
        <div className="printable-area space-y-6 text-slate-900 print:text-black">
          {/* Workshop Header */}
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6">
            <div className="space-y-1 max-w-[65%]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-amber-500 text-slate-950 font-black rounded-lg flex items-center justify-center shrink-0">
                  <Wrench className="w-5 h-5" />
                </div>
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
                  {headerData.nombreTaller}
                </h1>
              </div>
              {headerData.subtitulo && (
                <p className="text-xs font-bold text-slate-600">{headerData.subtitulo}</p>
              )}
              <div className="text-[11px] text-slate-500 space-y-0.5 pt-1">
                {headerData.direccion && (
                  <p className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                    {headerData.direccion}
                  </p>
                )}
                {headerData.telefono && (
                  <p className="flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                    Tel / WhatsApp: {headerData.telefono}
                  </p>
                )}
                {headerData.email && (
                  <p className="flex items-center gap-1">
                    <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                    {headerData.email}
                  </p>
                )}
              </div>
            </div>

            <div className="text-right space-y-1">
              <span className="px-3 py-1 bg-amber-100 text-amber-900 font-mono font-bold text-xs rounded-md border border-amber-300 inline-block">
                {budget.numeroPresupuesto}
              </span>
              <p className="text-xs text-slate-500">Fecha: {formatDateSpanish(budget.fecha)}</p>
              {headerData.validez && (
                <p className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block">
                  Validez: {headerData.validez}
                </p>
              )}
            </div>
          </div>

          {/* Client & Vehicle Info Card */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
            <div>
              <p className="font-bold text-slate-500 uppercase text-[10px] tracking-wider">Cliente</p>
              <p className="font-bold text-slate-900 text-sm mt-0.5">{budget.clienteNombre}</p>
              {budget.clienteTelefono && (
                <p className="text-slate-600">Teléfono: {budget.clienteTelefono}</p>
              )}
            </div>
            <div>
              <p className="font-bold text-slate-500 uppercase text-[10px] tracking-wider">Vehículo / Detalle</p>
              <p className="font-bold text-slate-900 text-sm mt-0.5">{budget.vehiculoInfo}</p>
            </div>
          </div>

          {/* Items Table */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Detalle de Servicios y Repuestos
            </h4>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-300 text-slate-600 uppercase text-[10px] font-bold">
                  <th className="py-2">Descripción</th>
                  <th className="py-2 text-center w-16">Cant.</th>
                  <th className="py-2 text-right w-28">Precio Unit.</th>
                  <th className="py-2 text-right w-28">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {budget.items.map((item, idx) => (
                  <tr key={idx} className="text-slate-800">
                    <td className="py-2.5 font-medium">{item.descripcion}</td>
                    <td className="py-2.5 text-center">{item.cantidad}</td>
                    <td className="py-2.5 text-right">${item.precioUnitario.toLocaleString('es-AR')}</td>
                    <td className="py-2.5 text-right font-bold">${item.subtotal.toLocaleString('es-AR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Subtotal / Descuento / Total */}
          <div className="border-t-2 border-slate-900 pt-4 flex justify-end">
            <div className="w-64 space-y-1.5 text-xs">
              {budget.descuento > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Descuento aplicado:</span>
                  <span className="font-bold text-emerald-700">-${budget.descuento.toLocaleString('es-AR')}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-extrabold text-slate-950 pt-2 border-t border-slate-200">
                <span>TOTAL ESTIMADO:</span>
                <span className="text-amber-600">${budget.total.toLocaleString('es-AR')}</span>
              </div>
            </div>
          </div>

          {/* Terms & Conditions / Signatures */}
          <div className="pt-6 border-t border-slate-200 text-[11px] text-slate-500 space-y-4">
            {headerData.garantia && (
              <div className="flex items-center gap-2 text-slate-700 font-semibold">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{headerData.garantia}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-12 pt-8 text-center text-slate-400">
              <div className="border-t border-slate-300 pt-2">Firma del Cliente</div>
              <div className="border-t border-slate-300 pt-2">Firma del Taller</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
