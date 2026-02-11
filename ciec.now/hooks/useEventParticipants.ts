import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { EventAttendee, EventInvitee } from '../types';

export const useEventParticipants = () => {
    const attendees = useQuery({
        queryKey: ['eventAttendees'],
        queryFn: async () => {
            const { data, error } = await supabase.from('event_attendees').select('*');
            if (error) throw error;
            return (data || []) as EventAttendee[];
        },
        staleTime: 1000 * 60 * 5,
    });

    const invitees = useQuery({
        queryKey: ['eventInvitees'],
        queryFn: async () => {
            const { data, error } = await supabase.from('event_invitees').select('*');
            if (error) throw error;
            return (data || []) as EventInvitee[];
        },
        staleTime: 1000 * 60 * 5,
    });

    return {
        eventAttendees: attendees.data || [],
        eventInvitees: invitees.data || [],
        isLoading: attendees.isLoading || invitees.isLoading
    };
};
