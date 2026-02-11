import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/ui/Button';
import AppLogo from '../components/AppLogo';

const PendingApprovalView: React.FC = () => {
  const { signOut, user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md mx-auto bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 text-center">
        <AppLogo className="w-40 h-20 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">Cuenta Pendiente de Aprobación</h1>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Gracias por registrarte, {user?.email}. Tu cuenta ha sido creada y está esperando la aprobación de un administrador. Recibirás una notificación una vez que sea activada.
        </p>
        <Button onClick={() => signOut()} variant="secondary">
          Cerrar Sesión
        </Button>
      </div>
    </div>
  );
};

export default PendingApprovalView;
