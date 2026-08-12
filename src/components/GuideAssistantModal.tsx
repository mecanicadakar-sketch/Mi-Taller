import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Users,
  ClipboardList,
  Package,
  FileText,
  MessageSquare,
  Building2,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Wrench,
  Car,
  FileSpreadsheet,
  PlusCircle,
  HelpCircle,
  BookOpen
} from 'lucide-react';

interface GuideAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenNewWorkOrder?: () => void;
  onNavigateTab?: (tab: string) => void;
  onOpenAuth?: () => void;
}

export function GuideAssistantModal({
  isOpen,
  onClose,
  onOpenNewWorkOrder,
  onNavigateTab,
  onOpenAuth,
}: GuideAssistantModalProps) {
  const [activeStep, setActiveStep] = useState<number>(0);

  if (!isOpen) return null;

  const steps = [
    {
      id: 'welcome',
      title: '1. Bienvenido a MiTaller',
      subtitle: 'Sistema Integral para Talleres Mecánicos',
      icon: Sparkles,
      iconColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
      content: (
        <div className="space-y-4">
          <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black">
                <Wrench className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-white text-base">¡Tu Taller, 100% Organizado!</h4>
                <p className="text-xs text-slate-400">Sin hojas perdidas ni confusión con los repuestos o presupuestos.</p>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Esta guía rápida te mostrará en menos de 2 minutos cómo sacarle el máximo provecho a <strong>MiTaller</strong>.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 flex items-start gap-2.5">
              <Users className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white block">Clientes & Vehículos</span>
                <span className="text-slate-400 text-[11px]">Busca por patente, teléfono o nombre en segundos.</span>
              </div>
            </div>

            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 flex items-start gap-2.5">
              <ClipboardList className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white block">Órdenes de Trabajo</span>
                <span className="text-slate-400 text-[11px]">Sigue el estado de reparación e imprime fichas.</span>
              </div>
            </div>

            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 flex items-start gap-2.5">
              <Package className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white block">Stock & Repuestos</span>
                <span className="text-slate-400 text-[11px]">Controla cantidades, precios de costo y venta.</span>
              </div>
            </div>

            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 flex items-start gap-2.5">
              <MessageSquare className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white block">WhatsApp Directo</span>
                <span className="text-slate-400 text-[11px]">Envía avisos de vehículo listo o mantenimientos.</span>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'clients',
      title: '2. Clientes y Vehículos',
      subtitle: 'Registra tus clientes y asocia múltiples vehículos',
      icon: Users,
      iconColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
      content: (
        <div className="space-y-3 text-xs">
          <div className="p-3.5 bg-slate-800/80 rounded-2xl border border-slate-700 space-y-2">
            <h5 className="font-bold text-white flex items-center gap-2">
              <Car className="w-4 h-4 text-amber-400" />
              Ficha del Cliente
            </h5>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Al agregar un cliente, puedes ingresar su teléfono (con código de país para WhatsApp), nombre y los vehículos que trae al taller (Marca, Modelo, Año y Patente).
            </p>
          </div>

          <div className="space-y-2 text-slate-300">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>Consulta por Patente:</strong> Desde la pestaña Clientes o el botón "Consulta por Patente" puedes ver todo el historial de reparaciones asociadas a un vehículo.</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>Auto-completado rápido:</strong> Cuando crees una nueva Orden de Trabajo, solo elige el cliente y su vehículo se cargará automáticamente.</span>
            </div>
          </div>

          {onNavigateTab && (
            <div className="pt-2">
              <button
                onClick={() => {
                  onNavigateTab('clients');
                  onClose();
                }}
                className="w-full py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold rounded-xl flex items-center justify-center gap-2"
              >
                <PlusCircle className="w-4 h-4" />
                Ir al Módulo de Clientes
              </button>
            </div>
          )}
        </div>
      )
    },
    {
      id: 'orders',
      title: '3. Órdenes de Trabajo (OT)',
      subtitle: 'El corazón operativo de tu taller',
      icon: ClipboardList,
      iconColor: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
      content: (
        <div className="space-y-3 text-xs">
          <div className="p-3.5 bg-slate-800/80 rounded-2xl border border-slate-700 space-y-2">
            <h5 className="font-bold text-white flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-blue-400" />
              Estados de Reparación
            </h5>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Cada vehículo que ingresa pasa por 4 etapas simples:
            </p>
            <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px] font-semibold">
              <span className="px-2 py-1 bg-amber-500/20 text-amber-300 rounded-lg text-center">1. Ingresado</span>
              <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded-lg text-center">2. En Reparación</span>
              <span className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded-lg text-center">3. Reparado / Listo</span>
              <span className="px-2 py-1 bg-emerald-500/20 text-emerald-300 rounded-lg text-center">4. Entregado</span>
            </div>
          </div>

          <div className="space-y-2 text-slate-300">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <span><strong>Detalle Técnico & Fotos:</strong> Puedes anotar la falla reportada, el diagnóstico técnico, la mano de obra y los repuestos sacados del inventario.</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <span><strong>Impresión / PDF:</strong> Genera comprobantes de ingreso y fichas de trabajo para entregar al cliente o pegar en el vehículo.</span>
            </div>
          </div>

          {onOpenNewWorkOrder && (
            <div className="pt-2">
              <button
                onClick={() => {
                  onClose();
                  onOpenNewWorkOrder();
                }}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs"
              >
                <PlusCircle className="w-4 h-4" />
                Probar Crear Nueva Orden
              </button>
            </div>
          )}
        </div>
      )
    },
    {
      id: 'inventory',
      title: '4. Inventario & Repuestos',
      subtitle: 'Evita quedarte sin insumos clave',
      icon: Package,
      iconColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      content: (
        <div className="space-y-3 text-xs">
          <div className="p-3.5 bg-slate-800/80 rounded-2xl border border-slate-700 space-y-2">
            <h5 className="font-bold text-white flex items-center gap-2">
              <Package className="w-4 h-4 text-emerald-400" />
              Control de Repuestos
            </h5>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Carga tus aceites, filtros, pastillas de freno, bujías o correas. Configura un <strong>Stock Mínimo</strong> y el sistema te alertará en amarillo cuando se estén agotando.
            </p>
          </div>

          <div className="space-y-2 text-slate-300">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>Descuento automático:</strong> Al agregar repuestos a una Orden de Trabajo o Presupuesto, el stock se actualiza solo.</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>Ajuste Rápido (+ / -):</strong> Suma o resta stock desde los botones de acción rápida sin editar todo el producto.</span>
            </div>
          </div>

          {onNavigateTab && (
            <div className="pt-2">
              <button
                onClick={() => {
                  onNavigateTab('inventory');
                  onClose();
                }}
                className="w-full py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold rounded-xl flex items-center justify-center gap-2"
              >
                <Package className="w-4 h-4" />
                Ir al Módulo de Inventario
              </button>
            </div>
          )}
        </div>
      )
    },
    {
      id: 'budgets',
      title: '5. Presupuestos & Cotizaciones',
      subtitle: 'Genera cotizaciones profesionales en segundos',
      icon: FileText,
      iconColor: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
      content: (
        <div className="space-y-3 text-xs">
          <div className="p-3.5 bg-slate-800/80 rounded-2xl border border-slate-700 space-y-2">
            <h5 className="font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-400" />
              Aprobaciones Claras
            </h5>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Crea presupuestos detallados con repuestos y mano de obra. Imprímelos en PDF o envíalos directamente por WhatsApp para que el cliente los apruebe antes de iniciar los trabajos.
            </p>
          </div>

          <div className="space-y-2 text-slate-300">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
              <span><strong>Descuentos y Moneda:</strong> Ajusta precios en Guaraníes (PYG) o Dólares (USD) según tu país.</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
              <span><strong>Convertir a Orden:</strong> Una vez aprobado el presupuesto, el sistema te ayuda a iniciar la orden de trabajo de inmediato.</span>
            </div>
          </div>

          {onNavigateTab && (
            <div className="pt-2">
              <button
                onClick={() => {
                  onNavigateTab('budgets');
                  onClose();
                }}
                className="w-full py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 font-bold rounded-xl flex items-center justify-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Ir al Módulo de Presupuestos
              </button>
            </div>
          )}
        </div>
      )
    },
    {
      id: 'cloud',
      title: '6. Sincronización en la Nube y Licencia',
      subtitle: 'Accede desde tu celular, tablet o computadora',
      icon: Building2,
      iconColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
      content: (
        <div className="space-y-3 text-xs">
          <div className="p-3.5 bg-slate-800/80 rounded-2xl border border-slate-700 space-y-2">
            <h5 className="font-bold text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-amber-400" />
              Tu Taller en la Nube
            </h5>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Al registrar tu cuenta en <strong>MiTaller</strong>, todos tus datos (clientes, stock, órdenes) se guardan de forma segura en Google Cloud Firebase.
            </p>
          </div>

          <div className="space-y-2 text-slate-300">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span><strong>Acceso Multidispositivo:</strong> Abre la app en la PC del taller y en tu teléfono al mismo tiempo sin perder información.</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span><strong>Importar Planillas:</strong> Si tienes clientes en Google Sheets o Excel, puedes importarlos fácilmente desde la barra lateral.</span>
            </div>
          </div>

          {onOpenAuth && (
            <div className="pt-2">
              <button
                onClick={() => {
                  onClose();
                  onOpenAuth();
                }}
                className="w-full py-2 bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs"
              >
                <Sparkles className="w-4 h-4" />
                Acceder / Registrar Mi Taller
              </button>
            </div>
          )}
        </div>
      )
    }
  ];

  const currentStepData = steps[activeStep];
  const StepIcon = currentStepData.icon;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col my-auto">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center ${currentStepData.iconColor}`}>
              <StepIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-white text-base sm:text-lg leading-tight flex items-center gap-2">
                <span>{currentStepData.title}</span>
              </h3>
              <p className="text-xs text-slate-400 font-medium">{currentStepData.subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            title="Cerrar Asistente Guía"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator Tabs */}
        <div className="bg-slate-950/40 border-b border-slate-800/80 px-3 py-2 flex items-center justify-between overflow-x-auto gap-1 scrollbar-none">
          {steps.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => setActiveStep(idx)}
              className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeStep === idx
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-black ${
                activeStep === idx ? 'bg-slate-950 text-amber-400' : 'bg-slate-800 text-slate-400'
              }`}>
                {idx + 1}
              </span>
              <span className="hidden sm:inline">{s.title.split('.')[1] || s.title}</span>
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 min-h-[260px] flex flex-col justify-between bg-slate-900/60">
          {currentStepData.content}
        </div>

        {/* Footer Controls */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between gap-3">
          <button
            onClick={() => setActiveStep((prev) => Math.max(0, prev - 1))}
            disabled={activeStep === 0}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 ${
              activeStep === 0
                ? 'opacity-40 cursor-not-allowed text-slate-500'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            Anterior
          </button>

          <div className="flex items-center gap-1.5">
            {steps.map((_, idx) => (
              <span
                key={idx}
                onClick={() => setActiveStep(idx)}
                className={`cursor-pointer h-2 rounded-full transition-all ${
                  activeStep === idx ? 'w-6 bg-amber-400' : 'w-2 bg-slate-700 hover:bg-slate-600'
                }`}
              />
            ))}
          </div>

          {activeStep < steps.length - 1 ? (
            <button
              onClick={() => setActiveStep((prev) => Math.min(steps.length - 1, prev + 1))}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all flex items-center gap-1 shadow-xs"
            >
              Siguiente
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-all flex items-center gap-1 shadow-xs"
            >
              ¡Entendido, Comenzar!
              <CheckCircle2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
