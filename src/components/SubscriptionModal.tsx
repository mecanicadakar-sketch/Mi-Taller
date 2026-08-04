import React, { useState } from 'react';
import { Workshop, SubscriptionInfo } from '../types/tallerya';
import {
  ShieldCheck,
  Zap,
  Check,
  Clock,
  Sparkles,
  Phone,
  CreditCard,
  Key,
  X,
  Building2,
  AlertTriangle,
  Award
} from 'lucide-react';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  workshop: Workshop | null;
  onActivateLicense?: (code: string) => Promise<boolean>;
}

export function SubscriptionModal({
  isOpen,
  onClose,
  workshop,
  onActivateLicense,
}: SubscriptionModalProps) {
  const [licenseCode, setLicenseCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [codeSuccess, setCodeSuccess] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const [activeTab, setActiveTab] = useState<'plans' | 'transfer' | 'code'>('plans');

  if (!isOpen) return null;

  const subInfo: SubscriptionInfo = workshop?.subscription || {
    plan: 'trial',
    status: 'trial',
    trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
  };

  const trialEndsDate = new Date(subInfo.trialEndsAt);
  const now = new Date();
  const diffTime = trialEndsDate.getTime() - now.getTime();
  const daysLeft = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  const isExpired = subInfo.status === 'expired' || (subInfo.status === 'trial' && daysLeft <= 0);

  const handleApplyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseCode.trim()) return;
    setIsActivating(true);
    setCodeError('');
    setCodeSuccess('');

    try {
      if (onActivateLicense) {
        const ok = await onActivateLicense(licenseCode.trim());
        if (ok) {
          setCodeSuccess('¡Licencia activada con éxito! Tu taller ahora tiene Plan Pro Activo.');
          setLicenseCode('');
        } else {
          setCodeError('Código de licencia no válido o expirado. Contacta a soporte.');
        }
      } else {
        if (licenseCode.trim().toUpperCase() === 'TALLERYA2026' || licenseCode.trim().toUpperCase() === 'PRO') {
          setCodeSuccess('¡Licencia activada con éxito! Tu taller ahora tiene Plan Pro Activo.');
          setLicenseCode('');
        } else {
          setCodeError('Código de licencia incorrecto. Solicita tu clave por WhatsApp al +595975635770.');
        }
      }
    } catch (err) {
      setCodeError('Error al validar la licencia. Intenta nuevamente.');
    } finally {
      setIsActivating(false);
    }
  };

  const getWhatsAppUrl = (planName: string) => {
    const message = encodeURIComponent(
      `Hola MiTaller, quisiera activar el *${planName}* para mi taller "${workshop?.nombreTaller || 'Mi Taller'}". Mi email de registro es: ${workshop?.email || 'N/A'}`
    );
    return `https://wa.me/595975635770?text=${message}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950 text-white p-5 sm:p-6 relative shrink-0 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500 text-slate-950 rounded-xl font-bold shadow-lg">
              <Sparkles className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-tight">Suscripción & Planes de <span className="text-amber-400">Mi</span>Taller</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {subInfo.plan === 'pro' ? 'PRO' : 'Prueba Gratuita'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Elige el plan ideal para potenciar la gestión de tu taller mecánico
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Banner */}
        <div className={`px-6 py-3 border-b flex items-center justify-between gap-3 text-xs font-medium ${
          isExpired
            ? 'bg-red-50 text-red-900 border-red-200'
            : subInfo.plan === 'pro'
            ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
            : 'bg-amber-50 text-amber-900 border-amber-200'
        }`}>
          <div className="flex items-center gap-2">
            {isExpired ? (
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            ) : subInfo.plan === 'pro' ? (
              <Award className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <Clock className="w-4 h-4 text-amber-600 shrink-0" />
            )}
            <span>
              {isExpired
                ? '¡Tu periodo de prueba ha finalizado! Selecciona o activa un plan para continuar registrando órdenes.'
                : subInfo.plan === 'pro'
                ? '¡Tienes una Suscripción PRO Activa! Disfrutas de todas las funcionalidades ilimitadas.'
                : `Te quedan ${daysLeft} días de prueba gratuita completa.`}
            </span>
          </div>
          <a
            href={getWhatsAppUrl('Plan Pro')}
            target="_blank"
            rel="noreferrer"
            className="hidden sm:flex items-center gap-1 font-bold text-amber-700 hover:text-amber-800 underline shrink-0"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Hablar con Soporte</span>
          </a>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-2">
          <button
            onClick={() => setActiveTab('plans')}
            className={`pb-2.5 px-3 font-bold text-xs border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'plans'
                ? 'border-amber-500 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Zap className="w-4 h-4 text-amber-500" />
            <span>Planes Mensuales / Anuales</span>
          </button>

          <button
            onClick={() => setActiveTab('transfer')}
            className={`pb-2.5 px-3 font-bold text-xs border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'transfer'
                ? 'border-amber-500 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CreditCard className="w-4 h-4 text-emerald-600" />
            <span>Medios de Pago / Giros</span>
          </button>

          <button
            onClick={() => setActiveTab('code')}
            className={`pb-2.5 px-3 font-bold text-xs border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'code'
                ? 'border-amber-500 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Key className="w-4 h-4 text-slate-700" />
            <span>Activar Código Licencia</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-slate-100/50">
          {activeTab === 'plans' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Plan Básico */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Básico / Inicial</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                      Ideal 1 mecánico
                    </span>
                  </div>
                  <div className="mb-4">
                    <span className="text-2xl font-black text-slate-900">$15</span>
                    <span className="text-xs font-semibold text-slate-500"> / mes</span>
                    <p className="text-[11px] font-semibold text-slate-400 mt-0.5">~ 100.000 PYG al mes</p>
                  </div>
                  <ul className="space-y-2 text-xs text-slate-600 mb-6">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Hasta 50 Órdenes de trabajo/mes</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Gestión de Clientes y Vehículos</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Control de Repuestos e Inventario</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>PDF e Impresión de Órdenes</span>
                    </li>
                  </ul>
                </div>
                <a
                  href={getWhatsAppUrl('Plan Básico ($15/mes)')}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors text-center block"
                >
                  Solicitar Plan Básico
                </a>
              </div>

              {/* Plan PRO */}
              <div className="bg-gradient-to-b from-slate-900 to-slate-950 text-white p-5 rounded-2xl border-2 border-amber-500 shadow-xl flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-amber-500 text-slate-950 font-black text-[10px] px-3 py-1 rounded-bl-xl uppercase tracking-wider">
                  Más Popular
                </div>
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Plan PRO Taller</span>
                  </div>
                  <div className="mb-4">
                    <span className="text-3xl font-black text-white">$29</span>
                    <span className="text-xs font-semibold text-slate-400"> / mes</span>
                    <p className="text-[11px] font-semibold text-amber-300/80 mt-0.5">~ 200.000 PYG al mes</p>
                  </div>
                  <ul className="space-y-2.5 text-xs text-slate-200 mb-6">
                    <li className="flex items-center gap-2 font-semibold text-amber-300">
                      <Check className="w-4 h-4 text-amber-400 shrink-0 stroke-[3]" />
                      <span>Órdenes de trabajo ILIMITADAS</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Asignación de Múltiples Mecánicos</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Envío de estados por WhatsApp</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Presupuestos y Cotizaciones</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Soporte Directo y Prioritario</span>
                    </li>
                  </ul>
                </div>
                <a
                  href={getWhatsAppUrl('Plan PRO ($29/mes)')}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition-colors text-center block"
                >
                  Activar Plan PRO por WhatsApp
                </a>
              </div>

              {/* Plan ANUAL */}
              <div className="bg-white p-5 rounded-2xl border border-amber-300 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Plan Anual PRO</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                      2 Meses GRATIS
                    </span>
                  </div>
                  <div className="mb-4">
                    <span className="text-2xl font-black text-slate-900">$290</span>
                    <span className="text-xs font-semibold text-slate-500"> / año</span>
                    <p className="text-[11px] font-semibold text-emerald-600 mt-0.5">Ahorras $58 USD al año</p>
                  </div>
                  <ul className="space-y-2 text-xs text-slate-600 mb-6">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Todo lo incluido en el Plan PRO</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Configuración y migración inicial asistida</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Garantía de precio congelado</span>
                    </li>
                  </ul>
                </div>
                <a
                  href={getWhatsAppUrl('Plan ANUAL PRO ($290/año)')}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors text-center block"
                >
                  Solicitar Descuento Anual
                </a>
              </div>
            </div>
          )}

          {activeTab === 'transfer' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Transferencias Bancarias & Giros</h3>
                  <p className="text-xs text-slate-500">Paga fácilmente mediante tu banco o billetera digital favorita</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                    <Phone className="w-4 h-4 text-amber-500" />
                    Giros Tigo / Billeteras Digitales
                  </h4>
                  <p className="text-slate-600">Número de Giro / WhatsApp:</p>
                  <p className="font-mono font-bold text-slate-900 text-sm mt-0.5">+595 975 635 770</p>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-emerald-600" />
                    Soporte Directo para Pagos
                  </h4>
                  <p className="text-slate-600">Atención personalizada:</p>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">mecanicadakar@gmail.com</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'code' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs max-w-lg mx-auto space-y-4">
              <div className="text-center">
                <div className="w-12 h-12 bg-amber-100 text-amber-800 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Key className="w-6 h-6 stroke-[2.5]" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Ingresar Código de Licencia</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Si recibiste una clave de suscripción o código de activación promocional, introdúcelo a continuación.
                </p>
              </div>

              <form onSubmit={handleApplyCode} className="space-y-3">
                <div>
                  <input
                    type="text"
                    value={licenseCode}
                    onChange={(e) => setLicenseCode(e.target.value)}
                    placeholder="Ej: TALLERYA2026"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-center font-mono font-bold text-sm tracking-widest text-slate-900 focus:outline-hidden focus:border-amber-500 uppercase"
                  />
                </div>

                {codeError && (
                  <p className="text-xs font-semibold text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
                    {codeError}
                  </p>
                )}

                {codeSuccess && (
                  <p className="text-xs font-semibold text-emerald-700 bg-emerald-50 p-3 rounded-lg border border-emerald-200 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    <span>{codeSuccess}</span>
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isActivating || !licenseCode.trim()}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-amber-400 font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                >
                  {isActivating ? 'Validando Clave...' : 'Validar y Activar Licencia'}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}