
import React, { useState } from 'react';
import { ViewKey, UserProfile, MenuItem } from '../types';
import { GALLERY_MENU_ITEMS, ADMIN_MENU_ITEMS, USER_MENU_ITEMS } from '../constants';
import ThemeToggleButton, { Theme } from './ThemeToggleButton';
import { useAuth } from '../contexts/AuthContext';
import { usePeriod } from '../contexts/PeriodContext'; // Import context
import AppLogo from './AppLogo';
import AgendaIcon from './icons/AgendaIcon';
import ParticipantsIcon from './icons/ParticipantsIcon';
import PlusIcon from './icons/PlusIcon';
import MenuIcon from './icons/MenuIcon';
import CloseIcon from './icons/CloseIcon';
import ScheduleIcon from './icons/ScheduleIcon';
import EventsIcon from './icons/EventsIcon';
import DepartmentIcon from './icons/DepartmentIcon'; // Imported
import TaskIcon from './icons/TaskIcon'; // Imported
import MailIcon from './icons/MailIcon'; // Imported

interface NavigationProps {
  activeView: ViewKey;
  onNavigate: (viewKey: ViewKey) => void;
  currentTheme: Theme;
  toggleTheme: () => void;
  profile: UserProfile;
}

const filterMenuItems = (items: MenuItem[], can: (action: string, subject: string) => boolean, isSuperAdmin: boolean): MenuItem[] => {
  return items.filter(item => {
    switch (item.viewKey) {
      case ViewKey.StatsView:
      case ViewKey.ReportsView:
        return isSuperAdmin;
      case ViewKey.AdminUsersView:
        return can('manage', 'Users');
      case ViewKey.ScheduleMeeting:
        return can('create', 'Meeting') || can('read', 'Meeting') || can('update', 'Meeting') || can('delete', 'Meeting');
      case ViewKey.ManageEvents:
        return can('create', 'Event') || can('read', 'Event') || can('update', 'Event') || can('delete', 'Event');
      case ViewKey.ManageMeetingCategories:
        return can('create', 'Commission') || can('read', 'Commission') || can('update', 'Commission') || can('delete', 'Commission');
      case ViewKey.ManageEventCategories:
        return can('create', 'EventCategory') || can('read', 'EventCategory') || can('update', 'EventCategory') || can('delete', 'EventCategory');
      case ViewKey.Participants:
        return can('create', 'Participant') || can('read', 'Participant') || can('update', 'Participant') || can('delete', 'Participant');
      case ViewKey.Agenda:
        return can('read', 'Meeting') || can('read', 'Event');
      case ViewKey.Companies:
        return can('read', 'Participant');
      case ViewKey.Departments:
        return can('create', 'Department') || can('read', 'Department') || can('update', 'Department') || can('delete', 'Department');
      case ViewKey.Tasks:
        return can('create', 'Task') || can('read', 'Task') || can('update', 'Task') || can('delete', 'Task');
      case ViewKey.Communications:
        return can('read', 'Meeting'); // Using basic read permission for now, adjust as needed
      default:
        return true;
    }
  });
};

const Navigation: React.FC<NavigationProps> = ({ activeView, onNavigate, currentTheme, toggleTheme, profile }) => {
  const { signOut, can, isSuperAdmin } = useAuth(); // Using isSuperAdmin from context directly
  const { startYear, setStartYear, availablePeriods } = usePeriod();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const accessibleGalleryItems = filterMenuItems(GALLERY_MENU_ITEMS, can, isSuperAdmin);
  const accessibleAdminItems = filterMenuItems(ADMIN_MENU_ITEMS, can, isSuperAdmin);
  const accessibleUserItems = filterMenuItems(USER_MENU_ITEMS, can, isSuperAdmin);
  const allMenuItems = [...accessibleGalleryItems, ...accessibleAdminItems, ...accessibleUserItems];

  const handleNavigation = (view: ViewKey) => {
    onNavigate(view);
    setIsDrawerOpen(false);
  };

  const handleAddAction = (view: ViewKey) => {
    onNavigate(view);
    setIsAddModalOpen(false);
  }

  const periodSelector = (
    <div className="px-4 py-2">
      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Periodo Fiscal</label>
      <select
        value={startYear}
        onChange={(e) => setStartYear(parseInt(e.target.value))}
        className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-sm"
      >
        {availablePeriods.map(p => (
          <option key={p.startYear} value={p.startYear}>{p.label}</option>
        ))}
      </select>
    </div>
  );

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b dark:border-slate-700 flex items-center justify-center">
        <AppLogo className="w-32 h-16" />
      </div>

      {periodSelector}

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
        {allMenuItems.map(item => (
          <button
            key={item.id}
            onClick={() => handleNavigation(item.viewKey)}
            className={`group flex items-center w-full text-left px-3 py-2.5 rounded-xl transition-all duration-200 relative overflow-hidden ${activeView === item.viewKey
              ? 'bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-md shadow-primary-500/20'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-slate-700/50 hover:text-primary-600 dark:hover:text-primary-400'
              }`}
          >
            <div className={`absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity ${activeView === item.viewKey ? 'opacity-0' : ''}`} />
            <item.icon className={`w-5 h-5 mr-3 flex-shrink-0 transition-transform group-hover:scale-110 ${activeView === item.viewKey ? 'text-white' : 'text-gray-500 dark:text-gray-400 group-hover:text-primary-500 dark:group-hover:text-primary-400'}`} />
            <span className={`font-medium text-sm ${activeView === item.viewKey ? 'font-semibold' : ''}`}>{item.name}</span>
            {activeView === item.viewKey && (
              <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-white/80 animate-pulse" />
            )}
          </button>
        ))}
      </nav>
      <div className="p-4 border-t dark:border-slate-700 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Tema</span>
          <ThemeToggleButton currentTheme={currentTheme} toggleTheme={toggleTheme} />
        </div>
        <button
          onClick={() => signOut()}
          className="w-full text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 text-center py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
        >
          Cerrar Sesión
        </button>
      </div>
    </div>
  );

  const drawerContent = (
    <>
      <div className="flex items-center justify-between p-4 border-b dark:border-slate-700">
        <AppLogo className="w-24 h-12" />
        <button onClick={() => setIsDrawerOpen(false)} className="p-2">
          <CloseIcon className="w-6 h-6 text-gray-500 dark:text-gray-400" />
        </button>
      </div>

      {periodSelector}

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {allMenuItems.map(item => (
          <button
            key={item.id}
            onClick={() => handleNavigation(item.viewKey)}
            className={`flex items-center w-full text-left p-3 rounded-lg transition-colors duration-200 ${activeView === item.viewKey ? 'bg-primary-600 text-white' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
          >
            <item.icon className="w-6 h-6 mr-4" />
            <span className="font-medium">{item.name}</span>
          </button>
        ))}
      </nav>
      <div className="p-4 border-t dark:border-slate-700 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Tema</span>
          <ThemeToggleButton currentTheme={currentTheme} toggleTheme={toggleTheme} />
        </div>
        <button
          onClick={() => signOut()}
          className="w-full text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 text-center py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
        >
          Cerrar Sesión
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Sidebar for Desktop */}
      <aside className="hidden md:block fixed top-0 left-0 w-64 h-full bg-white dark:bg-slate-800 shadow-lg z-30">
        {sidebarContent}
      </aside>

      {/* Bottom Nav for Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-slate-800 border-t dark:border-slate-700 shadow-[0_-2px_5px_rgba(0,0,0,0.1)] grid grid-cols-4 items-center z-40">
        <button onClick={() => handleNavigation(ViewKey.Agenda)} className={`flex flex-col items-center justify-center h-full text-xs transition-colors ${activeView === ViewKey.Agenda ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400'}`}>
          <AgendaIcon className="w-6 h-6 mb-0.5" />
          Agenda
        </button>
        {(can('read', 'Task') || can('create', 'Task')) && (
          <button onClick={() => handleNavigation(ViewKey.Tasks)} className={`flex flex-col items-center justify-center h-full text-xs transition-colors ${activeView === ViewKey.Tasks ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400'}`}>
            <TaskIcon className="w-6 h-6 mb-0.5" />
            Tareas
          </button>
        )}
        <button onClick={() => setIsAddModalOpen(true)} className="flex flex-col items-center justify-center h-full text-xs text-gray-500 dark:text-gray-400">
          <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center text-white shadow-lg">
            <PlusIcon className="w-6 h-6" />
          </div>
        </button>
        <button onClick={() => setIsDrawerOpen(true)} className="flex flex-col items-center justify-center h-full text-xs text-gray-500 dark:text-gray-400">
          <MenuIcon className="w-6 h-6 mb-0.5" />
          Menú
        </button>
      </nav>

      {/* Drawer for Mobile */}
      <div className={`md:hidden fixed inset-0 z-50 transition-transform transform ${isDrawerOpen ? 'translate-x-0' : '-translate-x-full'} ease-in-out duration-300`}>
        <div className="absolute inset-0 bg-black/50" onClick={() => setIsDrawerOpen(false)}></div>
        <div className="relative w-64 h-full bg-white dark:bg-slate-800 shadow-lg flex flex-col">
          {drawerContent}
        </div>
      </div>

      {/* Add Action Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4" onClick={() => setIsAddModalOpen(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md p-4 mb-16" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100">Crear Nuevo</h3>
            <div className="space-y-3">
              {can('create', 'Meeting') && (
                <button onClick={() => handleAddAction(ViewKey.ScheduleMeeting)} className="w-full flex items-center p-3 rounded-lg text-left bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">
                  <ScheduleIcon className="w-6 h-6 mr-3 text-primary-600 dark:text-primary-400" />
                  <span className="font-medium text-gray-700 dark:text-gray-200">Programar Reunión</span>
                </button>
              )}
              {can('create', 'Event') && (
                <button onClick={() => handleAddAction(ViewKey.ManageEvents)} className="w-full flex items-center p-3 rounded-lg text-left bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">
                  <EventsIcon className="w-6 h-6 mr-3 text-green-600 dark:text-green-400" />
                  <span className="font-medium text-gray-700 dark:text-gray-200">Programar Evento</span>
                </button>
              )}
              {can('create', 'Task') && (
                <button onClick={() => handleAddAction(ViewKey.Tasks)} className="w-full flex items-center p-3 rounded-lg text-left bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">
                  <TaskIcon className="w-6 h-6 mr-3 text-orange-600 dark:text-orange-400" />
                  <span className="font-medium text-gray-700 dark:text-gray-200">Nueva Tarea</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navigation;
