
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, taskFromSupabase, taskToSupabase, taskToSupabaseForUpdate } from '../supabaseClient';
import { Task, TaskAssignment, TaskUserAssignment, TaskSchedule } from '../types';

export const useTasks = () => {
    return useQuery({
        queryKey: ['tasks'],
        queryFn: async () => {
            const { data, error } = await supabase.from('tasks').select('*');
            if (error) throw error;
            return (data || []).map(taskFromSupabase);
        },
        staleTime: 1000 * 60 * 5,
    });
};

export const useTaskAssignments = () => {
    return useQuery({
        queryKey: ['taskAssignments'],
        queryFn: async () => {
            const { data, error } = await supabase.from('task_assignments').select('*');
            if (error) throw error;
            // The table likely uses task_id, participant_id
            return (data || []) as TaskAssignment[];
        },
        staleTime: 1000 * 60 * 5,
    });
};

export const useTaskUserAssignments = () => {
    return useQuery({
        queryKey: ['taskUserAssignments'],
        queryFn: async () => {
            const { data, error } = await supabase.from('task_user_assignments').select('*');
            if (error) throw error;
            return (data || []) as TaskUserAssignment[];
        },
        staleTime: 1000 * 60 * 5,
    });
};

export const useTaskSchedules = () => {
    return useQuery({
        queryKey: ['taskSchedules'],
        queryFn: async () => {
            const { data, error } = await supabase.from('task_schedules').select('*');
            if (error) throw error;
            return (data || []) as TaskSchedule[];
        },
        staleTime: 1000 * 60 * 5,
    });
};

export const useTaskMutations = () => {
    const queryClient = useQueryClient();

    // Complex Create: Task + Assignments + Schedules
    const createTask = useMutation({
        mutationFn: async ({ task, participantIds, userIds, schedules }: {
            task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'lastUpdated'>,
            participantIds: string[],
            userIds: string[],
            schedules: Omit<TaskSchedule, 'id' | 'task_id'>[]
        }) => {
            // 1. Create Task
            const dbTask = taskToSupabase(task as Task);
            const { data: createdTask, error: taskError } = await supabase.from('tasks').insert(dbTask).select().single();
            if (taskError) throw taskError;
            if (!createdTask) throw new Error("Failed to create task");

            const taskId = createdTask.id;

            // 2. Create Participant Assignments
            if (participantIds.length > 0) {
                const assignments = participantIds.map(pid => ({ task_id: taskId, participant_id: pid }));
                const { error: paError } = await supabase.from('task_assignments').insert(assignments);
                if (paError) throw paError;
            }

            // 3. Create User Assignments
            if (userIds.length > 0) {
                const userAssignments = userIds.map(uid => ({ task_id: taskId, user_id: uid }));
                const { error: uaError } = await supabase.from('task_user_assignments').insert(userAssignments);
                if (uaError) throw uaError;
            }

            // 4. Create Schedules
            if (schedules.length > 0) {
                const dbSchedules = schedules.map(s => ({ ...s, task_id: taskId }));
                const { error: sError } = await supabase.from('task_schedules').insert(dbSchedules);
                if (sError) throw sError;
            }

            return taskFromSupabase(createdTask);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            queryClient.invalidateQueries({ queryKey: ['taskAssignments'] });
            queryClient.invalidateQueries({ queryKey: ['taskUserAssignments'] });
            queryClient.invalidateQueries({ queryKey: ['taskSchedules'] });
        },
    });

    // Complex Update: Task + Sync Relations
    const updateTask = useMutation({
        mutationFn: async ({ task, participantIds, userIds, schedules }: {
            task: Task,
            participantIds: string[],
            userIds: string[],
            schedules: Omit<TaskSchedule, 'id' | 'task_id'>[]
        }) => {
            const taskId = task.id;

            // 1. Update Task Details
            const dbTask = taskToSupabaseForUpdate(task);
            const { error: taskError } = await supabase.from('tasks').update(dbTask).eq('id', taskId);
            if (taskError) throw taskError;

            // 2. Sync Participant Assignments
            // Delete existing
            await supabase.from('task_assignments').delete().eq('task_id', taskId);
            // Insert new
            if (participantIds.length > 0) {
                const assignments = participantIds.map(pid => ({ task_id: taskId, participant_id: pid }));
                const { error: paError } = await supabase.from('task_assignments').insert(assignments);
                if (paError) throw paError;
            }

            // 3. Sync User Assignments
            await supabase.from('task_user_assignments').delete().eq('task_id', taskId);
            if (userIds.length > 0) {
                const userAssignments = userIds.map(uid => ({ task_id: taskId, user_id: uid }));
                const { error: uaError } = await supabase.from('task_user_assignments').insert(userAssignments);
                if (uaError) throw uaError;
            }

            // 4. Sync Schedules
            // This is trickier if we want to keep IDs of existing schedules, but for simplicity, we replace them
            // Or we could try to be smarter, but full replace is safer for consistency if the UI sends full state
            await supabase.from('task_schedules').delete().eq('task_id', taskId);
            if (schedules.length > 0) {
                const dbSchedules = schedules.map(s => ({ ...s, task_id: taskId }));
                const { error: sError } = await supabase.from('task_schedules').insert(dbSchedules);
                if (sError) throw sError;
            }

            return task;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            queryClient.invalidateQueries({ queryKey: ['taskAssignments'] });
            queryClient.invalidateQueries({ queryKey: ['taskUserAssignments'] });
            queryClient.invalidateQueries({ queryKey: ['taskSchedules'] });
        },
    });

    const deleteTask = useMutation({
        mutationFn: async (id: string) => {
            // Relations should cascade delete if DB is configured correctly, but we can delete manually to be safe
            // Assuming DB cascade is ON for simplicity or handled by Supabase
            const { error } = await supabase.from('tasks').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            queryClient.invalidateQueries({ queryKey: ['taskAssignments'] });
            queryClient.invalidateQueries({ queryKey: ['taskUserAssignments'] });
            queryClient.invalidateQueries({ queryKey: ['taskSchedules'] });
        },
    });

    return { createTask, updateTask, deleteTask };
};
