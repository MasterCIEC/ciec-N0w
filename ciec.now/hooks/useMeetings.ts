
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, meetingFromSupabase, meetingToSupabase, meetingToSupabaseForUpdate } from '../supabaseClient';
import { Meeting, MeetingAttendee, MeetingInvitee, ScheduleEntry } from '../types';

export const useMeetings = () => {
    return useQuery({
        queryKey: ['meetings'],
        queryFn: async () => {
            const { data, error } = await supabase.from('meetings').select('*');
            if (error) throw error;
            return (data || []).map(meetingFromSupabase);
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
};

export const useMeetingAttendees = () => {
    return useQuery({
        queryKey: ['meetingAttendees'],
        queryFn: async () => {
            const { data, error } = await supabase.from('meeting_attendees').select('*');
            if (error) throw error;
            return (data || []) as MeetingAttendee[];
        },
        staleTime: 1000 * 60 * 5,
    });
};

export const useMeetingInvitees = () => {
    return useQuery({
        queryKey: ['meetingInvitees'],
        queryFn: async () => {
            const { data, error } = await supabase.from('meeting_invitees').select('*');
            if (error) throw error;
            return (data || []) as MeetingInvitee[];
        },
        staleTime: 1000 * 60 * 5,
    });
};

export const useMeetingMutations = () => {
    const queryClient = useQueryClient();

    const createMeeting = useMutation({
        mutationFn: async (meeting: Omit<Meeting, 'id' | 'createdAt' | 'updatedAt' | 'lastUpdated'>) => {
            const dbMeeting = meetingToSupabase(meeting as Meeting);
            const { data, error } = await supabase.from('meetings').insert(dbMeeting).select().single();
            if (error) throw error;
            return meetingFromSupabase(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['meetings'] });
        },
    });

    const updateMeeting = useMutation({
        mutationFn: async (meeting: Meeting) => {
            const dbMeeting = meetingToSupabaseForUpdate(meeting);
            const { data, error } = await supabase.from('meetings').update(dbMeeting).eq('id', meeting.id).select().single();
            if (error) throw error;
            return meetingFromSupabase(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['meetings'] });
        },
    });

    const deleteMeeting = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('meetings').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['meetings'] });
            queryClient.invalidateQueries({ queryKey: ['meetingAttendees'] });
            queryClient.invalidateQueries({ queryKey: ['meetingInvitees'] });
        },
    });

    const createComplexMeeting = useMutation({
        mutationFn: async (params: {
            meetingData: Omit<Meeting, 'id'>,
            schedules: ScheduleEntry[],
            inviteeIds: string[],
            attendeesInPersonIds: string[],
            attendeesOnlineIds: string[]
        }) => {
            const { meetingData, schedules, inviteeIds, attendeesInPersonIds, attendeesOnlineIds } = params;

            // Handle recurring meetings (schedules) by creating multiple meeting entries if needed
            // OR if the meeting model supports a single meeting entry with date/time. 
            // The current logic in VIEW seems to imply Creating Multiple Meetings if multiple schedules exist.

            const meetingsToCreate = schedules.length > 0 ? schedules.map(sch => ({
                ...meetingData,
                date: sch.date,
                startTime: sch.startTime,
                endTime: sch.endTime,
            })) : [meetingData];

            const payload = meetingsToCreate.map(m => meetingToSupabase(m as Meeting));
            const { data: newMeetings, error } = await supabase.from('meetings').insert(payload).select('id');

            if (error) throw error;
            if (!newMeetings) return;

            const inviteePayload: any[] = [];
            const attendeePayload: any[] = [];

            for (const newMeeting of newMeetings) {
                inviteeIds.forEach(pid => inviteePayload.push({ meeting_id: newMeeting.id, participant_id: pid }));
                attendeesInPersonIds.forEach(pid => attendeePayload.push({ meeting_id: newMeeting.id, participant_id: pid, attendance_type: 'in_person' }));
                attendeesOnlineIds.forEach(pid => attendeePayload.push({ meeting_id: newMeeting.id, participant_id: pid, attendance_type: 'online' }));
            }

            if (inviteePayload.length) await supabase.from('meeting_invitees').insert(inviteePayload);
            if (attendeePayload.length) await supabase.from('meeting_attendees').insert(attendeePayload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['meetings'] });
            queryClient.invalidateQueries({ queryKey: ['meetingInvitees'] });
            queryClient.invalidateQueries({ queryKey: ['meetingAttendees'] });
        },
    });

    const updateComplexMeeting = useMutation({
        mutationFn: async (params: {
            meetingId: string,
            meetingData: Omit<Meeting, 'id'>,
            inviteeIds: string[],
            attendeesInPersonIds: string[],
            attendeesOnlineIds: string[]
        }) => {
            const { meetingId, meetingData, inviteeIds, attendeesInPersonIds, attendeesOnlineIds } = params;

            const { error } = await supabase.from('meetings').update(meetingToSupabaseForUpdate(meetingData as Meeting)).eq('id', meetingId);
            if (error) throw error;

            // Sync interactions
            await supabase.from('meeting_invitees').delete().eq('meeting_id', meetingId);
            if (inviteeIds.length) await supabase.from('meeting_invitees').insert(inviteeIds.map(pid => ({ meeting_id: meetingId, participant_id: pid })));

            await supabase.from('meeting_attendees').delete().eq('meeting_id', meetingId);
            const attendeesPayload: any[] = [];
            attendeesInPersonIds.forEach(pid => attendeesPayload.push({ meeting_id: meetingId, participant_id: pid, attendance_type: 'in_person' }));
            attendeesOnlineIds.forEach(pid => attendeesPayload.push({ meeting_id: meetingId, participant_id: pid, attendance_type: 'online' }));
            if (attendeesPayload.length) await supabase.from('meeting_attendees').insert(attendeesPayload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['meetings'] });
            queryClient.invalidateQueries({ queryKey: ['meetingInvitees'] });
            queryClient.invalidateQueries({ queryKey: ['meetingAttendees'] });
        },
    });

    return { createMeeting, updateMeeting, deleteMeeting, createComplexMeeting, updateComplexMeeting };
};
