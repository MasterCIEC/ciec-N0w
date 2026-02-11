import { useQuery } from '@tanstack/react-query';
import { supabase, taskScheduleFromSupabase } from '../supabaseClient';

export const useTaskSchedules = () => {
    return useQuery({
        queryKey: ['taskSchedules'],
        queryFn: async () => {
            const { data, error } = await supabase.from('task_schedules').select('*');
            if (error) throw error;
            return (data || []).map(taskScheduleFromSupabase);
        },
        staleTime: 1000 * 60 * 5,
    });
};
