import React, { useState, useEffect } from 'react';
import { Workshop, SubscriptionInfo, PricingSettings } from '../types/tallerya';
import { getPricingSettings, DEFAULT_PRICING_SETTINGS } from '../services/tallerService';
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
  const [pricing, setPricing] = useState<PricingSettings>(DEFAULT_PRICING_SETTINGS);
  const [licenseCode, setLicenseCode] = useState('');

  useEffect(() => {
    if (isOpen) {
      getPricingSettings().then((p) => setPricing(p));
    }
  }, [isOpen]);
  const [codeError, setCodeError] = useState('');
  const [codeSuccess, setCodeSuccess] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const [activeTab, setActiveTab] = useState<'plans' | 'card_checkout' | 'transfer' | 'code'>('plans');
  const [selectedPlanForCard, setSelectedPlanForCard] = useState<{ name: string; price: string; amount: number } | null>(null);

  // Card Form State
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [isProcessingCard, setIsProcessingCard] = useState(false);
  const [cardSuccess, setCardSuccess] = useState(false);
  const [cardError, setCardError] = useState('');

  const handleStartCardPayment = (planName: string, priceStr: string, amountNum: number) => {
    setSelectedPlanForCard({ name: planName, price: priceStr, amount: amountNum });
    setCardError('');
    setCardSuccess(false);
    setActiveTab('card_checkout');
  };

  const handleProcessCardPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardNumber || !cardHolder || !cardExpiry || !cardCvv) {
      setCardError('Por favor completa todos los campos de la tarjeta.');
      return;
    }
    setIsProcessingCard(true);
    setCardError('');

    // Simulate online gateway processing
    setTimeout(async () => {
      setIsProcessingCard(false);
      setCardSuccess(true);

      // Automatically activate Pro subscription
      if (onActivateLicense) {
        await onActivateLicense('PRO');
      }
    }, 1800);
  };

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
                    <span className="text-2xl font-black text-slate-900">${pricing.basicoPriceUsd}</span>
                    <span className="text-xs font-semibold text-slate-500"> / mes</span>
                    <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                      ~ {pricing.basicoPricePyg.toLocaleString('es-PY')} PYG al mes
                    </p>
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
                <div className="space-y-2">
                  <button
                    onClick={() => handleStartCardPayment('Plan Básico', `$${pricing.basicoPriceUsd} USD`, pricing.basicoPriceUsd)}
                    className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors text-center flex items-center justify-center gap-2"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Pagar ${pricing.basicoPriceUsd} con Tarjeta</span>
                  </button>
                  <a
                    href={getWhatsAppUrl(`Plan Básico ($${pricing.basicoPriceUsd}/mes)`)}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] rounded-lg text-center block transition-colors"
                  >
                    Solicitar vía WhatsApp
                  </a>
                </div>
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
                    <span className="text-3xl font-black text-white">${pricing.proPriceUsd}</span>
                    <span className="text-xs font-semibold text-slate-400"> / mes</span>
                    <p className="text-[11px] font-semibold text-amber-300/80 mt-0.5">
                      ~ {pricing.proPricePyg.toLocaleString('es-PY')} PYG al mes
                    </p>
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
                <div className="space-y-2">
                  <button
                    onClick={() => handleStartCardPayment('Plan PRO Taller', `$${pricing.proPriceUsd} USD`, pricing.proPriceUsd)}
                    className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition-colors text-center flex items-center justify-center gap-2"
                  >
                    <CreditCard className="w-4 h-4 text-slate-950" />
                    <span>Pagar ${pricing.proPriceUsd} con Tarjeta Online</span>
                  </button>
                  <a
                    href={getWhatsAppUrl(`Plan PRO ($${pricing.proPriceUsd}/mes)`)}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-[11px] rounded-lg text-center block transition-colors"
                  >
                    Contactar por WhatsApp
                  </a>
                </div>
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
                    <span className="text-2xl font-black text-slate-900">${pricing.anualPriceUsd}</span>
                    <span className="text-xs font-semibold text-slate-500"> / año</span>
                    <p className="text-[11px] font-semibold text-emerald-600 mt-0.5">
                      ~ {pricing.anualPricePyg.toLocaleString('es-PY')} PYG al año
                    </p>
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
                <div className="space-y-2">
                  <button
                    onClick={() => handleStartCardPayment('Plan Anual PRO', `$${pricing.anualPriceUsd} USD`, pricing.anualPriceUsd)}
                    className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors text-center flex items-center justify-center gap-2"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Pagar ${pricing.anualPriceUsd} con Tarjeta</span>
                  </button>
                  <a
                    href={getWhatsAppUrl(`Plan ANUAL PRO ($${pricing.anualPriceUsd}/año)`)}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] rounded-lg text-center block transition-colors"
                  >
                    Pedir Descuento por WhatsApp
                  </a>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'card_checkout' && (
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-md max-w-lg mx-auto space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Pago Seguro con Tarjeta</h3>
                    <p className="text-xs text-slate-500">
                      {selectedPlanForCard ? selectedPlanForCard.name : 'Suscripción PRO'} ({selectedPlanForCard?.price || '$29 USD'})
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('plans')}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 underline"
                >
                  Cambiar Plan
                </button>
              </div>

              {cardSuccess ? (
                <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-200 text-center space-y-3">
                  <div className="w-12 h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-md">
                    <Check className="w-6 h-6 stroke-[3]" />
                  </div>
                  <h4 className="font-black text-slate-900 text-base">¡Pago Procesado Exitosamente!</h4>
                  <p className="text-xs text-slate-600">
                    Se ha activado el <strong className="text-emerald-800">{selectedPlanForCard?.name || 'Plan PRO'}</strong> para tu taller <strong className="text-slate-900">{workshop?.nombreTaller || 'Mi Taller'}</strong>.
                  </p>
                  <div className="p-3 bg-white rounded-xl border border-emerald-200 text-left text-xs font-mono text-slate-700 space-y-1">
                    <p><strong>Monto Pagado:</strong> {selectedPlanForCard?.price || '$29 USD'}</p>
                    <p><strong>Estado:</strong> ACREDITADO EN LÍNEA</p>
                    <p><strong>Comprobante ID:</strong> TXN-{Math.floor(100000 + Math.random() * 900000)}</p>
                  </div>
                  <button
                    onClick={onClose}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
                  >
                    Comenzar a Usar MiTaller PRO
                  </button>
                </div>
              ) : (
                <form onSubmit={handleProcessCardPayment} className="space-y-4">
                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Nombre en la Tarjeta</label>
                      <input
                        type="text"
                        required
                        value={cardHolder}
                        onChange={(e) => setCardHolder(e.target.value)}
                        placeholder="Ej: JUAN PEREZ"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 uppercase"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Número de Tarjeta</label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          maxLength={19}
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                          placeholder="4500 0000 0000 0000"
                          className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900 font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                        <CreditCard className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Vencimiento</label>
                        <input
                          type="text"
                          required
                          maxLength={5}
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          placeholder="MM/AA"
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900 font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-center"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">CÓDIGO CVV/CVC</label>
                        <input
                          type="password"
                          required
                          maxLength={4}
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value)}
                          placeholder="123"
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900 font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-center"
                        />
                      </div>
                    </div>
                  </div>

                  {cardError && (
                    <p className="text-xs font-semibold text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200">
                      {cardError}
                    </p>
                  )}

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isProcessingCard}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>
                        {isProcessingCard
                          ? 'Procesando Pago Seguro...'
                          : `Pagar ${selectedPlanForCard?.price || '$29 USD'} y Activar Ahora`}
                      </span>
                    </button>
                    <p className="text-[10px] text-slate-400 text-center mt-2 flex items-center justify-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      <span>Transacción encriptada de 256 bits ssl</span>
                    </p>
                  </div>
                </form>
              )}
            </div>
          )}

          {activeTab === 'transfer' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                <div className="p-2.5 bg-blue-100 text-blue-800 rounded-xl">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Medios de Pago Disponibles</h3>
                  <p className="text-xs text-slate-500">Aceptamos Tarjetas de Crédito/Débito, Transferencias y Giros Billeteras</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                {/* Credit Card Option */}
                <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50/50 rounded-xl border border-blue-200 flex flex-col justify-between space-y-3">
                  <div>
                    <h4 className="font-bold text-slate-900 mb-1.5 flex items-center gap-1.5 text-xs">
                      <CreditCard className="w-4 h-4 text-blue-600" />
                      Tarjetas de Crédito / Débito
                    </h4>
                    <p className="text-slate-600 text-[11px] mb-2">
                      Visa, Mastercard, American Express. Procesamiento 100% seguro con acreditación instantánea.
                    </p>
                    <div className="flex items-center gap-1.5 font-semibold text-[10px] text-blue-700 bg-blue-100/70 px-2 py-1 rounded-md">
                      <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                      <span>Pago online directo sin salir de la app</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <button
                      onClick={() => handleStartCardPayment('Plan PRO Taller', '$29 USD', 29)}
                      className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg text-center block transition-colors shadow-xs"
                    >
                      Pagar con Tarjeta en la App
                    </button>
                    <a
                      href={getWhatsAppUrl('Solicitar Enlace de Pago con Tarjeta')}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-1 px-2 bg-white hover:bg-slate-100 text-blue-700 font-semibold text-[10px] rounded-md text-center block border border-blue-200"
                    >
                      Pedir Link de Pago vía WhatsApp
                    </a>
                  </div>
                </div>

                {/* Giros / Billeteras / Transferencia */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between space-y-3">
                  <div className="space-y-2.5">
                    <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                      <Phone className="w-4 h-4 text-amber-500" />
                      Giros & Transferencias Bancarias
                    </h4>
                    <div>
                      <p className="text-slate-500 text-[11px]">Número de Giro / WhatsApp:</p>
                      <p className="font-mono font-bold text-slate-900 text-xs mt-0.5">+595 975 635 770</p>
                    </div>
                    <div className="pt-2 border-t border-slate-200">
                      <p className="font-bold text-slate-900 text-[11px] flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                        Pago Bancario Directo
                      </p>
                      <p className="text-slate-700 font-medium text-[11px] mt-0.5">
                        Banco Itaú — Caja de Ahorro
                      </p>
                      <p className="text-slate-900 font-mono font-bold text-[11px] bg-amber-100/70 text-slate-900 px-2 py-0.5 rounded-md inline-block mt-1">
                        Alias CI: 7226273
                      </p>
                    </div>
                  </div>
                  <a
                    href={getWhatsAppUrl('Transferencia Bancaria Itaú / Giro')}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-900 text-amber-400 font-bold text-xs rounded-lg text-center block transition-colors mt-2"
                  >
                    Confirmar Pago por WhatsApp
                  </a>
                </div>

                {/* Direct Support */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between space-y-3">
                  <div>
                    <h4 className="font-bold text-slate-900 mb-1.5 flex items-center gap-1.5 text-xs">
                      <Building2 className="w-4 h-4 text-emerald-600" />
                      Soporte Directo para Pagos
                    </h4>
                    <p className="text-slate-600 text-[11px]">Atención personalizada e Invoices:</p>
                    <p className="font-bold text-slate-900 text-sm mt-0.5">mecanicadakar@gmail.com</p>
                  </div>
                  <a
                    href="mailto:mecanicadakar@gmail.com?subject=Consulta%20de%20Pago%20MiTaller"
                    className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg text-center block transition-colors"
                  >
                    Enviar Correo de Soporte
                  </a>
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