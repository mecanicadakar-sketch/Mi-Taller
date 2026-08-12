import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, Trash2, ShieldAlert, ChevronDown, ChevronUp, Copy, Check, Download, RotateCcw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
  copied: boolean;
  copiedBackup: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
    copied: false,
    copiedBackup: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      showDetails: false,
      copied: false,
      copiedBackup: false,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleTryAgain = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetCache = () => {
    if (window.confirm('¿Estás seguro de que deseas limpiar la caché local? Se recomienda descargar un respaldo de datos primero.')) {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (e) {
        console.warn('Could not clear local storage', e);
      }
      window.location.reload();
    }
  };

  private handleDownloadBackup = () => {
    try {
      const backupData: Record<string, any> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          try {
            backupData[key] = JSON.parse(localStorage.getItem(key) || '');
          } catch {
            backupData[key] = localStorage.getItem(key);
          }
        }
      }

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `respaldo_tallerya_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.setState({ copiedBackup: true });
      setTimeout(() => this.setState({ copiedBackup: false }), 3000);
    } catch (e) {
      console.error('Failed to create backup:', e);
    }
  };

  private handleCopyError = () => {
    const errorText = `Error: ${this.state.error?.toString()}\n\nStack:\n${this.state.error?.stack || 'N/A'}\n\nComponent Stack:\n${this.state.errorInfo?.componentStack || 'N/A'}`;
    navigator.clipboard.writeText(errorText);
    this.setState({ copied: true });
    setTimeout(() => this.setState({ copied: false }), 2500);
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl space-y-6 text-center">
            <div className="w-16 h-16 bg-amber-500/10 text-amber-400 rounded-2xl flex items-center justify-center mx-auto border border-amber-500/20 shadow-inner">
              <ShieldAlert className="w-8 h-8 text-amber-400" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-700">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Tus datos guardados están seguros</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Se interrumpió el renderizado
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-md mx-auto">
                Ocurrió un error inesperado en la interfaz. Puedes reintentar directamente o recargar la aplicación sin perder tu información almacenada.
              </p>
            </div>

            {/* Error detail container */}
            {this.state.error && (
              <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden text-left">
                <button
                  type="button"
                  onClick={() => this.setState({ showDetails: !this.state.showDetails })}
                  className="w-full px-4 py-3 bg-slate-900/80 hover:bg-slate-800/80 transition-colors flex items-center justify-between text-xs font-bold text-slate-300 border-b border-slate-800/80"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-400" />
                    Detalles técnicos del error
                  </span>
                  {this.state.showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                <div className="p-4 space-y-3">
                  <p className="text-xs font-mono text-red-400 font-semibold break-words">
                    {this.state.error.toString()}
                  </p>

                  {this.state.showDetails && (
                    <div className="space-y-3 pt-2 border-t border-slate-900">
                      {this.state.error.stack && (
                        <div>
                          <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1">Stack Trace:</p>
                          <pre className="text-[11px] font-mono text-slate-400 bg-slate-900/90 p-3 rounded-xl overflow-x-auto max-h-40 whitespace-pre-wrap leading-tight border border-slate-800/60">
                            {this.state.error.stack}
                          </pre>
                        </div>
                      )}
                      {this.state.errorInfo?.componentStack && (
                        <div>
                          <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1">Component Stack:</p>
                          <pre className="text-[11px] font-mono text-slate-400 bg-slate-900/90 p-3 rounded-xl overflow-x-auto max-h-32 whitespace-pre-wrap leading-tight border border-slate-800/60">
                            {this.state.errorInfo.componentStack}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={this.handleCopyError}
                      className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 hover:text-amber-400 transition-colors"
                    >
                      {this.state.copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{this.state.copied ? 'Copiado al portapapeles' : 'Copiar error para soporte'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Main Primary Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={this.handleReload}
                className="py-3 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-2 active:scale-95"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Recargar Aplicación</span>
              </button>

              <button
                type="button"
                onClick={this.handleTryAgain}
                className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <RotateCcw className="w-4 h-4 text-amber-400" />
                <span>Reintentar Vista</span>
              </button>
            </div>

            {/* Utility Actions (Backup & Clear) */}
            <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
              <button
                type="button"
                onClick={this.handleDownloadBackup}
                className="inline-flex items-center gap-1.5 text-slate-300 hover:text-amber-400 font-medium transition-colors"
              >
                {this.state.copiedBackup ? <Check className="w-4 h-4 text-emerald-400" /> : <Download className="w-4 h-4 text-amber-400" />}
                <span>{this.state.copiedBackup ? '¡Respaldo descargado!' : 'Descargar respaldo local (JSON)'}</span>
              </button>

              <button
                type="button"
                onClick={this.handleResetCache}
                className="inline-flex items-center gap-1.5 text-slate-500 hover:text-red-400 transition-colors"
                title="Solo usar si la app sigue fallando tras recargar"
              >
                <Trash2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Limpiar datos en caché</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

