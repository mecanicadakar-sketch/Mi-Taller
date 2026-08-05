import React, { useState, useEffect } from 'react';
import { Download, Smartphone, Monitor, X, Share, PlusSquare, CheckCircle2, Sparkles, ChevronRight, HelpCircle } from 'lucide-react';

interface InstallAppBannerProps {
  forceShow?: boolean;
  onCloseForceShow?: () => void;
}

export const InstallAppBanner: React.FC<InstallAppBannerProps> = ({
  forceShow = false,
  onCloseForceShow,
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [showBanner, setShowBanner] = useState<boolean>(false);
  const [showIOSModal, setShowIOSModal] = useState<boolean>(false);
  const [installedSuccess, setInstalledSuccess] = useState<boolean>(false);

  useEffect(() => {
    // 1. Register Service Worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => {
            console.log('Service Worker registrado con éxito:', reg.scope);
          })
          .catch((err) => {
            console.log('Error al registrar Service Worker:', err);
          });
      });
    }

    // 2. Check if already installed
    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true;

    setIsStandalone(isStandaloneMode);

    // 3. Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const iosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(iosDevice);

    // 4. Handle BeforeInstallPrompt event (Android, Chrome, Edge, PC, Mac)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);

      // Check if user previously dismissed banner
      const dismissed = localStorage.getItem('tallerya_pwa_banner_dismissed');
      if (!dismissed && !isStandaloneMode) {
        setShowBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check appinstalled event
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
      setShowBanner(false);
      setInstalledSuccess(true);
      setTimeout(() => setInstalledSuccess(false), 5000);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    // If iOS and not standalone and not dismissed, show banner
    if (iosDevice && !isStandaloneMode) {
      const dismissed = localStorage.getItem('tallerya_pwa_banner_dismissed');
      if (!dismissed) {
        setShowBanner(true);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Handle forceShow trigger from parent header/sidebar button
  useEffect(() => {
    if (forceShow) {
      if (isIOS) {
        setShowIOSModal(true);
      } else if (deferredPrompt) {
        handleInstallClick();
      } else {
        setShowBanner(true);
      }
    }
  }, [forceShow]);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    if (!deferredPrompt) {
      // Browser didn't trigger beforeinstallprompt yet or standard fallback
      alert(
        'Para instalar en tu PC o Android:\n\n1. En tu navegador (Chrome/Edge), haz clic en el menú de tres puntos (⋮).\n2. Selecciona "Instalar MiTaller" o "Agregar a la pantalla principal".'
      );
      return;
    }

    // Show native prompt
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('El usuario aceptó la instalación de la App');
      setShowBanner(false);
      setDeferredPrompt(null);
      if (onCloseForceShow) onCloseForceShow();
    } else {
      console.log('El usuario rechazó la instalación');
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('tallerya_pwa_banner_dismissed', 'true');
    if (onCloseForceShow) onCloseForceShow();
  };

  // If already running inside standalone app, do not display install banners
  if (isStandalone && !installedSuccess) {
    return null;
  }

  return (
    <>
      {/* Toast notification after successful installation */}
      {installedSuccess && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-bounce">
          <CheckCircle2 className="w-6 h-6 shrink-0" />
          <div>
            <p className="font-bold text-sm">¡<span className="text-amber-300">Mi</span>Taller instalada correctamente!</p>
            <p className="text-xs text-emerald-100">Ya puedes acceder desde la pantalla de inicio de tu dispositivo.</p>
          </div>
        </div>
      )}

      {/* Main Bottom Banner */}
      {showBanner && !isStandalone && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-50 animate-in slide-in-from-bottom duration-300">
          <div className="bg-slate-900/95 backdrop-blur-md border border-amber-500/40 rounded-2xl shadow-2xl p-4 text-slate-100 shadow-amber-500/10">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-slate-950 rounded-xl overflow-hidden border border-amber-500/40 flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
                  <img src="/pwa-192.png" alt="MiTaller Icon" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                      App Gratis
                    </span>
                    <span className="text-[11px] text-slate-400">PWA</span>
                  </div>
                  <h3 className="font-bold text-slate-100 text-base leading-tight mt-0.5">
                    Instalar <span className="text-amber-400">Mi</span>Taller
                  </h3>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="text-slate-400 hover:text-slate-200 p-1.5 hover:bg-slate-800 rounded-lg transition-colors"
                title="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Instala la aplicación en tu **celular (Android/iPhone)** o **PC**. Funciona sin conexión a internet, abre instantáneamente y no ocupa memoria.
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={handleInstallClick}
                className="flex-1 py-2.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <Download className="w-4 h-4" />
                {isIOS ? 'Ver Instrucciones iPhone' : 'Instalar en Celular / PC'}
              </button>
              <button
                onClick={handleDismiss}
                className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs rounded-xl transition-colors"
              >
                Ahora no
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal with step-by-step instructions for iOS (iPhone/iPad) */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 text-slate-100 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => {
                setShowIOSModal(false);
                if (onCloseForceShow) onCloseForceShow();
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-100 p-1 bg-slate-800 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-500/20 text-amber-400 rounded-xl flex items-center justify-center border border-amber-500/30">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-100">Instalar en iPhone / iPad</h3>
                <p className="text-xs text-slate-400">Sigue estos sencillos pasos en Safari</p>
              </div>
            </div>

            <div className="space-y-3 my-5 text-xs text-slate-300">
              <div className="flex items-start gap-3 p-3 bg-slate-800/60 rounded-xl border border-slate-700/50">
                <div className="w-6 h-6 bg-amber-500 text-slate-950 font-bold rounded-full flex items-center justify-center shrink-0">
                  1
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-slate-200 flex items-center gap-1.5">
                    Toca el botón Compartir <Share className="w-4 h-4 text-blue-400 inline shrink-0" />
                  </p>
                  <p className="text-slate-400 text-[11px]">
                    Ubicado en la barra inferior (o superior en iPad) de tu navegador Safari.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-slate-800/60 rounded-xl border border-slate-700/50">
                <div className="w-6 h-6 bg-amber-500 text-slate-950 font-bold rounded-full flex items-center justify-center shrink-0">
                  2
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-slate-200 flex items-center gap-1.5">
                    Elige "Agregar a inicio" <PlusSquare className="w-4 h-4 text-emerald-400 inline shrink-0" />
                  </p>
                  <p className="text-slate-400 text-[11px]">
                    Desliza hacia abajo en la lista de opciones y selecciona **Agregar a la pantalla de inicio**.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-slate-800/60 rounded-xl border border-slate-700/50">
                <div className="w-6 h-6 bg-amber-500 text-slate-950 font-bold rounded-full flex items-center justify-center shrink-0">
                  3
                </div>
                <div>
                  <p className="font-semibold text-slate-200">¡Listo!</p>
                  <p className="text-slate-400 text-[11px]">
                    Presiona "Agregar" en la esquina superior derecha y tendrás <span className="text-amber-400">Mi</span>Taller como una app nativa en tu celular.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setShowIOSModal(false);
                if (onCloseForceShow) onCloseForceShow();
              }}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
};
