
import React, { createContext, useState, useContext, useCallback, useRef, useEffect } from 'react';
import CheckIcon from '../components/icons/CheckIcon';
import CloseIcon from '../components/icons/CloseIcon';
import TrashIcon from '../components/icons/TrashIcon'; // Using Trash as generic error/alert icon fallback or we create a specific one

// Icono de Exclamación para Errores/Advertencias
const AlertCircleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
  </svg>
);

const InfoCircleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 01.67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 11-.671-1.34l.041-.022zM12 9a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
  </svg>
);

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface Notification {
  id: string;
  type: NotificationType;
  message: string;
}

interface NotificationContextType {
  notify: {
    success: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
    warning: (message: string) => void;
  };
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((type: NotificationType, message: string) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    setNotifications((prev) => [...prev, { id, type, message }]);

    // Auto-remove after 4 seconds
    setTimeout(() => {
      removeNotification(id);
    }, 4000);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const notify = {
    success: (message: string) => addNotification('success', message),
    error: (message: string) => addNotification('error', message),
    info: (message: string) => addNotification('info', message),
    warning: (message: string) => addNotification('warning', message),
  };

  return (
    <NotificationContext.Provider value={{ notify }}>
      {children}
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 w-full max-w-sm pointer-events-none px-4 sm:px-0">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`pointer-events-auto flex items-start p-4 rounded-lg shadow-lg border-l-4 transition-all duration-300 animate-slide-in-right bg-white dark:bg-slate-800 backdrop-blur-sm
              ${n.type === 'success' ? 'border-green-500' : ''}
              ${n.type === 'error' ? 'border-red-500' : ''}
              ${n.type === 'info' ? 'border-blue-500' : ''}
              ${n.type === 'warning' ? 'border-yellow-500' : ''}
            `}
            role="alert"
          >
            <div className="flex-shrink-0 mr-3">
              {n.type === 'success' && <CheckIcon className="w-6 h-6 text-green-500" />}
              {n.type === 'error' && <AlertCircleIcon className="w-6 h-6 text-red-500" />}
              {n.type === 'info' && <InfoCircleIcon className="w-6 h-6 text-blue-500" />}
              {n.type === 'warning' && <AlertCircleIcon className="w-6 h-6 text-yellow-500" />}
            </div>
            <div className="flex-1 mr-2">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{n.message}</p>
            </div>
            <button
              onClick={() => removeNotification(n.id)}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <CloseIcon className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes slide-in-right {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out forwards;
        }
      `}</style>
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
