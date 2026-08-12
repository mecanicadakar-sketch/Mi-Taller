import React, { useState, useRef } from 'react';
import {
  Building2,
  Phone,
  Upload,
  Image as ImageIcon,
  Save,
  Check,
  Trash2,
  Share2,
  ShieldCheck,
  MapPin,
  Mail,
  User,
  Sparkles,
  Info,
  Wrench
} from 'lucide-react';
import { Workshop } from '../types/tallerya';
import { updateWorkshopProfile } from '../services/tallerService';
import { useToast } from '../context/ToastContext';

interface WorkshopSettingsViewProps {
  workshop: Workshop | null;
  onUpdateWorkshop: (updated: Workshop) => void;
  onCopyClientPortalLink?: () => void;
}

export function WorkshopSettingsView({
  workshop,
  onUpdateWorkshop,
  onCopyClientPortalLink
}: WorkshopSettingsViewProps) {
  const { showSuccess, showError } = useToast();
  const [nombreTaller, setNombreTaller] = useState(workshop?.nombreTaller || '');
  const [nombreOwner, setNombreOwner] = useState(workshop?.nombreOwner || '');
  const [telefono, setTelefono] = useState(workshop?.telefono || '');
  const [email, setEmail] = useState(workshop?.email || '');
  const [direccion, setDireccion] = useState(workshop?.direccion || '');
  const [ciudad, setCiudad] = useState(workshop?.ciudad || '');
  const [logoUrl, setLogoUrl] = useState(workshop?.logoUrl || '');
  
  const [isSaving, setIsSaving] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);


  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Por favor selecciona un archivo de imagen válido (PNG, JPG, WebP o SVG).');
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      setUploadError('El archivo es demasiado grande. El tamaño máximo es de 3 MB.');
      return;
    }

    setUploadError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setLogoUrl(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workshop?.id) return;

    setIsSaving(true);
    try {
      const updates: Partial<Workshop> = {
        nombreTaller: nombreTaller.trim() || 'MiTaller',
        nombreOwner: nombreOwner.trim(),
        telefono: telefono.trim(),
        email: email.trim(),
        direccion: direccion.trim(),
        ciudad: ciudad.trim(),
        logoUrl: logoUrl.trim(),
      };

      await updateWorkshopProfile(workshop.id, updates);

      const updatedWorkshopObj: Workshop = {
        ...workshop,
        ...updates,
      };

      onUpdateWorkshop(updatedWorkshopObj);
      showSuccess(
        'Perfil del Taller Guardado',
        `Los cambios en ${updates.nombreTaller} se guardaron y sincronizaron exitosamente.`
      );
    } catch (error) {
      console.error('Error al guardar la configuración del taller:', error);
      showError(
        'Error al Guardar',
        'No se pudieron guardar los datos del taller. Revisa tu conexión e intenta de nuevo.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-400 text-xs font-extrabold uppercase tracking-wider">
              <Building2 className="w-3.5 h-3.5" />
              <span>Personalización del Taller</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Configuración & Identidad del Taller
            </h1>
            <p className="text-slate-400 text-sm max-w-2xl leading-relaxed">
              Personaliza la razón social de tu taller, número de contacto para el Portal del Cliente y el logo oficial que aparecerá en tus documentos y presupuestos en PDF.
            </p>
          </div>

          {onCopyClientPortalLink && (
            <button
              type="button"
              onClick={onCopyClientPortalLink}
              className="shrink-0 inline-flex items-center gap-2.5 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-2xl shadow-lg transition-all border border-emerald-400/30 active:scale-95"
            >
              <Share2 className="w-4 h-4" />
              <span>Copiar Link para Clientes</span>
            </button>
          )}
        </div>
      </div>

      {/* Live Brand Identity Preview Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-lg">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Vista Previa de Identidad en la Aplicación</span>
          </h2>
          <span className="text-[11px] text-slate-400">Marca Principal: <strong className="text-white">MiTaller</strong></span>
        </div>

        <div className="bg-slate-950 p-4 sm:p-5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Logo del Taller"
                className="w-12 h-12 object-contain bg-slate-900 border border-slate-700 rounded-2xl p-1 shrink-0"
              />
            ) : (
              <div className="w-12 h-12 bg-amber-500 text-slate-950 font-black rounded-2xl flex items-center justify-center shrink-0 shadow-md">
                <Wrench className="w-6 h-6" />
              </div>
            )}

            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-white text-lg tracking-tight">MiTaller</span>
                <span className="text-slate-500 font-light">|</span>
                <span className="font-extrabold text-amber-400 text-base">
                  {nombreTaller || 'Nombre de tu Taller'}
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                {telefono ? (
                  <>
                    <Phone className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span>WhatsApp Clientes: <strong className="text-slate-200">{telefono}</strong></span>
                  </>
                ) : (
                  <span className="text-amber-400/80 italic">Agrega un número de teléfono abajo</span>
                )}
              </p>
            </div>
          </div>

          <div className="px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-center sm:text-right shrink-0">
            <span className="block text-[10px] text-slate-400 uppercase font-bold">Encargado</span>
            <span className="text-xs font-semibold text-slate-200">{nombreOwner || 'Nombre del Propietario'}</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Main Settings Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Left Column: Workshop Details */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-lg">
            <div className="border-b border-slate-800 pb-4">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-amber-400" />
                <span>Datos Básicos del Taller</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                La marca principal de la app se mantiene como <strong className="text-amber-400">MiTaller</strong>. Aquí puedes personalizar la denominación de tu local.
              </p>
            </div>

            {/* Nombre del Taller */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Nombre de tu Taller / Razón Social <span className="text-amber-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={nombreTaller}
                  onChange={(e) => setNombreTaller(e.target.value)}
                  placeholder="Ej. Mecánica Dakar, Taller San Jorge"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
                <Info className="w-3 h-3 text-slate-500 shrink-0" />
                Se mostrará junto a MiTaller en el portal del cliente, comprobantes y encabezados.
              </p>
            </div>

            {/* Teléfono para Clientes & Portal */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Teléfono / WhatsApp para Clientes <span className="text-amber-400">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="Ej. +54 9 11 4522-8901 o +595 981 123456"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                />
              </div>
              <p className="text-[11px] text-emerald-400/90 mt-1.5 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                Este número aparecerá en el Portal de Clientes para consultas directas y auxilio mecánico.
              </p>
            </div>

            {/* Propietario / Encargado */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Nombre del Propietario o Encargado
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={nombreOwner}
                  onChange={(e) => setNombreOwner(e.target.value)}
                  placeholder="Ej. Fabio Torres"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                />
              </div>
            </div>

            {/* Email de Contacto */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Correo Electrónico del Taller
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contacto@mitaller.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                />
              </div>
            </div>

            {/* Dirección & Ciudad */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Dirección
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <MapPin className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="text"
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                    placeholder="Av. Principal 123"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Ciudad / Localidad
                </label>
                <input
                  type="text"
                  value={ciudad}
                  onChange={(e) => setCiudad(e.target.value)}
                  placeholder="Asunción, CABA, etc."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Right Column: Workshop Logo Upload */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-lg flex flex-col justify-between">
            <div className="space-y-5">
              <div className="border-b border-slate-800 pb-4">
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-amber-400" />
                  <span>Logo Oficial para Documentos</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Sube el logo de tu taller en formato de imagen (PNG, JPG o SVG) para que aparezca impreso en los presupuestos en PDF, comprobantes y en el portal del cliente.
                </p>
              </div>

              {/* Upload Box or Image Preview */}
              <div className="space-y-4">
                {logoUrl ? (
                  <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 text-center space-y-4 relative group">
                    <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl inline-block max-w-[220px] shadow-md">
                      <img
                        src={logoUrl}
                        alt="Logo del Taller"
                        className="max-h-28 w-auto object-contain mx-auto"
                      />
                    </div>
                    
                    <div className="flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Cambiar Logo</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="px-3.5 py-2 bg-rose-950/60 hover:bg-rose-900/80 text-rose-400 text-xs font-bold rounded-xl border border-rose-800/80 transition-colors flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Eliminar</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-700 hover:border-amber-500/70 bg-slate-950/60 hover:bg-slate-950 p-8 rounded-2xl text-center cursor-pointer transition-all group space-y-3"
                  >
                    <div className="w-12 h-12 bg-amber-500/10 text-amber-400 rounded-2xl flex items-center justify-center mx-auto border border-amber-500/20 group-hover:scale-110 transition-transform">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-extrabold text-white group-hover:text-amber-400 transition-colors">
                        Haz clic o arrastra el logo de tu taller
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Soporta imágenes PNG, JPG, WebP o SVG (Máx. 3 MB)
                      </p>
                    </div>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />

                {uploadError && (
                  <p className="text-xs text-rose-400 font-semibold bg-rose-950/40 p-3 rounded-xl border border-rose-800/60">
                    {uploadError}
                  </p>
                )}
              </div>

              {/* Informative Checklist */}
              <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800/80 text-xs text-slate-400 space-y-2">
                <p className="font-bold text-slate-200">¿Dónde se mostrará tu logo?</p>
                <ul className="space-y-1.5 list-disc list-inside text-slate-400">
                  <li>En el encabezado de los presupuestos digitales e impresos.</li>
                  <li>En la portada del Portal Web de Clientes por Patente.</li>
                  <li>En la barra lateral y menú del panel de control de tu taller.</li>
                </ul>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-black text-sm rounded-2xl shadow-xl hover:from-amber-400 hover:to-amber-300 transition-all flex items-center justify-center gap-2 border border-amber-300 disabled:opacity-50 cursor-pointer active:scale-95"
              >
                {isSaving ? (
                  <span>Guardando...</span>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Guardar Configuración</span>
                  </>
                )}
              </button>
            </div>
          </div>

        </div>
      </form>
    </div>
  );
}
