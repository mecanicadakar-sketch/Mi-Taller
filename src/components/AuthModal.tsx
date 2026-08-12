import React, { useState } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { createWorkshopProfile, seedDemoDataForWorkshop } from '../services/tallerService';
import { Workshop } from '../types/tallerya';
import { Wrench, Shield, Lock, Mail, User, Phone, MapPin, CheckCircle, AlertCircle, Sparkles, X } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialMode?: 'login' | 'register';
}

export function AuthModal({ isOpen, onClose, onSuccess, initialMode = 'login' }: AuthModalProps) {
  const [isRegistering, setIsRegistering] = useState(initialMode === 'register');
  
  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register State
  const [nombreTaller, setNombreTaller] = useState('');
  const [nombreOwner, setNombreOwner] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [seedDemo, setSeedDemo] = useState(false);

  // Status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorAction, setErrorAction] = useState<'switchToLogin' | 'googleDomainHelp' | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError('Por favor escribe tu correo electrónico arriba para enviarte el enlace de recuperación.');
      return;
    }
    setError(null);
    setSuccessMessage(null);
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSuccessMessage(`Hemos enviado un correo de recuperación a ${email.trim()}. Revisa tu bandeja de entrada o correo no deseado.`);
    } catch (err: any) {
      console.error('Reset password error:', err);
      if (err.code === 'auth/user-not-found') {
        setError('No existe una cuenta registrada con este correo electrónico.');
      } else if (err.code === 'auth/invalid-email') {
        setError('El correo ingresado no es válido.');
      } else {
        setError('Error al enviar correo de recuperación: ' + (err.message || 'Intenta de nuevo.'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setErrorAction(null);
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Correo o contraseña incorrectos. Por favor verifica tus datos.');
      } else if (err.code === 'auth/invalid-email') {
        setError('El correo electrónico no es válido.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Demasiados intentos fallidos. Intenta más tarde.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('El acceso con Correo/Contraseña no está habilitado en la consola de Firebase. Actívalo en Firebase Console > Authentication > Sign-in method.');
      } else if (err.code === 'auth/network-request-failed') {
        setError('Error de conexión a internet. Verifica tu red.');
      } else {
        setError('Error al iniciar sesión: ' + (err.message || 'Verifica tu conexión.'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setErrorAction(null);

    if (!nombreTaller.trim()) {
      setError('Por favor ingresa el nombre de tu taller.');
      return;
    }
    if (!email.trim()) {
      setError('Por favor ingresa un correo electrónico.');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);

    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = cred.user;

      try {
        // Create Workshop profile document in Firestore
        const newWorkshop: Workshop = {
          id: user.uid,
          nombreTaller: nombreTaller.trim(),
          nombreOwner: nombreOwner.trim() || 'Propietario',
          email: user.email || email.trim(),
          telefono: telefono.trim(),
          direccion: direccion.trim(),
          createdAt: new Date().toISOString()
        };

        await createWorkshopProfile(newWorkshop);

        if (seedDemo) {
          await seedDemoDataForWorkshop(user.uid);
        }
      } catch (dbErr) {
        console.warn('Advertencia al guardar perfil en Firestore:', dbErr);
      }

      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Register error:', err);
      if (err.code === 'auth/email-already-in-use') {
        setError(`El correo (${email.trim()}) ya está registrado en Firebase (mediante Google o registro previo).`);
        setErrorAction('switchToLogin');
      } else if (err.code === 'auth/weak-password') {
        setError('La contraseña es demasiado débil (mínimo 6 caracteres).');
      } else if (err.code === 'auth/invalid-email') {
        setError('El correo electrónico ingresado no tiene un formato válido.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('El registro con Correo/Contraseña no está activado en Firebase. Habilítalo en Firebase Console > Authentication > Sign-in method > Correo electrónico/contraseña.');
      } else if (err.code === 'auth/network-request-failed') {
        setError('Error de red. Verifica tu conexión a internet.');
      } else {
        setError('Error en el registro: ' + (err.message || 'Intenta nuevamente.'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setErrorAction(null);
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      try {
        // Check if workshop profile exists, if not create default
        const newWorkshop: Workshop = {
          id: user.uid,
          nombreTaller: nombreTaller.trim() || `Taller de ${user.displayName || 'Mecánica'}`,
          nombreOwner: user.displayName || 'Administrador',
          email: user.email || '',
          telefono: telefono.trim(),
          direccion: direccion.trim(),
          createdAt: new Date().toISOString()
        };

        await createWorkshopProfile(newWorkshop);
      } catch (dbErr) {
        console.warn('Advertencia perfil Google Firestore:', dbErr);
      }

      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Google Sign In error:', err);
      if (err.code === 'auth/unauthorized-domain') {
        const currentDomain = window.location.hostname;
        setError(`El dominio "${currentDomain}" no está autorizado en Firebase para Google Sign-In.`);
        setErrorAction('googleDomainHelp');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('El inicio de sesión con Google no está habilitado en la consola de Firebase. Habilítalo en Authentication > Sign-in method.');
      } else if (err.code === 'auth/popup-blocked') {
        setError('El navegador bloqueó la ventana emergente de Google. Por favor permite pop-ups e inténtalo de nuevo.');
      } else if (err.code !== 'auth/popup-closed-by-user') {
        setError('Error al ingresar con Google: ' + (err.message || 'Intenta nuevamente.'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden my-8">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-blue-600/30 rounded-xl border border-blue-400/30">
              <Wrench className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight"><span className="text-amber-400">Mi</span>Taller Cloud</h2>
              <p className="text-xs text-blue-200">Acceso a tu sistema de gestión de taller</p>
            </div>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex border-b border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={() => { setIsRegistering(false); setError(null); setErrorAction(null); setSuccessMessage(null); }}
            className={`flex-1 py-3 text-sm font-semibold text-center border-b-2 transition-colors ${
              !isRegistering
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Iniciar Sesión
          </button>
          <button
            type="button"
            onClick={() => { setIsRegistering(true); setError(null); setErrorAction(null); setSuccessMessage(null); }}
            className={`flex-1 py-3 text-sm font-semibold text-center border-b-2 transition-colors ${
              isRegistering
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Registrar mi Taller
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6">
          {successMessage && (
            <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-start gap-2">
              <CheckCircle className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
                <span className="font-medium">{error}</span>
              </div>

              {errorAction === 'switchToLogin' && (
                <div className="pl-7 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegistering(false);
                      setError(null);
                      setErrorAction(null);
                    }}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg transition-colors shadow-xs"
                  >
                    👉 Cambiar a "Iniciar Sesión" con este correo
                  </button>
                </div>
              )}

              {errorAction === 'googleDomainHelp' && (
                <div className="pl-7 pt-1 text-xs text-red-900 bg-red-100/60 p-2.5 rounded-lg border border-red-200/80">
                  <p className="font-semibold mb-1">Para habilitar Google Sign-In en Vercel:</p>
                  <ol className="list-decimal list-inside space-y-0.5 text-slate-700">
                    <li>Abre tu consola de Firebase</li>
                    <li>Ve a <strong>Authentication</strong> &gt; <strong>Configuración (Settings)</strong></li>
                    <li>Busca <strong>Dominios autorizados (Authorized domains)</strong></li>
                    <li>Haz clic en <strong>Agregar dominio</strong> y añade: <code className="bg-white px-1 py-0.5 rounded text-red-700 font-mono font-bold">{window.location.hostname}</code></li>
                  </ol>
                  <p className="mt-1.5 text-slate-600">O también puedes registrarte directamente con <strong>Correo y Contraseña</strong> arriba.</p>
                </div>
              )}
            </div>
          )}

          {!isRegistering ? (
            /* LOGIN FORM */
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Correo Electrónico del Taller
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="taller@ejemplo.com"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Contraseña
                  </label>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-medium"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium rounded-lg shadow-sm transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading ? 'Ingresando...' : 'Iniciar Sesión'}
              </button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-slate-600">O ingresa con</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium rounded-lg text-sm transition-colors flex items-center justify-center gap-2 shadow-xs"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                Continuar con Google
              </button>
            </form>
          ) : (
            /* REGISTER FORM */
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Nombre de tu Taller Mecánico *
                </label>
                <div className="relative">
                  <Wrench className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={nombreTaller}
                    onChange={(e) => setNombreTaller(e.target.value)}
                    placeholder="Ej: Taller Dakar & Servicios"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Nombre Propietario
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      value={nombreOwner}
                      onChange={(e) => setNombreOwner(e.target.value)}
                      placeholder="Juan Pérez"
                      className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Teléfono Taller
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      placeholder="+54 9 11..."
                      className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Correo Electrónico para la cuenta *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contacto@taller.com"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Contraseña de acceso *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium rounded-lg shadow-sm transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-60 mt-2"
              >
                {loading ? 'Creando cuenta...' : 'Crear Cuenta y Registrar Taller'}
              </button>

              <div className="relative my-3">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-slate-600">O regístrate con</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium rounded-lg text-sm transition-colors flex items-center justify-center gap-2 shadow-xs"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                Registrarme con Google
              </button>
            </form>
          )}

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span className="flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-emerald-500" />
              Datos protegidos por Firebase Cloud
            </span>
            <button
              onClick={onClose}
              className="text-slate-600 hover:text-slate-700 font-medium underline underline-offset-2"
            >
              Continuar como Invitado
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
