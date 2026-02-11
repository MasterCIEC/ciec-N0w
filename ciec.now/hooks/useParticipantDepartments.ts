import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { ParticipantDepartment } from '../types';

export const useParticipantDepartments = () => {
    return useQuery({
        queryKey: ['participantDepartments'],
        queryFn: async () => {
            const { data, error } = await supabase.from('participant_departments').select('*');
            if (error) throw error;
            return (data || []) as ParticipantDepartment[];
        },
        staleTime: 1000 * 60 * 5,
    });
};
