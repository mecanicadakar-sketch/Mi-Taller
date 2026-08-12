import React, { useState, useRef } from 'react';
import {
  Sparkles,
  Wrench,
  AlertTriangle,
  Car,
  Camera,
  Send,
  Copy,
  Check,
  Share2,
  Phone,
  RotateCcw,
  ShieldCheck,
  Fuel,
  Info,
  ChevronRight,
  Flame,
  Zap,
  Disc,
  Activity,
  X,
} from 'lucide-react';

interface AuxilioMecanicoIAProps {
  onOpenNewWorkOrder?: (initialSymptom?: string) => void;
  workshopPhone?: string;
  workshopName?: string;
}

const COMMON_PRESETS = [
  {
    icon: Car,
    title: 'El motor gira pero no arranca',
    description: 'Batería bien, motor de arranque gira pero el vehículo no enciende.',
    color: 'from-amber-500/20 to-orange-500/10 border-amber-500/30 text-amber-300',
  },
  {
    icon: Flame,
    title: 'Sobrecalentamiento / Humo',
    description: 'La aguja de temperatura sube al máximo o sale vapor del capó.',
    color: 'from-red-500/20 to-rose-500/10 border-red-500/30 text-red-400',
  },
  {
    icon: Zap,
    title: 'Falta de corriente / Batería muerta',
    description: 'No encienden luces, sonido de chasquido o silencio al dar contacto.',
    color: 'from-yellow-500/20 to-amber-500/10 border-yellow-500/30 text-yellow-300',
  },
  {
    icon: Disc,
    title: 'Frenos esponjosos o ruido fuerte',
    description: 'El pedal se va al fondo o hay chillido metálico agudo al frenar.',
    color: 'from-purple-500/20 to-indigo-500/10 border-purple-500/30 text-purple-300',
  },
  {
    icon: Activity,
    title: 'Tirones o falta de potencia',
    description: 'El motor pierde fuerza al acelerar, tiembla o amaga a apagarse.',
    color: 'from-blue-500/20 to-cyan-500/10 border-blue-500/30 text-blue-300',
  },
];

export function AuxilioMecanicoIA({ onOpenNewWorkOrder, workshopPhone, workshopName }: AuxilioMecanicoIAProps) {
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number | null>(null);
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [fuelType, setFuelType] = useState('Nafta / Gasolina');
  const [problemDescription, setProblemDescription] = useState('');

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        alert('La imagen es demasiado grande. Selecciona una imagen menor a 8MB.');
        return;
      }
      setImageMimeType(file.type || 'image/jpeg');
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePresetSelect = (preset: typeof COMMON_PRESETS[0], idx: number) => {
    if (selectedPresetIndex === idx) {
      setSelectedPresetIndex(null);
      setProblemDescription('');
    } else {
      setSelectedPresetIndex(idx);
      setProblemDescription(preset.description);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!problemDescription.trim() && !selectedImage) {
      setErrorMessage('Por favor describe lo que ocurre o adjunta una fotografía del problema.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setResponse(null);

    try {
      const res = await fetch('/api/ai/auxilio-mecanico', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          problemDescription,
          vehicleInfo: {
            make,
            model,
            year,
            fuelType,
          },
          imageBase64: selectedImage,
          imageMimeType: imageMimeType,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Error al comunicarse con la IA de auxilio.');
      }

      setResponse(data.response);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error inesperado al generar la consulta.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!response) return;
    navigator.clipboard.writeText(response);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareWhatsApp = () => {
    if (!response) return;
    const text = `*Auxilio Mecánico IA - Diagnóstico de Emergencia*\n\n${response.slice(0, 1500)}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 text-white rounded-2xl p-6 shadow-xl border border-amber-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Tecnología Gemini AI 3.6</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
              <span>Asistente de Auxilio Mecánico</span>
            </h2>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              Obtén un diagnóstico preliminar de emergencia, lista de chequeos rápidos para intentar destrabar el vehículo en la vía pública y recomendaciones clave de seguridad.
            </p>
          </div>

          {workshopPhone ? (
            <a
              href={`https://wa.me/${workshopPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hola ${workshopName || 'Taller'}, necesito asistencia por auxilio mecánico.`)}`}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-3 rounded-xl font-bold text-sm transition-all shadow-lg flex items-center justify-center gap-2 border border-emerald-400/30 active:scale-95"
            >
              <Phone className="w-4 h-4 fill-current text-emerald-100" />
              <span>Auxilio Directo: {workshopPhone}</span>
            </a>
          ) : (
            <div className="shrink-0 bg-slate-800/80 border border-slate-700 text-slate-300 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2">
              <Phone className="w-4 h-4 text-amber-400" />
              <span>{workshopName ? `Taller: ${workshopName}` : 'Contacta a tu taller'}</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Input Form Column */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-5">
            <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2 border-b border-slate-100 pb-3">
              <Car className="w-5 h-5 text-amber-500" />
              <span>Datos del Vehículo y Falla</span>
            </h3>

            {/* Common Presets */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Fallas Frecuentes (Sugerencias Rápidas)
              </label>
              <div className="grid grid-cols-1 gap-2">
                {COMMON_PRESETS.map((preset, idx) => {
                  const Icon = preset.icon;
                  const isSelected = selectedPresetIndex === idx;

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handlePresetSelect(preset, idx)}
                      className={`text-left p-2.5 rounded-xl border transition-all flex items-start gap-3 group relative ${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-400/30 shadow-xs'
                          : 'border-slate-200 hover:border-amber-400 hover:bg-amber-50/50'
                      }`}
                    >
                      <div
                        className={`p-2 rounded-lg transition-colors shrink-0 ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950 font-bold'
                            : 'bg-slate-100 group-hover:bg-amber-500 group-hover:text-slate-950 text-slate-700'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <p
                            className={`text-xs font-bold truncate ${
                              isSelected ? 'text-amber-950' : 'text-slate-800 group-hover:text-amber-900'
                            }`}
                          >
                            {preset.title}
                          </p>
                          {isSelected && (
                            <span className="shrink-0 text-[10px] bg-amber-500 text-slate-950 font-black px-1.5 py-0.5 rounded-md">
                              Seleccionado
                            </span>
                          )}
                        </div>
                        <p
                          className={`text-[11px] line-clamp-1 ${
                            isSelected ? 'text-amber-800 font-medium' : 'text-slate-500'
                          }`}
                        >
                          {preset.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Vehicle Specs optional */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Información del Vehículo (Opcional)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Marca (ej. Toyota)"
                    value={make}
                    onChange={(e) => setMake(e.target.value)}
                    className="px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Modelo (ej. Corolla)"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Año (ej. 2018)"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                  <select
                    value={fuelType}
                    onChange={(e) => setFuelType(e.target.value)}
                    className="px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white"
                  >
                    <option value="Nafta / Gasolina">Nafta / Gasolina</option>
                    <option value="Diésel / Gasoil">Diésel / Gasoil</option>
                    <option value="Flex / Multicombustible">Flex / Multicombustible</option>
                    <option value="Híbrido / Eléctrico">Híbrido / Eléctrico</option>
                  </select>
                </div>
              </div>

              {/* Problem Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>SÍNTOMAS Y DETALLE DE LA FALLA *</span>
                  <span className="text-[10px] text-slate-500 font-normal">Sea lo más preciso posible</span>
                </label>
                <textarea
                  rows={4}
                  required={!selectedImage}
                  value={problemDescription}
                  onChange={(e) => {
                    setProblemDescription(e.target.value);
                    if (selectedPresetIndex !== null && COMMON_PRESETS[selectedPresetIndex]?.description !== e.target.value) {
                      setSelectedPresetIndex(null);
                    }
                  }}
                  placeholder="Ejemplo: Iba circulando a 80 km/h, encendió la luz de testigo en el tablero, el motor dio tirones y luego se apagó al frenar. La batería parece estar cargada..."
                  className="w-full p-3 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none placeholder:text-slate-400"
                />
              </div>

              {/* Photo Upload */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-slate-500" />
                  <span>Foto del Tablero / Motor (Opcional)</span>
                </label>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />

                {selectedImage ? (
                  <div className="relative rounded-xl overflow-hidden border border-amber-300 bg-slate-900 group max-h-48">
                    <img
                      src={selectedImage}
                      alt="Captura de fallo"
                      className="w-full h-36 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setSelectedImage(null)}
                      className="absolute top-2 right-2 bg-slate-950/80 hover:bg-red-600 text-white p-1 rounded-lg transition-colors"
                      title="Quitar foto"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <span className="absolute bottom-2 left-2 bg-slate-950/80 text-amber-300 text-[10px] px-2 py-0.5 rounded-md font-mono">
                      Foto adjunta lista para analizar
                    </span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-slate-200 hover:border-amber-400 hover:bg-amber-50/30 p-3 rounded-xl flex items-center justify-center gap-2 text-slate-600 hover:text-amber-700 text-xs font-bold transition-all"
                  >
                    <Camera className="w-4 h-4 text-amber-500" />
                    <span>Adjuntar fotografía de testigo o componente</span>
                  </button>
                )}
              </div>

              {errorMessage && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black rounded-xl text-sm transition-all shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Consultando Asistente IA...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 fill-slate-950" />
                    <span>Analizar Falla con IA Gemini</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Diagnostic Response Column */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm min-h-[480px] flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-amber-500/10 text-amber-600 rounded-xl">
                    <Wrench className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base">
                      Informe de Diagnóstico y Auxilio
                    </h3>
                    <p className="text-xs text-slate-500">
                      Instrucciones de revisión paso a paso generadas por IA
                    </p>
                  </div>
                </div>

                {response && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopy}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                      title="Copiar texto"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copiado' : 'Copiar'}</span>
                    </button>
                    <button
                      onClick={handleShareWhatsApp}
                      className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 border border-emerald-200"
                      title="Enviar por WhatsApp"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </button>
                  </div>
                )}
              </div>

              {!response && !isLoading && (
                <div className="py-16 text-center space-y-4 text-slate-400">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto border border-slate-200/80">
                    <Sparkles className="w-8 h-8 text-amber-500/80" />
                  </div>
                  <div className="max-w-md mx-auto space-y-1">
                    <p className="text-sm font-bold text-slate-700">
                      Completa el formulario o selecciona una falla frecuente
                    </p>
                    <p className="text-xs text-slate-500">
                      El asistente evaluará la descripción y fotografía enviada para brindarte una guía clara de auxilio mecánico inmediato.
                    </p>
                  </div>
                </div>
              )}

              {isLoading && (
                <div className="py-20 text-center space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto border border-amber-500/20 animate-pulse">
                    <Sparkles className="w-7 h-7 animate-spin" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-800">
                      Analizando síntomas con Inteligencia Artificial...
                    </p>
                    <p className="text-xs text-slate-500">
                      Consultando causas probables, puntos de verificación segura y recomendaciones de ruta.
                    </p>
                  </div>
                </div>
              )}

              {response && (
                <div className="prose prose-slate max-w-none text-xs sm:text-sm leading-relaxed space-y-3 font-sans text-slate-800 bg-slate-50/80 p-4 rounded-xl border border-slate-200/80">
                  {response.split('\n\n').map((paragraph, pIdx) => (
                    <p key={pIdx} className="whitespace-pre-line">
                      {paragraph}
                    </p>
                  ))}
                </div>
              )}
            </div>

            {response && onOpenNewWorkOrder && (
              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-xs text-slate-500">
                  ¿Necesitas registrar este ingreso en el taller?
                </p>
                <button
                  onClick={() => onOpenNewWorkOrder(problemDescription)}
                  className="w-full sm:w-auto px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <Car className="w-4 h-4 text-amber-400" />
                  <span>Crear Órden de Trabajo en Taller</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
