import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';

export const useEventRelations = () => {
    const organizingMeetingCategories = useQuery({
        queryKey: ['eventOrganizingMeetingCategories'],
        queryFn: async () => {
            const { data, error } = await supabase.from('event_organizing_commissions').select('*');
            if (error) throw error;
            return (data || []).map((d: any) => ({ event_id: d.event_id, meeting_category_id: d.commission_id }));
        },
        staleTime: 1000 * 60 * 5,
    });

    const organizingCategories = useQuery({
        queryKey: ['eventOrganizingCategories'],
        queryFn: async () => {
            const { data, error } = await supabase.from('event_organizing_categories').select('*');
            if (error) throw error;
            return (data || []) as any[]; // Type should be EventOrganizingCategory
        },
        staleTime: 1000 * 60 * 5,
    });

    return {
        eventOrganizingMeetingCategories: organizingMeetingCategories.data || [],
        eventOrganizingCategories: organizingCategories.data || [],
        isLoading: organizingMeetingCategories.isLoading || organizingCategories.isLoading
    };
};
