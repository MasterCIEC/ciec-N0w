
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { MeetingCategory } from '../types';

export const useMeetingCategories = () => {
    return useQuery({
        queryKey: ['meetingCategories'],
        queryFn: async () => {
            const { data, error } = await supabase.from('commissions').select('*');
            if (error) throw error;
            return (data || []) as MeetingCategory[];
        },
        staleTime: 1000 * 60 * 30, // 30 mins
    });
};

export const useMeetingCategoryMutations = () => {
    const queryClient = useQueryClient();

    const createMeetingCategory = useMutation({
        mutationFn: async (category: Omit<MeetingCategory, 'id'> & { id?: string }) => {
            const { data, error } = await supabase.from('commissions').insert([{ id: category.id, name: category.name }]).select().single();
            if (error) throw error;
            return data as MeetingCategory;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['meetingCategories'] });
        }
    });

    const updateMeetingCategory = useMutation({
        mutationFn: async (category: MeetingCategory) => {
            const { data, error } = await supabase.from('commissions').update({ name: category.name }).eq('id', category.id).select().single();
            if (error) throw error;
            return data as MeetingCategory;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['meetingCategories'] });
        }
    });

    const deleteMeetingCategory = useMutation({
        mutationFn: async (categoryId: string) => {
            const { error } = await supabase.from('commissions').delete().eq('id', categoryId);
            if (error) throw error;
            return true;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['meetingCategories'] });
        }
    });

    return { createMeetingCategory, updateMeetingCategory, deleteMeetingCategory };
};
