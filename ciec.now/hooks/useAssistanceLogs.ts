
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, assistanceLogFromSupabase } from '../supabaseClient';
import { AssistanceLog } from '../types';

export const useAssistanceLogs = () => {
    return useQuery({
        queryKey: ['assistanceLogs'],
        queryFn: async () => {
            const { data, error } = await supabase.from('assistance_logs').select('*');
            if (error) throw error;
            return (data || []).map(assistanceLogFromSupabase);
        },
        staleTime: 1000 * 60 * 5,
    });
};

export const useAssistanceLogMutations = () => {
    const queryClient = useQueryClient();

    const createAssistanceLog = useMutation({
        mutationFn: async (log: Omit<AssistanceLog, 'id'>) => {
            // Map to DB format (snake_case)
            const dbLog = {
                date: log.date,
                start_time: log.startTime,
                end_time: log.endTime,
                subject: log.subject,
                client_name: log.client_name,
                company_id: log.company_id,
                institution_text: log.institution_text,
                phone: log.phone,
                email: log.email,
                channel: log.channel,
                outcome: log.outcome,
                responsible_id: log.responsible_id
            };

            const { data, error } = await supabase
                .from('assistance_logs')
                .insert([dbLog])
                .select()
                .single();
            if (error) throw error;
            return assistanceLogFromSupabase(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['assistanceLogs'] });
        },
    });

    const updateAssistanceLog = useMutation({
        mutationFn: async (log: AssistanceLog) => {
            const dbLog = {
                date: log.date,
                start_time: log.startTime,
                end_time: log.endTime,
                subject: log.subject,
                client_name: log.client_name,
                company_id: log.company_id,
                institution_text: log.institution_text,
                phone: log.phone,
                email: log.email,
                channel: log.channel,
                outcome: log.outcome,
                responsible_id: log.responsible_id
            };

            const { data, error } = await supabase
                .from('assistance_logs')
                .update(dbLog)
                .eq('id', log.id)
                .select()
                .single();
            if (error) throw error;
            return assistanceLogFromSupabase(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['assistanceLogs'] });
        },
    });

    const deleteAssistanceLog = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('assistance_logs')
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['assistanceLogs'] });
        },
    });

    return {
        createAssistanceLog,
        updateAssistanceLog,
        deleteAssistanceLog,
    };
};
