import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { ParticipantMeetingCategory } from '../types';

export const useParticipantMeetingCategories = () => {
    return useQuery({
        queryKey: ['participantMeetingCategories'],
        queryFn: async () => {
            // Note: The table name in DB might be 'participant_commissions' based on App.tsx usage earlier?
            // "fetchParticipantMeetingCategories" in App.tsx used 'participant_commissions'.
            // Let's verify schema if needed, but I recall 'participant_commissions'.
            // Types.ts likely maps 'ParticipantMeetingCategory' to this table structure.
            const { data, error } = await supabase.from('participant_commissions').select('*');
            if (error) throw error;
            // Map column names if they differ from Type?
            // Type definition: participant_id, meeting_category_id.
            // DB column: commission_id (based on Step 448 line 186).
            return (data || []).map((d: any) => ({
                participant_id: d.participant_id,
                meeting_category_id: d.commission_id
            })) as ParticipantMeetingCategory[];
        },
        staleTime: 1000 * 60 * 10,
    });
};
