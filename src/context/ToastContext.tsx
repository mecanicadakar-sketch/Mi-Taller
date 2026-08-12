import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X, Sparkles } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

export interface ToastContextType {
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  showSuccess: (title: string, description?: string, duration?: number) => void;
  showError: (title: string, description?: string, duration?: number) => void;
  showInfo: (title: string, description?: string, duration?: number) => void;
  showWarning: (title: string, description?: string, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    ({ type, title, description, duration = 3500 }: Omit<ToastMessage, 'id'>) => {
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newToast: ToastMessage = { id, type, title, description, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const showSuccess = useCallback(
    (title: string, description?: string, duration = 3500) => {
      addToast({ type: 'success', title, description, duration });
    },
    [addToast]
  );

  const showError = useCallback(
    (title: string, description?: string, duration = 4000) => {
      addToast({ type: 'error', title, description, duration });
    },
    [addToast]
  );

  const showInfo = useCallback(
    (title: string, description?: string, duration = 3500) => {
      addToast({ type: 'info', title, description, duration });
    },
    [addToast]
  );

  const showWarning = useCallback(
    (title: string, description?: string, duration = 4000) => {
      addToast({ type: 'warning', title, description, duration });
    },
    [addToast]
  );

  return (
    <ToastContext.Provider
      value={{
        addToast,
        showSuccess,
        showError,
        showInfo,
        showWarning,
        removeToast,
      }}
    >
      {children}

      {/* Floating Toast Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto bg-slate-900/95 text-white border border-slate-800 shadow-2xl rounded-2xl p-4 flex items-start gap-3 backdrop-blur-md animate-in slide-in-from-bottom-5 fade-in duration-200 transition-all hover:border-slate-700"
          >
            {/* Toast Icon */}
            <div className="shrink-0 pt-0.5">
              {toast.type === 'success' && (
                <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/30">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              )}
              {toast.type === 'error' && (
                <div className="p-1.5 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/30">
                  <AlertCircle className="w-5 h-5" />
                </div>
              )}
              {toast.type === 'info' && (
                <div className="p-1.5 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/30">
                  <Sparkles className="w-5 h-5" />
                </div>
              )}
              {toast.type === 'warning' && (
                <div className="p-1.5 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/30">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              )}
            </div>

            {/* Toast Body */}
            <div className="flex-1 space-y-0.5 pr-2">
              <h4 className="font-extrabold text-xs text-white leading-tight">
                {toast.title}
              </h4>
              {toast.description && (
                <p className="text-[11px] text-slate-300 leading-snug font-medium">
                  {toast.description}
                </p>
              )}
            </div>

            {/* Dismiss Button */}
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
              title="Cerrar notificación"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast debe ser utilizado dentro de un ToastProvider');
  }
  return context;
}
