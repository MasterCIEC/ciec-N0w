import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { UserProfile } from '../types';

export const useUsers = () => {
    return useQuery({
        queryKey: ['users'],
        queryFn: async () => {
            const { data, error } = await supabase.from('userprofiles').select('*');
            if (error) throw error;
            return (data || []) as UserProfile[];
        },
        staleTime: 1000 * 60 * 10,
    });
};

export const useUserMutations = () => {
    const queryClient = useQueryClient();

    const updateUserProfile = useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: Partial<UserProfile> }) => {
            const { data, error } = await supabase
                .from('userprofiles')
                .update(updates)
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return data as UserProfile;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
    });

    const deleteUser = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('userprofiles')
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
    });

    return { updateUserProfile, deleteUser };
};
