import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import AppLogo from '../components/AppLogo';

interface UpdatePasswordViewProps {
    onPasswordUpdated: () => void;
}

const UpdatePasswordView: React.FC<UpdatePasswordViewProps> = ({ onPasswordUpdated }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handlePasswordUpdate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);
    setMessage('');
    setError('');

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
    } else {
      setMessage('¡Su contraseña ha sido actualizada con éxito! Ahora puede iniciar sesión.');
      setTimeout(() => {
        onPasswordUpdated();
      }, 3000);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md mx-auto bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 sm:p-12">
        <AppLogo className="w-32 h-16 mx-auto mb-6" />
        <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-gray-100 mb-4">Establecer Nueva Contraseña</h2>
        
        {message ? (
          <p className="text-center text-green-600 dark:text-green-400">{message}</p>
        ) : (
          <form onSubmit={handlePasswordUpdate} className="space-y-4">
            <Input
              label="Nueva Contraseña"
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
            <Input
              label="Confirmar Nueva Contraseña"
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
            <Button type="submit" variant="primary" className="w-full" disabled={loading}>
              {loading ? 'Actualizando...' : 'Actualizar Contraseña'}
            </Button>
            {error && <p className="mt-4 text-center text-sm text-red-500">{error}</p>}
          </form>
        )}
      </div>
    </div>
  );
};

export default UpdatePasswordView;