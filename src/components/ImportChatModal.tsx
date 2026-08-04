import { useState } from 'react';
import { MessageSquare, Sparkles, AlertCircle, Copy, Check, FileCode2 } from 'lucide-react';

interface ImportChatModalProps {
  onClose: () => void;
  onImportContent: (pastedText: string) => void;
}

export function ImportChatModal({ onClose, onImportContent }: ImportChatModalProps) {
  const [pastedContent, setPastedContent] = useState('');
  const [importedStatus, setImportedStatus] = useState(false);

  const handleImport = () => {
    if (!pastedContent.trim()) return;
    onImportContent(pastedContent);
    setImportedStatus(true);
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-slate-200 my-8">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 text-amber-600 rounded-xl">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg">Continuar Proyecto <span className="text-amber-500">Mi</span>Taller</h3>
              <p className="text-xs text-slate-500">Importar código o conversación de otro sitio (Claude, ChatGPT, etc.)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-xl font-bold"
          >
            &times;
          </button>
        </div>

        {/* Info Note */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-900 space-y-2">
          <div className="flex items-center gap-2 font-bold text-blue-950">
            <AlertCircle className="w-4 h-4 text-blue-600 shrink-0" />
            <span>¿Por qué pegar el código directamente?</span>
          </div>
          <p className="leading-relaxed">
            Los enlaces a conversaciones de Claude.ai son privados y requieren inicio de sesión. Para que pueda leer exactamente en qué estabas trabajando, simplemente <b>copia el código HTML/JS o el texto de tu chat anterior y pégalo abajo</b>. ¡Yo me encargo de integrarlo a tu sitio sin límites de crédito!
          </p>
        </div>

        {/* Text Area */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <FileCode2 className="w-4 h-4 text-amber-600" />
            Pega aquí el código HTML o texto de tu conversación previa:
          </label>
          <textarea
            rows={8}
            value={pastedContent}
            onChange={(e) => setPastedContent(e.target.value)}
            placeholder="Ejemplo: <!DOCTYPE html><html>... o la lista de funciones que querías en MiTaller..."
            className="w-full p-3 bg-slate-900 text-slate-100 font-mono text-xs rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
          />
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          <span className="text-[11px] text-slate-500">
            {pastedContent.length > 0 ? `${pastedContent.length} caracteres listos` : 'Esperando contenido...'}
          </span>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              Cancelar
            </button>

            <button
              onClick={handleImport}
              disabled={!pastedContent.trim()}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2"
            >
              {importedStatus ? (
                <>
                  <Check className="w-4 h-4" />
                  ¡Importado con éxito!
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Cargar e Integrar al Proyecto
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
