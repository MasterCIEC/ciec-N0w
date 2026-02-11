
// App.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  ViewKey, UserProfile, Role, Permission, RolePermission,
  Meeting, Event, Task
} from './types';
import {
  supabase
} from './supabaseClient';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PeriodProvider } from './contexts/PeriodContext';
import { NotificationProvider, useNotification } from './contexts/NotificationContext';
import AuthView from './views/AuthView';
import PendingApprovalView from './views/PendingApprovalView';
import Navigation from './components/Navigation';
import ScheduleMeetingView from './views/ScheduleMeetingView';
import ParticipantsView from './views/ParticipantsView';
import CompaniesView from './views/CompaniesView';
import AgendaView from './views/AgendaView';
import ManageMeetingCategoriesView from './views/ManageCommitteesView';
import ManageEventsView from './views/ManageEventsView';
import ManageEventCategoriesView from './views/ManageEventCategoriesView';
import StatsView from './views/StatsView';
import ReportsView from './views/ReportsView';
import AdminUsersView from './views/AdminUsersView';
import UpdatePasswordView from './views/UpdatePasswordView';
import AccountView from './views/AccountView';
import DepartmentsView from './views/DepartmentsView';
import TasksView from './views/TasksView';
import AssistanceLogView from './views/AssistanceLogView'; // Import New View
import CommunicationsView from './views/CommunicationsView'; // New View
import { Theme } from './components/ThemeToggleButton';
import Button from './components/ui/Button';

const AppContent = () => {
  const { session, profile, loading, awaitingPasswordReset, setAwaitingPasswordReset } = useAuth();
  const { notify } = useNotification();

  // State removed in favor of React Query hooks in sub-components
  // Remaining global state for UI only
  const [activeView, setActiveView] = useState<ViewKey>(ViewKey.Agenda);

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);

  // Selection states for Edit
  const [meetingToEdit, setMeetingToEdit] = useState<Meeting | null>(null);
  const [eventToEdit, setEventToEdit] = useState<Event | null>(null);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

  const [theme, setTheme] = useState<Theme>(() => {
    const storedTheme = localStorage.getItem('theme') as Theme | null;
    if (storedTheme === 'light' || storedTheme === 'dark') return storedTheme;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    return 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  // Auth fetch logic kept here for now as User stuff is less critical for volume, 
  // though should be moved to hooks later too.
  const fetchUsersAndRoles = useCallback(async () => {
    if (!supabase) return;
    try {
      const { data: rolesData } = await supabase.from('roles').select('*').order('name');
      setRoles(rolesData || []);
      const { data: permData } = await supabase.from('permissions').select('*');
      setPermissions(permData || []);
      const { data: rolePermData } = await supabase.from('rolepermissions').select('*');
      setRolePermissions(rolePermData || []);
      const { data: usersData, error: usersError } = await supabase.from('userprofiles').select(`id, full_name, role_id, is_approved, roles (id, name)`);
      if (usersError) {
        const { data: usersSimple } = await supabase.from('userprofiles').select('*');
        setUsers((usersSimple as any) || []);
      } else {
        setUsers((usersData as any as UserProfile[]) || []);
      }
    } catch (err: any) {
      console.error("Error fetching users:", err.message);
      notify.error("Error cargando usuarios.");
    }
  }, [notify]);

  useEffect(() => {
    if (profile?.is_approved) {
      fetchUsersAndRoles();
    }
  }, [profile?.is_approved, fetchUsersAndRoles]);

  // ... (Auth/Loading states) ...
  if (loading) return <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-slate-900"><div className="text-xl font-semibold text-gray-700 dark:text-gray-200">Cargando...</div></div>;
  if (awaitingPasswordReset) return <UpdatePasswordView onPasswordUpdated={() => setAwaitingPasswordReset(false)} />;
  if (!session) return <AuthView />;
  if (!profile?.is_approved) return <PendingApprovalView />;

  const navigate = (viewKey: ViewKey) => {
    if (viewKey !== ViewKey.ScheduleMeeting) setMeetingToEdit(null);
    if (viewKey !== ViewKey.ManageEvents) setEventToEdit(null);
    if (viewKey !== ViewKey.Tasks) setTaskToEdit(null);
    setActiveView(viewKey);
  };

  const handleEditMeetingRequest = (meeting: Meeting) => {
    setMeetingToEdit(meeting);
    setActiveView(ViewKey.ScheduleMeeting);
  };

  const handleEditEventRequest = (event: Event) => {
    setEventToEdit(event);
    setActiveView(ViewKey.ManageEvents);
  };

  const handleEditTaskRequest = (task: Task) => {
    setTaskToEdit(task);
    setActiveView(ViewKey.Tasks);
  };



  const renderContent = () => {
    switch (activeView) {
      case ViewKey.Departments: return <DepartmentsView onNavigateBack={() => navigate(ViewKey.Agenda)} />;
      case ViewKey.Tasks: return <TasksView initialTaskToEdit={taskToEdit} onClearEditingTask={() => setTaskToEdit(null)} onNavigateBack={() => navigate(ViewKey.Agenda)} />;
      case ViewKey.AssistanceLogs: return <AssistanceLogView onNavigateBack={() => navigate(ViewKey.Agenda)} />;
      case ViewKey.Communications: return <CommunicationsView onNavigateBack={() => navigate(ViewKey.Agenda)} />;
      case ViewKey.Participants: return <ParticipantsView onNavigateBack={() => navigate(ViewKey.Agenda)} />;
      case ViewKey.ScheduleMeeting: return <ScheduleMeetingView initialMeetingToEdit={meetingToEdit} onClearEditingMeeting={() => setMeetingToEdit(null)} onNavigateBack={() => navigate(ViewKey.Agenda)} />;
      case ViewKey.ManageEvents: return <ManageEventsView initialEventToEdit={eventToEdit} onClearEditingEvent={() => setEventToEdit(null)} onNavigateBack={() => navigate(ViewKey.Agenda)} />;
      case ViewKey.Agenda: return <AgendaView onEditMeeting={handleEditMeetingRequest} onEditEvent={handleEditEventRequest} onEditTask={handleEditTaskRequest} />;
      case ViewKey.Companies: return <CompaniesView onNavigateBack={() => navigate(ViewKey.Agenda)} />;
      case ViewKey.ManageMeetingCategories: return <ManageMeetingCategoriesView onNavigateBack={() => navigate(ViewKey.Agenda)} />;
      case ViewKey.ManageEventCategories: return <ManageEventCategoriesView onNavigateBack={() => navigate(ViewKey.Agenda)} />;
      case ViewKey.StatsView: return <StatsView meetings={[]} participants={[]} companies={[]} meetingCategories={[]} meetingAttendees={[]} participantMeetingCategories={[]} events={[]} eventCategories={[]} eventAttendees={[]} eventOrganizingMeetingCategories={[]} eventOrganizingCategories={[]} taskSchedules={[]} tasks={[]} departments={[]} assistanceLogs={[]} />;
      case ViewKey.ReportsView: return <ReportsView meetings={[]} events={[]} participants={[]} companies={[]} meetingCategories={[]} eventCategories={[]} meetingAttendees={[]} eventAttendees={[]} eventOrganizingMeetingCategories={[]} eventOrganizingCategories={[]} assistanceLogs={[]} />;
      case ViewKey.AdminUsersView: return <AdminUsersView />;
      case ViewKey.AccountView: return <AccountView />;
      default: return <div>Vista no encontrada</div>;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-slate-900 text-gray-800 dark:text-gray-200">
      <Navigation activeView={activeView} onNavigate={navigate} currentTheme={theme} toggleTheme={toggleTheme} profile={profile as UserProfile} />
      <main className="flex-1 flex flex-col overflow-hidden md:ml-64">
        <div className="flex-1 overflow-x-hidden overflow-y-auto pb-16 md:pb-0 custom-scrollbar">{renderContent()}</div>
      </main>
    </div>
  );
};

const App = () => (
  <AuthProvider>
    <NotificationProvider>
      <PeriodProvider>
        <AppContent />
      </PeriodProvider>
    </NotificationProvider>
  </AuthProvider>
);

export default App;