import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';

const AccountView: React.FC = () => {
  const { user, profile, refreshSessionData } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState<'name' | 'email' | 'password' | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; content: string } | null>(null);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
    }
    if (user) {
      setEmail(user.email || '');
    }
  }, [profile, user]);


  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !supabase) return;
    setLoading('name');
    setMessage(null);

    try {
      // Update both auth user metadata and public profile table
      const { error: userError } = await supabase.auth.updateUser({ data: { full_name: fullName } });
      if (userError) throw userError;

      const { error: profileError } = await supabase.from('userprofiles').update({ full_name: fullName }).eq('id', user.id);
      if (profileError) throw profileError;

      await refreshSessionData();
      setMessage({ type: 'success', content: 'Nombre actualizado con éxito.' });
    } catch (error: any) {
      setMessage({ type: 'error', content: `Error al actualizar el nombre: ${error.message}` });
    } finally {
      setLoading(null);
    }
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setLoading('email');
    setMessage(null);
    try {
      const { error } = await supabase.auth.updateUser({ email });
      if (error) throw error;
      setMessage({ type: 'success', content: 'Se ha enviado un correo de confirmación a ambas direcciones de correo electrónico. Por favor, siga las instrucciones para completar el cambio.' });
    } catch (error: any) {
      setMessage({ type: 'error', content: `Error al actualizar el correo: ${error.message}` });
    } finally {
      setLoading(null);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setMessage({ type: 'error', content: 'Las contraseñas no coinciden.' });
      return;
    }
    if (password.length < 6) {
      setMessage({ type: 'error', content: 'La contraseña debe tener al menos 6 caracteres.' });
      return;
    }
    setLoading('password');
    setMessage(null);
    try {
      if (!supabase) return;
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setMessage({ type: 'success', content: 'Contraseña actualizada con éxito.' });
      setPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      setMessage({ type: 'error', content: `Error al actualizar la contraseña: ${error.message}` });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Mi Cuenta</h1>
      </div>

      {message && (
        <div className={`p-4 rounded-md text-sm ${message.type === 'success' ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200' : 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200'}`}>
          {message.content}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Información Personal</CardTitle>
            <CardDescription>Actualice su nombre y correo electrónico.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleUpdateName} className="space-y-4">
              <Input
                label="Nombre Completo"
                id="fullName"
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
              />
              <Button type="submit" disabled={loading === 'name'}>{loading === 'name' ? 'Actualizando...' : 'Actualizar Nombre'}</Button>
            </form>
            <form onSubmit={handleUpdateEmail} className="space-y-4 pt-6 border-t dark:border-slate-700">
              <Input
                label="Correo Electrónico"
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
              <Button type="submit" disabled={loading === 'email'}>{loading === 'email' ? 'Actualizando...' : 'Actualizar Correo'}</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cambiar Contraseña</CardTitle>
            <CardDescription>Elija una nueva contraseña segura.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <Input
                label="Nueva Contraseña"
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
              <Input
                label="Confirmar Nueva Contraseña"
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
              <Button type="submit" disabled={loading === 'password'}>{loading === 'password' ? 'Cambiando...' : 'Cambiar Contraseña'}</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AccountView;