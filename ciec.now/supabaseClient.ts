
// supabaseClient.ts

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Company, Meeting, Participant, Event, Department, Task, TaskSchedule, AssistanceLog } from './types';

export type Database = {
  public: {
    Tables: {
      assistance_logs: {
        Row: {
          id: string;
          subject: string;
          date: string;
          start_time: string | null;
          end_time: string | null;
          client_name: string;
          company_id: string | null;
          institution_text: string | null;
          phone: string | null;
          email: string | null;
          channel: string;
          outcome: string | null;
          responsible_id: string;
          created_at: string
        };
        Insert: {
          id?: string;
          subject: string;
          date: string;
          start_time?: string | null;
          end_time?: string | null;
          client_name: string;
          company_id?: string | null;
          institution_text?: string | null;
          phone?: string | null;
          email?: string | null;
          channel: string;
          outcome?: string | null;
          responsible_id: string
        };
        Update: {
          subject?: string;
          date?: string;
          start_time?: string | null;
          end_time?: string | null;
          client_name?: string;
          company_id?: string | null;
          institution_text?: string | null;
          phone?: string | null;
          email?: string | null;
          channel?: string;
          outcome?: string | null;
          responsible_id?: string
        };
        Relationships: [
          {
            foreignKeyName: "assistance_logs_company_id_fkey",
            columns: ["company_id"],
            referencedRelation: "directorio_empresas",
            referencedColumns: ["id_establecimiento"]
          },
          {
            foreignKeyName: "assistance_logs_responsible_id_fkey",
            columns: ["responsible_id"],
            referencedRelation: "userprofiles",
            referencedColumns: ["id"]
          }
        ];
      },
      commissions: {
        Row: { id: string; name: string; is_active: boolean; created_at: string; updated_at: string | null; created_by: string | null; updated_by: string | null };
        Insert: { id?: string; name: string; is_active?: boolean };
        Update: { name?: string; is_active?: boolean };
        Relationships: [];
      },
      departments: {
        Row: { id: string; name: string; description: string | null; is_active: boolean; created_at: string; updated_at: string | null; created_by: string | null; updated_by: string | null };
        Insert: { id?: string; name: string; description?: string | null; is_active?: boolean };
        Update: { name?: string; description?: string | null; is_active?: boolean };
        Relationships: [];
      },
      user_departments: {
        Row: { user_id: string; department_id: string };
        Insert: { user_id: string; department_id: string };
        Update: { user_id?: string; department_id?: string };
        Relationships: [
          {
            foreignKeyName: "user_departments_department_id_fkey",
            columns: ["department_id"],
            referencedRelation: "departments",
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_departments_user_id_fkey",
            columns: ["user_id"],
            referencedRelation: "userprofiles",
            referencedColumns: ["id"]
          }
        ];
      },
      tasks: {
        Row: { id: string; title: string; description: string | null; status: 'pending' | 'in_progress' | 'completed'; priority: 'low' | 'medium' | 'high'; department_id: string | null; created_by: string | null; created_at: string; updated_at: string | null };
        Insert: { id?: string; title: string; description?: string | null; status?: 'pending' | 'in_progress' | 'completed'; priority?: 'low' | 'medium' | 'high'; department_id?: string | null; created_by?: string | null };
        Update: { title?: string; description?: string | null; status?: 'pending' | 'in_progress' | 'completed'; priority?: 'low' | 'medium' | 'high'; department_id?: string | null };
        Relationships: [
          {
            foreignKeyName: "tasks_department_id_fkey",
            columns: ["department_id"],
            referencedRelation: "departments",
            referencedColumns: ["id"]
          }
        ];
      },
      task_schedules: {
        Row: { id: string; task_id: string; date: string; start_time: string; end_time: string };
        Insert: { id?: string; task_id: string; date: string; start_time: string; end_time: string };
        Update: { task_id?: string; date?: string; start_time?: string; end_time?: string };
        Relationships: [
          {
            foreignKeyName: "task_schedules_task_id_fkey",
            columns: ["task_id"],
            referencedRelation: "tasks",
            referencedColumns: ["id"]
          }
        ];
      },
      task_assignments: {
        Row: { task_id: string; participant_id: string };
        Insert: { task_id: string; participant_id: string };
        Update: { task_id?: string; participant_id?: string };
        Relationships: [];
      },
      task_user_assignments: {
        Row: { task_id: string; user_id: string };
        Insert: { task_id: string; user_id: string };
        Update: { task_id?: string; user_id?: string };
        Relationships: [];
      },
      participant_departments: {
        Row: { participant_id: string; department_id: string };
        Insert: { participant_id: string; department_id: string };
        Update: { participant_id?: string; department_id?: string };
        Relationships: [];
      },
      participants: {
        Row: { id: string; name: string; id_establecimiento: string | null; role: string | null; email: string | null; phone: string | null; is_active: boolean; created_at: string; updated_at: string | null; created_by: string | null; updated_by: string | null };
        Insert: { id?: string; name: string; id_establecimiento?: string | null; role?: string | null; email?: string | null; phone?: string | null; is_active?: boolean };
        Update: { name?: string; id_establecimiento?: string | null; role?: string | null; email?: string | null; phone?: string | null; is_active?: boolean };
        Relationships: [
          {
            foreignKeyName: "participants_id_establecimiento_fkey",
            columns: ["id_establecimiento"],
            referencedRelation: "directorio_empresas",
            referencedColumns: ["id_establecimiento"]
          }
        ];
      },
      meetings: {
        Row: { id: string; subject: string; commission_id: string; date: string; start_time: string | null; end_time: string | null; location: string | null; external_participants_count: number | null; description: string | null; is_cancelled: boolean; created_at: string; updated_at: string | null; created_by: string | null; updated_by: string | null };
        Insert: { id?: string; subject: string; commission_id: string; date: string; start_time?: string | null; end_time?: string | null; location?: string | null; external_participants_count?: number | null; description?: string | null; is_cancelled?: boolean };
        Update: { subject?: string; commission_id?: string; date?: string; start_time?: string | null; end_time?: string | null; location?: string | null; external_participants_count?: number | null; description?: string | null; is_cancelled?: boolean };
        Relationships: [
          {
            foreignKeyName: "meetings_commission_id_fkey",
            columns: ["commission_id"],
            referencedRelation: "commissions",
            referencedColumns: ["id"]
          }
        ];
      },
      event_categories: {
        Row: { id: string; name: string; is_active: boolean; created_at: string; updated_at: string | null; created_by: string | null; updated_by: string | null };
        Insert: { id?: string; name: string; is_active?: boolean };
        Update: { name?: string; is_active?: boolean };
        Relationships: [];
      },
      events: {
        Row: { id: string; subject: string; date: string; start_time: string; end_time: string | null; location: string | null; external_participants_count: number | null; description: string | null; cost: number | null; investment: number | null; revenue: number | null; is_cancelled: boolean; flyer_url: string | null; created_at: string; updated_at: string | null; created_by: string | null; updated_by: string | null };
        Insert: { id?: string; subject: string; date: string; start_time: string; end_time?: string | null; location?: string | null; external_participants_count?: number | null; description?: string | null; cost?: number | null; investment?: number | null; revenue?: number | null; is_cancelled?: boolean; flyer_url?: string | null };
        Update: { subject?: string; date?: string; start_time?: string; end_time?: string | null; location?: string | null; external_participants_count?: number | null; description?: string | null; cost?: number | null; investment?: number | null; revenue?: number | null; is_cancelled?: boolean; flyer_url?: string | null };
        Relationships: [];
      },
      participant_commissions: {
        Row: { participant_id: string; commission_id: string };
        Insert: { participant_id: string; commission_id: string };
        Update: { participant_id?: string; commission_id?: string };
        Relationships: [];
      },
      meeting_attendees: {
        Row: { meeting_id: string; participant_id: string; attendance_type: "in_person" | "online" };
        Insert: { meeting_id: string; participant_id: string; attendance_type: "in_person" | "online" };
        Update: { meeting_id?: string; participant_id?: string; attendance_type?: "in_person" | "online" };
        Relationships: [];
      },
      meeting_invitees: {
        Row: { meeting_id: string; participant_id: string; };
        Insert: { meeting_id: string; participant_id: string; };
        Update: { meeting_id?: string; participant_id?: string; };
        Relationships: [];
      },
      event_attendees: {
        Row: { event_id: string; participant_id: string; attendance_type: "in_person" | "online" };
        Insert: { event_id: string; participant_id: string; attendance_type: "in_person" | "online" };
        Update: { event_id?: string; participant_id?: string; attendance_type?: "in_person" | "online" };
        Relationships: [];
      },
      event_invitees: {
        Row: { event_id: string; participant_id: string; };
        Insert: { event_id: string; participant_id: string; };
        Update: { event_id?: string; participant_id?: string; };
        Relationships: [];
      },
      event_organizing_commissions: {
        Row: { event_id: string; commission_id: string };
        Insert: { event_id: string; commission_id: string };
        Update: { event_id?: string; commission_id?: string };
        Relationships: [];
      },
      event_organizing_categories: {
        Row: { event_id: string; category_id: string };
        Insert: { event_id: string; category_id: string };
        Update: { event_id?: string; category_id?: string };
        Relationships: [];
      },
      roles: {
        Row: { id: number; name: string };
        Insert: { id?: number; name: string };
        Update: { name?: string };
        Relationships: [];
      },
      userprofiles: {
        Row: { id: string; full_name: string | null; role_id: number | null; is_approved: boolean };
        Insert: { id?: string; full_name?: string | null; role_id?: number | null; is_approved?: boolean };
        Update: { full_name?: string | null; role_id?: number | null; is_approved?: boolean };
        Relationships: [
          {
            foreignKeyName: "userprofiles_role_id_fkey",
            columns: ["role_id"],
            referencedRelation: "roles",
            referencedColumns: ["id"]
          }
        ];
      },
      permissions: {
        Row: { id: number; action: string; subject: string };
        Insert: { id?: number; action: string; subject: string };
        Update: { action?: string; subject?: string };
        Relationships: [];
      },
      communications_logs: {
        Row: {
          id: string;
          direction: 'inbound' | 'outbound';
          internal_dept_id: string | null;
          external_company_id: string | null;
          external_party_name: string | null;
          reference_code: string | null;
          subject: string;
          date: string;
          file_url: string | null;
          status: 'pending' | 'processing' | 'completed' | 'archived';
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          direction: 'inbound' | 'outbound';
          internal_dept_id?: string | null;
          external_company_id?: string | null;
          external_party_name?: string | null;
          reference_code?: string | null;
          subject: string;
          date: string;
          file_url?: string | null;
          status?: 'pending' | 'processing' | 'completed' | 'archived';
          created_by?: string | null;
        };
        Update: {
          direction?: 'inbound' | 'outbound';
          internal_dept_id?: string | null;
          external_company_id?: string | null;
          external_party_name?: string | null;
          reference_code?: string | null;
          subject?: string;
          date?: string;
          file_url?: string | null;
          status?: 'pending' | 'processing' | 'completed' | 'archived';
        };
        Relationships: [
          {
            foreignKeyName: "communications_logs_internal_dept_id_fkey",
            columns: ["internal_dept_id"],
            referencedRelation: "departments",
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_logs_external_company_id_fkey",
            columns: ["external_company_id"],
            referencedRelation: "directorio_empresas",
            referencedColumns: ["id_establecimiento"]
          },
          {
            foreignKeyName: "communications_logs_created_by_fkey",
            columns: ["created_by"],
            referencedRelation: "userprofiles",
            referencedColumns: ["id"]
          }
        ];
      },
      rolepermissions: {
        Row: { role_id: number; permission_id: number };
        Insert: { role_id: number; permission_id: number };
        Update: { role_id?: number; permission_id?: number };
        Relationships: [];
      }
    }
    Views: {
      directorio_empresas: {
        Row: {
          id_establecimiento: string;
          nombre_establecimiento: string;
          rif_compania: string;
          email_principal: string | null;
          telefono_principal_1: string | null;
          nombre_municipio: string | null;
          rif_gremio: string | null;
          es_afiliado_ciec: boolean;
        };
        Relationships: [];
      }
    }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}


const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase: SupabaseClient<Database> | null = null;

if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  try {
    supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (error) {
    console.error("Error inicializando Supabase:", error);
    supabase = null;
  }
} else {
  console.warn("Las variables de entorno de Supabase no están configuradas. La funcionalidad de base de datos estará deshabilitada.");
}

export const participantToSupabase = (participant: Omit<Participant, 'id'> & { id?: string }): Database['public']['Tables']['participants']['Insert'] => {
  const data: Database['public']['Tables']['participants']['Insert'] = { name: participant.name, id_establecimiento: participant.id_establecimiento || null, role: participant.role || null, email: participant.email?.trim() ? participant.email.trim() : null, phone: participant.phone || null, };
  if (participant.id) { data.id = participant.id; }
  return data;
};
export const participantToSupabaseForUpdate = (participant: Omit<Participant, 'id'>): Database['public']['Tables']['participants']['Update'] => ({ name: participant.name, id_establecimiento: participant.id_establecimiento || null, role: participant.role || null, email: participant.email?.trim() ? participant.email.trim() : null, phone: participant.phone || null, });
export const participantFromSupabase = (dbParticipant: any): Participant => ({ id: dbParticipant.id, name: dbParticipant.name, id_establecimiento: dbParticipant.id_establecimiento ?? null, role: dbParticipant.role ?? null, email: dbParticipant.email ?? null, phone: dbParticipant.phone ?? null, createdAt: dbParticipant.created_at, createdBy: dbParticipant.created_by, updatedAt: dbParticipant.updated_at, updatedBy: dbParticipant.updated_by });

export const meetingToSupabase = (meeting: Omit<Meeting, 'id'> & { id?: string }): Database['public']['Tables']['meetings']['Insert'] => {
  const data: Database['public']['Tables']['meetings']['Insert'] = { subject: meeting.subject, commission_id: meeting.meetingCategoryId, date: meeting.date, start_time: meeting.startTime || null, end_time: meeting.endTime || null, location: meeting.location || null, external_participants_count: meeting.externalParticipantsCount ?? null, description: meeting.description || null, is_cancelled: meeting.is_cancelled ?? false };
  if (meeting.id) { data.id = meeting.id; }
  return data;
};
export const meetingToSupabaseForUpdate = (meeting: Omit<Meeting, 'id'>): Database['public']['Tables']['meetings']['Update'] => ({ subject: meeting.subject, commission_id: meeting.meetingCategoryId, date: meeting.date, start_time: meeting.startTime || null, end_time: meeting.endTime || null, location: meeting.location || null, external_participants_count: meeting.externalParticipantsCount ?? null, description: meeting.description || null, is_cancelled: meeting.is_cancelled });
export const meetingFromSupabase = (dbMeeting: any): Meeting => ({ id: dbMeeting.id, subject: dbMeeting.subject, meetingCategoryId: dbMeeting.commission_id, date: dbMeeting.date, startTime: dbMeeting.start_time, endTime: dbMeeting.end_time, location: dbMeeting.location, externalParticipantsCount: dbMeeting.external_participants_count, description: dbMeeting.description, is_cancelled: dbMeeting.is_cancelled, createdAt: dbMeeting.created_at, createdBy: dbMeeting.created_by, updatedAt: dbMeeting.updated_at, updatedBy: dbMeeting.updated_by });

export const eventToSupabase = (event: Omit<Event, 'id'> & { id?: string }): Database['public']['Tables']['events']['Insert'] => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { organizerType, createdAt, createdBy, updatedAt, updatedBy, ...restOfEventData } = event;
  const data: Database['public']['Tables']['events']['Insert'] = { subject: restOfEventData.subject, date: restOfEventData.date, start_time: restOfEventData.startTime, end_time: restOfEventData.endTime || null, location: restOfEventData.location || null, external_participants_count: restOfEventData.externalParticipantsCount ?? null, description: restOfEventData.description || null, cost: restOfEventData.cost ?? null, investment: restOfEventData.investment ?? null, revenue: restOfEventData.revenue ?? null, is_cancelled: restOfEventData.is_cancelled ?? false, flyer_url: restOfEventData.flyer_url || null };
  if (restOfEventData.id) { data.id = restOfEventData.id; }
  return data;
};
export const eventToSupabaseForUpdate = (event: Omit<Event, 'id'>): Database['public']['Tables']['events']['Update'] => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { organizerType, createdAt, createdBy, updatedAt, updatedBy, ...restOfEventData } = event;
  return { subject: restOfEventData.subject, date: restOfEventData.date, start_time: restOfEventData.startTime, end_time: restOfEventData.endTime || null, location: restOfEventData.location || null, external_participants_count: restOfEventData.externalParticipantsCount ?? null, description: restOfEventData.description || null, cost: restOfEventData.cost ?? null, investment: restOfEventData.investment ?? null, revenue: restOfEventData.revenue ?? null, is_cancelled: restOfEventData.is_cancelled, flyer_url: restOfEventData.flyer_url };
};
export const eventFromSupabase = (dbEvent: any): Omit<Event, 'organizerType'> & { id: string } => ({ id: dbEvent.id, subject: dbEvent.subject, date: dbEvent.date, startTime: dbEvent.start_time, endTime: dbEvent.end_time, location: dbEvent.location, externalParticipantsCount: dbEvent.external_participants_count, description: dbEvent.description, cost: dbEvent.cost, investment: dbEvent.investment, revenue: dbEvent.revenue, is_cancelled: dbEvent.is_cancelled, flyer_url: dbEvent.flyer_url, createdAt: dbEvent.created_at, createdBy: dbEvent.created_by, updatedAt: dbEvent.updated_at, updatedBy: dbEvent.updated_by });

// --- Helpers for Departments and Tasks ---

export const departmentToSupabase = (department: Omit<Department, 'id'> & { id?: string }): Database['public']['Tables']['departments']['Insert'] => {
  const data: Database['public']['Tables']['departments']['Insert'] = { name: department.name, description: department.description || null, is_active: department.is_active };
  if (department.id) { data.id = department.id; }
  return data;
};

export const departmentFromSupabase = (dbDept: any): Department => ({
  id: dbDept.id,
  name: dbDept.name,
  description: dbDept.description,
  is_active: dbDept.is_active,
  createdAt: dbDept.created_at,
  updatedAt: dbDept.updated_at,
  createdBy: dbDept.created_by,
  updatedBy: dbDept.updated_by
});

export const taskToSupabase = (task: Omit<Task, 'id'> & { id?: string }): Database['public']['Tables']['tasks']['Insert'] => {
  const data: Database['public']['Tables']['tasks']['Insert'] = {
    title: task.title,
    description: task.description || null,
    status: task.status,
    priority: task.priority,
    department_id: task.department_id || null
  };
  if (task.id) { data.id = task.id; }
  return data;
};

export const taskToSupabaseForUpdate = (task: Omit<Task, 'id'>): Database['public']['Tables']['tasks']['Update'] => ({
  title: task.title,
  description: task.description || null,
  status: task.status,
  priority: task.priority,
  department_id: task.department_id || null
});

export const taskFromSupabase = (dbTask: any): Task => ({
  id: dbTask.id,
  title: dbTask.title,
  description: dbTask.description,
  status: dbTask.status,
  priority: dbTask.priority,
  department_id: dbTask.department_id,
  created_by: dbTask.created_by,
  createdAt: dbTask.created_at,
  updatedAt: dbTask.updated_at
});

export const taskScheduleFromSupabase = (dbSchedule: any): TaskSchedule => ({
  id: dbSchedule.id,
  task_id: dbSchedule.task_id,
  date: dbSchedule.date,
  start_time: dbSchedule.start_time,
  end_time: dbSchedule.end_time
});

// --- Helpers for Assistance Logs ---

export const assistanceLogToSupabase = (log: Omit<AssistanceLog, 'id'> & { id?: string }): Database['public']['Tables']['assistance_logs']['Insert'] => {
  const data: Database['public']['Tables']['assistance_logs']['Insert'] = {
    subject: log.subject,
    date: log.date,
    start_time: log.startTime || null,
    end_time: log.endTime || null,
    client_name: log.client_name,
    company_id: log.company_id || null,
    institution_text: log.institution_text || null,
    phone: log.phone || null,
    email: log.email || null,
    channel: log.channel,
    outcome: log.outcome || null,
    responsible_id: log.responsible_id
  };
  if (log.id) { data.id = log.id; }
  return data;
};

export const assistanceLogToSupabaseForUpdate = (log: Omit<AssistanceLog, 'id'>): Database['public']['Tables']['assistance_logs']['Update'] => ({
  subject: log.subject,
  date: log.date,
  start_time: log.startTime || null,
  end_time: log.endTime || null,
  client_name: log.client_name,
  company_id: log.company_id || null,
  institution_text: log.institution_text || null,
  phone: log.phone || null,
  email: log.email || null,
  channel: log.channel,
  outcome: log.outcome || null,
  responsible_id: log.responsible_id
});

export const assistanceLogFromSupabase = (dbLog: any): AssistanceLog => ({
  id: dbLog.id,
  subject: dbLog.subject,
  date: dbLog.date,
  startTime: dbLog.start_time,
  endTime: dbLog.end_time,
  client_name: dbLog.client_name,
  company_id: dbLog.company_id,
  institution_text: dbLog.institution_text,
  phone: dbLog.phone,
  email: dbLog.email,
  channel: dbLog.channel,
  outcome: dbLog.outcome,
  responsible_id: dbLog.responsible_id,
  createdAt: dbLog.created_at
});

export { supabase };