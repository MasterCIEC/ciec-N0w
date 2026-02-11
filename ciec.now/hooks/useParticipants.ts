import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, participantFromSupabase, participantToSupabase, participantToSupabaseForUpdate } from '../supabaseClient';
import { Participant } from '../types';

export const useParticipants = () => {
    return useQuery({
        queryKey: ['participants'],
        queryFn: async () => {
            const { data, error } = await supabase.from('participants').select('*');
            if (error) throw error;
            return (data || []).map(participantFromSupabase);
        },
        staleTime: 1000 * 60 * 10,
    });
};

export const useParticipantMutations = () => {
    const queryClient = useQueryClient();

    const createParticipant = useMutation({
        mutationFn: async ({ participant, categoryIds, departmentIds }: { participant: Omit<Participant, 'id'>, categoryIds: string[], departmentIds: string[] }) => {
            // 1. Insert Participant
            const dbParticipant = participantToSupabase(participant as any);
            const { data: newParticipant, error: partError } = await supabase.from('participants').insert(dbParticipant).select().single();
            if (partError) throw partError;
            if (!newParticipant) throw new Error('Failed to create participant');

            const newId = newParticipant.id;

            // 2. Insert Categories (Commissions)
            if (categoryIds.length > 0) {
                const { error: catError } = await supabase.from('participant_commissions').insert(
                    categoryIds.map(cid => ({ participant_id: newId, commission_id: cid }))
                );
                if (catError) throw catError; // Note: if this fails, we have an inconsistency. In a real app, use stored procedures or RLS/Transactions if possible.
            }

            // 3. Insert Departments
            if (departmentIds.length > 0) {
                const { error: deptError } = await supabase.from('participant_departments').insert(
                    departmentIds.map(did => ({ participant_id: newId, department_id: did }))
                );
                if (deptError) throw deptError;
            }

            return participantFromSupabase(newParticipant);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['participants'] });
            queryClient.invalidateQueries({ queryKey: ['participantMeetingCategories'] });
            queryClient.invalidateQueries({ queryKey: ['participantDepartments'] });
        },
    });

    const updateParticipant = useMutation({
        mutationFn: async ({ id, participant, categoryIds, departmentIds }: { id: string, participant: Omit<Participant, 'id'>, categoryIds: string[], departmentIds: string[] }) => {
            // 1. Update Participant
            const dbParticipant = participantToSupabaseForUpdate(participant);
            const { data: updatedParticipant, error: partError } = await supabase.from('participants').update(dbParticipant).eq('id', id).select().single();
            if (partError) throw partError;

            // 2. Update Categories (Delete all and re-insert is simplest strategy here, or diffing)
            // Strategy: Delete all for this user, then insert new ones.
            await supabase.from('participant_commissions').delete().eq('participant_id', id);
            if (categoryIds.length > 0) {
                await supabase.from('participant_commissions').insert(
                    categoryIds.map(cid => ({ participant_id: id, commission_id: cid }))
                );
            }

            // 3. Update Departments
            await supabase.from('participant_departments').delete().eq('participant_id', id);
            if (departmentIds.length > 0) {
                await supabase.from('participant_departments').insert(
                    departmentIds.map(did => ({ participant_id: id, department_id: did }))
                );
            }

            return participantFromSupabase(updatedParticipant);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['participants'] });
            queryClient.invalidateQueries({ queryKey: ['participantMeetingCategories'] });
            queryClient.invalidateQueries({ queryKey: ['participantDepartments'] });
        },
    });

    const deleteParticipant = useMutation({
        mutationFn: async (id: string) => {
            // Relations should cascade delete if configured in DB, but we explicitly delete to be safe if not constrained
            await supabase.from('participant_commissions').delete().eq('participant_id', id);
            await supabase.from('participant_departments').delete().eq('participant_id', id);

            const { error } = await supabase.from('participants').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['participants'] });
            queryClient.invalidateQueries({ queryKey: ['participantMeetingCategories'] });
            queryClient.invalidateQueries({ queryKey: ['participantDepartments'] });
        },
    });

    return { createParticipant, updateParticipant, deleteParticipant };
};
