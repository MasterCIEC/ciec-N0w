import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import AppLogo from '../components/AppLogo';

type AuthViewMode = 'login' | 'signup' | 'forgotPassword' | 'magicLink';

const AuthView: React.FC = () => {
  const [view, setView] = useState<AuthViewMode>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const resetState = (newView: AuthViewMode) => {
    setView(newView);
    setFullName('');
    // Keep email when switching from login to forgot password for better UX
    if (!(view === 'login' && newView === 'forgotPassword')) {
      setEmail('');
    }
    setPassword('');
    setMessage('');
    setError('');
  };

  const handleAuthAction = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      switch (view) {
        case 'login': {
          const { error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) throw error;
          break;
        }
        case 'signup': {
          const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: { full_name: fullName }
            }
          });
          if (error) throw error;
          setMessage('¡Registro exitoso! Revise su correo para confirmar su cuenta. Su cuenta está pendiente de aprobación por un administrador.');
          resetState('login');
          break;
        }
        case 'forgotPassword': {
          const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin,
          });
          if (error) throw error;
          setMessage('Se ha enviado un enlace para restablecer la contraseña a su correo.');
          break;
        }
        case 'magicLink': {
          const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: window.location.origin
            }
          });
          if (error) throw error;
          setMessage('Se ha enviado un enlace mágico a su correo. Haga clic en él para iniciar sesión.');
          break;
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch(view) {
      case 'login': return 'Iniciar Sesión';
      case 'signup': return 'Crear Cuenta';
      case 'forgotPassword': return 'Recuperar Contraseña';
      case 'magicLink': return 'Acceso con Enlace Mágico';
    }
  };

  const getButtonText = () => {
    if (loading) return 'Procesando...';
    switch(view) {
      case 'login': return 'Ingresar';
      case 'signup': return 'Registrarse';
      case 'forgotPassword': return 'Enviar Enlace';
      case 'magicLink': return 'Enviar Enlace Mágico';
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl mx-auto bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden md:flex">
        <div className="md:w-1/2 bg-primary-700 dark:bg-primary-900 text-white p-8 sm:p-12 flex flex-col justify-center items-center text-center">
            <AppLogo className="w-48 h-24" />
            <h1 className="text-3xl sm:text-4xl font-bold mt-4">CIEC.Now</h1>
            <p className="mt-4 text-primary-200">La plataforma para la gestión de comisiones, reuniones y eventos de CIEC.</p>
        </div>
        <div className="md:w-1/2 p-8 sm:p-12 flex flex-col justify-center">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">{getTitle()}</h2>
          <form onSubmit={handleAuthAction} className="space-y-4">
            {view === 'signup' && (
              <Input
                label="Nombre Completo"
                id="full_name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                placeholder="Su nombre y apellido"
              />
            )}
            {(view === 'forgotPassword' || view === 'magicLink') && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {view === 'forgotPassword' 
                  ? 'Ingrese su correo electrónico para recibir un enlace y restablecer su contraseña.'
                  : 'Ingrese su correo y le enviaremos un enlace para acceder sin contraseña.'
                }
              </p>
            )}
            <Input
              label="Correo Electrónico"
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="su.correo@ejemplo.com"
            />
            {(view === 'login' || view === 'signup') && (
              <Input
                label="Contraseña"
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
            )}
            <Button type="submit" variant="primary" className="w-full" disabled={loading}>
              {getButtonText()}
            </Button>
          </form>

          {message && !error && (
            <p className="mt-4 text-center text-sm text-green-600 dark:text-green-400">{message}</p>
          )}
          {error && (
            <div className="mt-4 text-center text-sm text-red-500">
              <span>
                {error === 'Invalid login credentials' 
                  ? 'Credenciales inválidas.' 
                  : error}
              </span>
              {error === 'Invalid login credentials' && (
                <button
                  onClick={() => resetState('forgotPassword')}
                  className="ml-1 font-semibold text-primary-600 dark:text-primary-400 hover:underline focus:outline-none"
                >
                  Recuperar contraseña
                </button>
              )}
            </div>
          )}

          <div className="mt-6 text-center text-sm space-y-2">
            {view === 'login' && (
              <div className="flex justify-between">
                <button onClick={() => resetState('forgotPassword')} className="text-primary-600 dark:text-primary-400 hover:underline">
                  ¿Olvidó su contraseña?
                </button>
                <button onClick={() => resetState('signup')} className="text-primary-600 dark:text-primary-400 hover:underline">
                  Crear una cuenta
                </button>
              </div>
            )}
            {(view === 'signup' || view === 'forgotPassword' || view === 'magicLink') && (
              <button onClick={() => resetState('login')} className="text-primary-600 dark:text-primary-400 hover:underline">
                Volver a Iniciar Sesión
              </button>
            )}
             {view === 'login' && (
              <div className="pt-2">
                <button onClick={() => resetState('magicLink')} className="text-gray-500 dark:text-gray-400 hover:underline">
                  O inicie sesión con un Enlace Mágico
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthView;