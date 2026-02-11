
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { EventCategory } from '../types';

export const useEventCategories = () => {
    return useQuery({
        queryKey: ['eventCategories'],
        queryFn: async () => {
            const { data, error } = await supabase.from('event_categories').select('*');
            if (error) throw error;
            return (data || []) as EventCategory[];
        },
        staleTime: 1000 * 60 * 30,
    });
};

export const useEventCategoryMutations = () => {
    const queryClient = useQueryClient();

    const createEventCategory = useMutation({
        mutationFn: async (category: { id?: string, name: string }) => {
            const payload = category.id ? { id: category.id, name: category.name } : { name: category.name };
            const { data, error } = await supabase.from('event_categories').insert([payload]).select().single();
            if (error) throw error;
            return data as EventCategory;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['eventCategories'] });
        },
    });

    const updateEventCategory = useMutation({
        mutationFn: async (category: EventCategory) => {
            const { data, error } = await supabase.from('event_categories').update({ name: category.name }).eq('id', category.id).select().single();
            if (error) throw error;
            return data as EventCategory;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['eventCategories'] });
        },
    });

    const deleteEventCategory = useMutation({
        mutationFn: async (categoryId: string) => {
            const { error } = await supabase.from('event_categories').delete().eq('id', categoryId);
            if (error) throw error;
            return true;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['eventCategories'] });
        },
    });

    return { createEventCategory, updateEventCategory, deleteEventCategory };
};
