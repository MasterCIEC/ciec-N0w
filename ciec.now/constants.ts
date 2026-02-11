
// constants.ts

import { MenuItem, ViewKey } from './types';
import ScheduleIcon from './components/icons/ScheduleIcon';
import AgendaIcon from './components/icons/AgendaIcon';
import ParticipantsIcon from './components/icons/ParticipantsIcon';
import CompaniesIcon from './components/icons/CompaniesIcon';
import MeetingCategoriesIcon from './components/icons/CommitteesIcon';
import EventsIcon from './components/icons/EventsIcon';
import EventCategoriesIcon from './components/icons/EventCategoriesIcon';
import StatsIcon from './components/icons/StatsIcon';
import ReportIcon from './components/icons/ReportIcon';
import AdminIcon from './components/icons/AdminIcon';
import UserIcon from './components/icons/UserIcon';
import DepartmentIcon from './components/icons/DepartmentIcon';
import TaskIcon from './components/icons/TaskIcon';
import MailIcon from './components/icons/MailIcon';
import AssistanceIcon from './components/icons/AssistanceIcon';

export const GALLERY_MENU_ITEMS: MenuItem[] = [
  {
    id: 'agenda',
    name: 'Agenda General',
    icon: AgendaIcon,
    viewKey: ViewKey.Agenda,
    description: 'Ver y gestionar las próximas reuniones y eventos en formato de calendario.'
  },
  {
    id: 'assistanceLogs',
    name: 'Atención al Cliente',
    icon: AssistanceIcon,
    viewKey: ViewKey.AssistanceLogs,
    description: 'Bitácora de registro de atención a clientes y afiliados.'
  },
  {
    id: 'communications',
    name: 'Comunicaciones',
    icon: MailIcon, // You'll need to export/import MailIcon or define it here if reusing constants is tricky without refactor
    viewKey: ViewKey.Communications,
    description: 'Control de correspondencia',
  },
  {
    id: 'tasks',
    name: 'Tareas',
    icon: TaskIcon,
    viewKey: ViewKey.Tasks,
    description: 'Gestión de tareas y asignaciones.'
  },
  {
    id: 'schedule',
    name: 'Programar Reunión',
    icon: ScheduleIcon,
    viewKey: ViewKey.ScheduleMeeting,
    description: 'Organizar nuevas reuniones para las diferentes categorías y gestionar las existentes.'
  },
  {
    id: 'events',
    name: 'Programar Eventos',
    icon: EventsIcon,
    viewKey: ViewKey.ManageEvents,
    description: 'Administrar eventos, ya sean por categoría de reunión o categorías generales, incluyendo detalles financieros.'
  },
  {
    id: 'departments',
    name: 'Departamentos',
    icon: DepartmentIcon,
    viewKey: ViewKey.Departments,
    description: 'Gestionar la estructura organizativa y sus participantes.'
  },
  {
    id: 'meetingCategories',
    name: 'Categorías de Reuniones',
    icon: MeetingCategoriesIcon,
    viewKey: ViewKey.ManageMeetingCategories,
    description: 'Administrar las diferentes categorías para las reuniones (ej. Junta Directiva, Comité Operativo).'
  },
  {
    id: 'eventCategories',
    name: 'Categorías de Eventos',
    icon: EventCategoriesIcon,
    viewKey: ViewKey.ManageEventCategories,
    description: 'Administrar categorías para eventos que no pertenecen a una categoría de reunión específica.'
  },
  {
    id: 'participants',
    name: 'Participantes',
    icon: ParticipantsIcon,
    viewKey: ViewKey.Participants,
    description: 'Gestionar la información de los participantes y su asignación a categorías de reuniones.'
  },
  {
    id: 'companies',
    name: 'Empresas Afiliadas',
    icon: CompaniesIcon,
    viewKey: ViewKey.Companies,
    description: 'Consultar el directorio de empresas afiliadas a la institución.'
  },
  {
    id: 'stats',
    name: 'Estadísticas',
    icon: StatsIcon,
    viewKey: ViewKey.StatsView,
    description: 'Visualizar estadísticas detalladas sobre asistencia y participación en comisiones.'
  },
  {
    id: 'reports',
    name: 'Reportes',
    icon: ReportIcon,
    viewKey: ViewKey.ReportsView,
    description: 'Generar y exportar resúmenes de actividad en formato PDF para un período determinado.'
  },
];

export const ADMIN_MENU_ITEMS: MenuItem[] = [
  {
    id: 'adminUsers',
    name: 'Gestionar Usuarios',
    icon: AdminIcon,
    viewKey: ViewKey.AdminUsersView,
    description: 'Aprobar nuevos usuarios, asignar roles y gestionar el acceso a la aplicación.'
  }
];

export const USER_MENU_ITEMS: MenuItem[] = [
  {
    id: 'account',
    name: 'Mi Cuenta',
    icon: UserIcon,
    viewKey: ViewKey.AccountView,
    description: 'Gestiona tu información personal, correo electrónico y contraseña.'
  }
];

export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
};
