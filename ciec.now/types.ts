
import React from 'react';

export enum ViewKey {
  ScheduleMeeting = 'SCHEDULE_MEETING',
  Participants = 'PARTICIPANTS',
  Companies = 'COMPANIES',
  Agenda = 'AGENDA',
  ManageMeetingCategories = 'MANAGE_MEETING_CATEGORIES',
  ManageEvents = 'MANAGE_EVENTS',
  ManageEventCategories = 'MANAGE_EVENT_CATEGORIES',
  StatsView = 'STATS_VIEW',
  ReportsView = 'REPORTS_VIEW',
  AdminUsersView = 'ADMIN_USERS_VIEW',
  AccountView = 'ACCOUNT_VIEW',
  Departments = 'DEPARTMENTS',
  Tasks = 'TASKS',
  AssistanceLogs = 'ASSISTANCE_LOGS',
  Communications = 'COMMUNICATIONS',
}

export interface MenuItem {
  id: string;
  name: string;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  viewKey: ViewKey;
  description?: string;
}

export interface MeetingCategory {
  id: string;
  name: string;
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string | null;
  updatedBy?: string | null;
}

export interface Department {
  id: string;
  name: string;
  description?: string | null;
  is_active: boolean;
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string | null;
  updatedBy?: string | null;
}

export interface TaskSchedule {
  id: string;
  task_id: string;
  date: string;
  start_time: string;
  end_time: string;
}

export interface ScheduleEntry {
  date: string;
  startTime: string;
  endTime: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  department_id?: string | null;
  created_by?: string;
  createdAt?: string;
  updatedAt?: string | null;
}

export interface TaskAssignment {
  task_id: string;
  participant_id: string;
}

export interface TaskUserAssignment {
  task_id: string;
  user_id: string;
}

export interface ParticipantDepartment {
  participant_id: string;
  department_id: string;
}

export interface UserDepartment {
  user_id: string;
  department_id: string;
}

export interface Company {
  id_establecimiento: string;
  nombre_establecimiento: string;
  rif_compania: string;
  email_principal: string | null;
  telefono_principal_1: string | null;
  nombre_municipio: string | null;
  rif_gremio?: string | null;
  es_afiliado_ciec?: boolean;
}

// New Interface for Assistance Logs
export interface AssistanceLog {
  id: string;
  subject: string;
  date: string;
  startTime: string | null;
  endTime?: string | null;
  client_name: string;
  company_id?: string | null;
  institution_text?: string | null;
  phone?: string | null;
  email?: string | null;
  channel: 'Presencial' | 'Llamada' | 'Whatsapp' | 'Correo' | 'Redes Sociales' | 'Otro';
  outcome?: string | null;
  responsible_id: string;
  createdAt?: string;
}

export interface CommunicationLog {
  id: string;
  direction: 'inbound' | 'outbound';
  internal_dept_id?: string | null;
  department?: Department; // Join
  external_company_id?: string | null;
  company?: Company; // Join
  external_party_name?: string | null;
  reference_code?: string | null;
  subject: string;
  date: string;
  file_url?: string | null;
  status: 'pending' | 'processing' | 'completed' | 'archived';
  created_at?: string;
  created_by?: string;
}

export interface Participant {
  id: string;
  name: string;
  id_establecimiento?: string | null;
  role: string | null;
  email: string | null;
  phone?: string | null;
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string | null;
  updatedBy?: string | null;
}

export interface Meeting {
  id: string;
  subject: string;
  meetingCategoryId: string;
  date: string;
  startTime: string | null;
  endTime?: string;
  location?: string | null;
  externalParticipantsCount?: number;
  description?: string | null;
  is_cancelled: boolean;
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string | null;
  updatedBy?: string | null;
}

export interface EventCategory {
  id: string;
  name: string;
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string | null;
  updatedBy?: string | null;
}

export interface Event {
  id: string;
  subject: string;
  organizerType: 'meeting_category' | 'category';
  date: string;
  startTime: string;
  endTime?: string;
  location?: string | null;
  externalParticipantsCount?: number;
  description?: string | null;
  cost?: number;
  investment?: number;
  revenue?: number;
  is_cancelled: boolean;
  flyer_url?: string;
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string | null;
  updatedBy?: string | null;
}

export interface ParticipantMeetingCategory {
  participant_id: string;
  meeting_category_id: string;
}

export interface MeetingAttendee {
  meeting_id: string;
  participant_id: string;
  attendance_type: 'in_person' | 'online';
}

export interface MeetingInvitee {
  meeting_id: string;
  participant_id: string;
}

export interface EventAttendee {
  event_id: string;
  participant_id: string;
  attendance_type: 'in_person' | 'online';
}

export interface EventInvitee {
  event_id: string;
  participant_id: string;
}

export interface EventOrganizingMeetingCategory {
  event_id: string;
  meeting_category_id: string;
}

export interface EventOrganizingCategory {
  event_id: string;
  category_id: string;
}

export interface Role {
  id: number;
  name: string;
}

export interface Permission {
  id: number;
  action: string;
  subject: string;
}

export interface RolePermission {
  role_id: number;
  permission_id: number;
}

export interface UserProfile {
  id: string;
  full_name: string | null;
  is_approved: boolean;
  role_id: number | null;
  roles?: Role;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'accent' | 'info' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  prefix?: string;
  containerClassName?: string;
}

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string | number; label: string }[];
}

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}