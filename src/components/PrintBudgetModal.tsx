import { Budget } from '../types/tallerya';
import { Printer, Wrench, Check, ShieldCheck, Phone, MapPin, Mail } from 'lucide-react';

interface PrintBudgetModalProps {
  budget: Budget;
  onClose: () => void;
}

export function PrintBudgetModal({ budget, onClose }: PrintBudgetModalProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-8 space-y-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 my-8">
        {/* Action Controls Header (Hidden during print) */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4 print:hidden">
          <div className="flex items-center gap-2 text-slate-900 font-bold">
            <Printer className="w-5 h-5 text-amber-500" />
            <span>Vista Previa del Presupuesto</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              Imprimir / Guardar PDF
            </button>
            <button
              onClick={onClose}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>

        {/* PRINTABLE SHEET CONTENT */}
        <div className="space-y-6 text-slate-900 print:text-black">
          {/* Workshop Header */}
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-amber-500 text-slate-950 font-black rounded-lg flex items-center justify-center">
                  <Wrench className="w-5 h-5" />
                </div>
                <h1 className="text-2xl font-extrabold tracking-tight"><span className="text-amber-500">Mi</span>Taller</h1>
              </div>
              <p className="text-xs font-bold text-slate-600">Servicios Mecánicos y Diagnóstico Computarizado</p>
              <div className="text-[11px] text-slate-500 space-y-0.5 pt-1">
                <p className="flex items-center gap-1"><MapPin className="w-3 h-3 text-slate-400" /> Av. Libertador 4500, CABA</p>
                <p className="flex items-center gap-1"><Phone className="w-3 h-3 text-slate-400" /> Tel / WhatsApp: +54 9 11 4522-8901</p>
                <p className="flex items-center gap-1"><Mail className="w-3 h-3 text-slate-400" /> mecanicadakar@gmail.com</p>
              </div>
            </div>

            <div className="text-right space-y-1">
              <span className="px-3 py-1 bg-amber-100 text-amber-900 font-mono font-bold text-xs rounded-md border border-amber-300 inline-block">
                {budget.numeroPresupuesto}
              </span>
              <p className="text-xs text-slate-500">Fecha: {budget.fecha}</p>
              <p className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block">
                Validez: 10 días hábiles
              </p>
            </div>
          </div>

          {/* Client & Vehicle Info Card */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
            <div>
              <p className="font-bold text-slate-500 uppercase text-[10px] tracking-wider">Cliente</p>
              <p className="font-bold text-slate-900 text-sm mt-0.5">{budget.clienteNombre}</p>
              <p className="text-slate-600">Teléfono: {budget.clienteTelefono}</p>
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
            <div className="flex items-center gap-2 text-slate-700 font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Garantía de 3 meses en repuestos originales y mano de obra.</span>
            </div>

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
