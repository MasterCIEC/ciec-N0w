import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, eventFromSupabase, eventToSupabase, eventToSupabaseForUpdate } from '../supabaseClient';
import { Event } from '../types';

export const useEvents = () => {
    return useQuery({
        queryKey: ['events'],
        queryFn: async () => {
            const { data: rawEventsData, error: rawEventsError } = await supabase.from('events').select('*');
            if (rawEventsError) throw rawEventsError;
            if (!rawEventsData) return [];

            // Fetch relations for organizer type determination
            const { data: eocData } = await supabase.from('event_organizing_commissions').select('*');
            const { data: eocaData } = await supabase.from('event_organizing_categories').select('*');

            return rawEventsData.map(dbEvent => {
                const baseEvent = eventFromSupabase(dbEvent);
                let determinedOrganizerType: 'meeting_category' | 'category' = 'meeting_category';
                if (eocData?.some((link) => link.event_id === baseEvent.id)) determinedOrganizerType = 'meeting_category';
                else if (eocaData?.some((link) => link.event_id === baseEvent.id)) determinedOrganizerType = 'category';
                return { ...baseEvent, organizerType: determinedOrganizerType } as Event;
            });
        },
        staleTime: 1000 * 60 * 5,
    });
};

export const useEventMutations = () => {
    const queryClient = useQueryClient();

    const createEvent = useMutation({
        mutationFn: async (event: Omit<Event, 'id' | 'createdAt' | 'updatedAt' | 'lastUpdated'>) => {
            const dbEvent = eventToSupabase(event as Event);
            const { data, error } = await supabase.from('events').insert(dbEvent).select().single();
            if (error) throw error;
            return eventFromSupabase(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['events'] });
        },
    });

    const updateEvent = useMutation({
        mutationFn: async (event: Event) => {
            const dbEvent = eventToSupabaseForUpdate(event);
            const { data, error } = await supabase.from('events').update(dbEvent).eq('id', event.id).select().single();
            if (error) throw error;
            return eventFromSupabase(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['events'] });
        },
    });

    const deleteEvent = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('events').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['events'] });
        },
    });

    const createComplexEvent = useMutation({
        mutationFn: async (params: {
            eventData: Omit<Event, 'id'>,
            schedules: { date: string, startTime: string, endTime: string }[],
            selectedOrganizerIds: string[],
            inviteeIds: string[],
            attendeesInPersonIds: string[],
            attendeesOnlineIds: string[]
        }) => {
            const { eventData, schedules, selectedOrganizerIds, inviteeIds, attendeesInPersonIds, attendeesOnlineIds } = params;

            const eventsToCreate = schedules.length > 0 ? schedules.map(sch => ({
                ...eventData,
                date: sch.date,
                startTime: sch.startTime,
                endTime: sch.endTime,
            })) : [eventData];

            const payload = eventsToCreate.map(e => eventToSupabase(e as Event)); // cast as Event partial
            const { data: newEvents, error } = await supabase.from('events').insert(payload).select('id');

            if (error) throw error;
            if (!newEvents) return;

            const orgCommPayload: any[] = [];
            const orgCatPayload: any[] = [];
            const inviteePayload: any[] = [];
            const attendeePayload: any[] = [];

            for (const newEvent of newEvents) {
                if (eventData.organizerType === 'meeting_category') {
                    selectedOrganizerIds.forEach(oid => orgCommPayload.push({ event_id: newEvent.id, commission_id: oid }));
                } else {
                    selectedOrganizerIds.forEach(oid => orgCatPayload.push({ event_id: newEvent.id, category_id: oid }));
                }
                inviteeIds.forEach(pid => inviteePayload.push({ event_id: newEvent.id, participant_id: pid }));
                attendeesInPersonIds.forEach(pid => attendeePayload.push({ event_id: newEvent.id, participant_id: pid, attendance_type: 'in_person' }));
                attendeesOnlineIds.forEach(pid => attendeePayload.push({ event_id: newEvent.id, participant_id: pid, attendance_type: 'online' }));
            }

            if (orgCommPayload.length) await supabase.from('event_organizing_commissions').insert(orgCommPayload);
            if (orgCatPayload.length) await supabase.from('event_organizing_categories').insert(orgCatPayload);
            if (inviteePayload.length) await supabase.from('event_invitees').insert(inviteePayload);
            if (attendeePayload.length) await supabase.from('event_attendees').insert(attendeePayload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['events'] });
            queryClient.invalidateQueries({ queryKey: ['eventOrganizingMeetingCategories'] });
            queryClient.invalidateQueries({ queryKey: ['eventOrganizingCategories'] });
            queryClient.invalidateQueries({ queryKey: ['eventInvitees'] });
            queryClient.invalidateQueries({ queryKey: ['eventAttendees'] });
        },
    });

    const updateComplexEvent = useMutation({
        mutationFn: async (params: {
            eventId: string,
            eventData: Omit<Event, 'id'>,
            selectedOrganizerIds: string[],
            inviteeIds: string[],
            attendeesInPersonIds: string[],
            attendeesOnlineIds: string[]
        }) => {
            const { eventId, eventData, selectedOrganizerIds, inviteeIds, attendeesInPersonIds, attendeesOnlineIds } = params;

            const { error } = await supabase.from('events').update(eventToSupabaseForUpdate(eventData as Event)).eq('id', eventId);
            if (error) throw error;

            // Relations update
            await supabase.from('event_organizing_commissions').delete().eq('event_id', eventId);
            await supabase.from('event_organizing_categories').delete().eq('event_id', eventId);

            if (eventData.organizerType === 'meeting_category') {
                if (selectedOrganizerIds.length) await supabase.from('event_organizing_commissions').insert(selectedOrganizerIds.map(oid => ({ event_id: eventId, commission_id: oid })));
            } else {
                if (selectedOrganizerIds.length) await supabase.from('event_organizing_categories').insert(selectedOrganizerIds.map(oid => ({ event_id: eventId, category_id: oid })));
            }

            await supabase.from('event_invitees').delete().eq('event_id', eventId);
            if (inviteeIds.length) await supabase.from('event_invitees').insert(inviteeIds.map(pid => ({ event_id: eventId, participant_id: pid })));

            await supabase.from('event_attendees').delete().eq('event_id', eventId);
            const attendeesPayload: any[] = [];
            attendeesInPersonIds.forEach(pid => attendeesPayload.push({ event_id: eventId, participant_id: pid, attendance_type: 'in_person' }));
            attendeesOnlineIds.forEach(pid => attendeesPayload.push({ event_id: eventId, participant_id: pid, attendance_type: 'online' }));
            if (attendeesPayload.length > 0) await supabase.from('event_attendees').insert(attendeesPayload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['events'] });
            queryClient.invalidateQueries({ queryKey: ['eventOrganizingMeetingCategories'] });
            queryClient.invalidateQueries({ queryKey: ['eventOrganizingCategories'] });
            queryClient.invalidateQueries({ queryKey: ['eventInvitees'] });
            queryClient.invalidateQueries({ queryKey: ['eventAttendees'] });
        },
    });

    const deleteComplexEvent = useMutation({
        mutationFn: async (eventId: string) => {
            // Manual cascade for safety
            await supabase.from('event_organizing_commissions').delete().eq('event_id', eventId);
            await supabase.from('event_organizing_categories').delete().eq('event_id', eventId);
            await supabase.from('event_invitees').delete().eq('event_id', eventId);
            await supabase.from('event_attendees').delete().eq('event_id', eventId);
            const { error } = await supabase.from('events').delete().eq('id', eventId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['events'] });
            queryClient.invalidateQueries({ queryKey: ['eventOrganizingMeetingCategories'] });
            queryClient.invalidateQueries({ queryKey: ['eventOrganizingCategories'] });
            queryClient.invalidateQueries({ queryKey: ['eventInvitees'] });
            queryClient.invalidateQueries({ queryKey: ['eventAttendees'] });
        },
    });

    return { createEvent, updateEvent, deleteEvent, createComplexEvent, updateComplexEvent, deleteComplexEvent };
};
