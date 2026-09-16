import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Tablet,
  Monitor,
  Download,
  X,
  Share,
  PlusSquare,
  CheckCircle2,
  Copy,
  ExternalLink,
  MessageCircle,
  HelpCircle,
  Sparkles,
} from 'lucide-react';

interface QuickInstallGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerInstallPrompt?: () => Promise<boolean>;
  canPromptDirectly?: boolean;
}

export function QuickInstallGuideModal({
  isOpen,
  onClose,
  onTriggerInstallPrompt,
  canPromptDirectly = false,
}: QuickInstallGuideModalProps) {
  const [activeTab, setActiveTab] = useState<'mobile' | 'ios' | 'pc'>('mobile');
  const [copiedLink, setCopiedLink] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    // Detect user platform to set initial active tab
    const userAgent = (navigator.userAgent || '').toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setActiveTab('ios');
    } else if (/android/.test(userAgent)) {
      setActiveTab('mobile');
    } else {
      setActiveTab('pc');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.href : 'https://mitallerpy.vercel.app';

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    } catch {
      // Fallback
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    }
  };

  const handleNativePrompt = async () => {
    if (onTriggerInstallPrompt) {
      const accepted = await onTriggerInstallPrompt();
      if (accepted) {
        setInstallSuccess(true);
        setTimeout(() => {
          setInstallSuccess(false);
          onClose();
        }, 2500);
      }
    }
  };

  const shareViaWhatsApp = () => {
    const text = encodeURIComponent(
      `Acceso rápido a Consulta por Patente de MiTaller:\n${currentUrl}\n\nÁbrelo desde tu celular o tablet e instálalo en tu pantalla de inicio.`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl sm:rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center">
              <Download className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Instalar Acceso Rápido</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase tracking-wider">
                  Gratis
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Accede a la Consulta por Patente desde tu Celular, Tablet o PC
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Alert */}
        {installSuccess && (
          <div className="p-3 bg-emerald-500/20 border-b border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>¡Instalación iniciada! Se agregará el acceso directo a tu pantalla de inicio.</span>
          </div>
        )}

        {/* Platform Tabs */}
        <div className="px-4 pt-3 pb-0 bg-slate-950/50 border-b border-slate-800 flex items-center gap-1.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('mobile')}
            className={`px-3 py-2 text-xs font-bold rounded-t-xl transition-all flex items-center gap-1.5 cursor-pointer border-t border-x ${
              activeTab === 'mobile'
                ? 'bg-slate-900 text-amber-400 border-slate-800 border-b-transparent shadow-xs'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Android (Celular/Tablet)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ios')}
            className={`px-3 py-2 text-xs font-bold rounded-t-xl transition-all flex items-center gap-1.5 cursor-pointer border-t border-x ${
              activeTab === 'ios'
                ? 'bg-slate-900 text-amber-400 border-slate-800 border-b-transparent shadow-xs'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <Tablet className="w-4 h-4" />
            <span>iPhone / iPad (iOS)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pc')}
            className={`px-3 py-2 text-xs font-bold rounded-t-xl transition-all flex items-center gap-1.5 cursor-pointer border-t border-x ${
              activeTab === 'pc'
                ? 'bg-slate-900 text-amber-400 border-slate-800 border-b-transparent shadow-xs'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <Monitor className="w-4 h-4" />
            <span>PC / Notebook</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Direct Install Button (If supported by browser) */}
          {canPromptDirectly && activeTab !== 'ios' && (
            <div className="bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border border-amber-500/30 rounded-2xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  Instalación Automática Compatible
                </span>
                <p className="text-xs text-slate-200">
                  Tu navegador permite instalar el acceso directo con un solo clic:
                </p>
              </div>
              <button
                type="button"
                onClick={handleNativePrompt}
                className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
              >
                <Download className="w-4 h-4 stroke-[2.5]" />
                <span>Instalar Ahora</span>
              </button>
            </div>
          )}

          {/* Tab 1: Android */}
          {activeTab === 'mobile' && (
            <div className="space-y-3">
              <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                  <Smartphone className="w-4 h-4" />
                  <span>Pasos para Celulares y Tablets Android (Chrome o Samsung)</span>
                </h4>

                <div className="space-y-2.5 text-xs text-slate-300">
                  <div className="flex items-start gap-3 p-2.5 bg-slate-900/80 rounded-xl border border-slate-800">
                    <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-black flex items-center justify-center shrink-0 text-xs">
                      1
                    </span>
                    <div>
                      <strong className="text-white block">Abre el menú de tu navegador</strong>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        Toca los <strong>tres puntos verticales (⋮)</strong> en la esquina superior derecha de Google Chrome, o en la barra inferior si usas Samsung Internet.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-2.5 bg-slate-900/80 rounded-xl border border-slate-800">
                    <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-black flex items-center justify-center shrink-0 text-xs">
                      2
                    </span>
                    <div>
                      <strong className="text-white block">Toca &quot;Instalar aplicación&quot; o &quot;Agregar a la pantalla principal&quot;</strong>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        En la lista de opciones verás el botón con el ícono de descarga o una pantalla con el signo <strong>+</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-2.5 bg-slate-900/80 rounded-xl border border-slate-800">
                    <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-black flex items-center justify-center shrink-0 text-xs">
                      3
                    </span>
                    <div>
                      <strong className="text-white block">Confirma &quot;Instalar&quot;</strong>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        El ícono oficial de <strong>MiTaller</strong> se creará en tu pantalla de inicio junto a tus demás aplicaciones y abrirá instantáneamente en pantalla completa.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: iOS (iPhone / iPad) */}
          {activeTab === 'ios' && (
            <div className="space-y-3">
              <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                  <Tablet className="w-4 h-4" />
                  <span>Pasos para iPhone y iPad (Navegador Safari)</span>
                </h4>

                <div className="space-y-2.5 text-xs text-slate-300">
                  <div className="flex items-start gap-3 p-2.5 bg-slate-900/80 rounded-xl border border-slate-800">
                    <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-black flex items-center justify-center shrink-0 text-xs">
                      1
                    </span>
                    <div>
                      <strong className="text-white flex items-center gap-1.5">
                        Toca el botón Compartir <Share className="w-4 h-4 text-sky-400 shrink-0 inline" />
                      </strong>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        Ubicado en la barra inferior de Safari en iPhone, o en la barra superior en iPad (es un cuadrado con flecha hacia arriba).
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-2.5 bg-slate-900/80 rounded-xl border border-slate-800">
                    <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-black flex items-center justify-center shrink-0 text-xs">
                      2
                    </span>
                    <div>
                      <strong className="text-white flex items-center gap-1.5">
                        Elige &quot;Agregar a inicio&quot; <PlusSquare className="w-4 h-4 text-emerald-400 shrink-0 inline" />
                      </strong>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        Desliza hacia abajo en el menú que se despliega hasta encontrar la opción <strong>&quot;Agregar a la pantalla de inicio&quot;</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-2.5 bg-slate-900/80 rounded-xl border border-slate-800">
                    <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-black flex items-center justify-center shrink-0 text-xs">
                      3
                    </span>
                    <div>
                      <strong className="text-white block">Toca &quot;Agregar&quot;</strong>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        Presiona &quot;Agregar&quot; en la esquina superior derecha. Tendrás la app en tu iPhone/iPad lista para usar sin necesidad de ingresar al navegador cada vez.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: PC / Notebook */}
          {activeTab === 'pc' && (
            <div className="space-y-3">
              <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                  <Monitor className="w-4 h-4" />
                  <span>Pasos para Computadora o Notebook (Chrome / Edge en Windows o Mac)</span>
                </h4>

                <div className="space-y-2.5 text-xs text-slate-300">
                  <div className="flex items-start gap-3 p-2.5 bg-slate-900/80 rounded-xl border border-slate-800">
                    <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-black flex items-center justify-center shrink-0 text-xs">
                      1
                    </span>
                    <div>
                      <strong className="text-white block">Ícono en la barra de direcciones</strong>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        En la parte superior donde escribes la dirección web, busca a la derecha un ícono de <strong>pantalla con flecha hacia abajo (⤓)</strong> o un símbolo <strong>+</strong> que dice <em>&quot;Instalar MiTaller&quot;</em>.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-2.5 bg-slate-900/80 rounded-xl border border-slate-800">
                    <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-black flex items-center justify-center shrink-0 text-xs">
                      2
                    </span>
                    <div>
                      <strong className="text-white block">O desde el menú de opciones (⋮)</strong>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        Haz clic en los tres puntos <strong>(⋮)</strong> de Chrome o Edge &rarr; <strong>&quot;Guardar y compartir&quot;</strong> &rarr; <strong>&quot;Instalar MiTaller&quot;</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-2.5 bg-slate-900/80 rounded-xl border border-slate-800">
                    <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-black flex items-center justify-center shrink-0 text-xs">
                      3
                    </span>
                    <div>
                      <strong className="text-white block">Acceso directo en el Escritorio</strong>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        Se creará un acceso directo en tu Escritorio y en la barra de tareas de Windows/Mac. Abre como una ventana independiente, rápida y sin barras molestas.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Share or Open on Other Device Section */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3.5 space-y-2.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              ¿Querés abrirlo en otro celular o enviarlo a un cliente?
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                {copiedLink ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-300">¡Enlace Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-400" />
                    <span>Copiar Enlace Directo</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={shareViaWhatsApp}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-xs"
              >
                <MessageCircle className="w-4 h-4 stroke-[2.5]" />
                <span>Enviar por WhatsApp</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <span className="text-[11px]">
            Tecnología PWA (Progressive Web App) • No ocupa espacio
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
