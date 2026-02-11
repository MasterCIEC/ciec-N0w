// We declare Deno here to satisfy TypeScript in environments that don't resolve remote types for Edge Functions.
// The Supabase Edge Function runtime will provide the actual Deno global.
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey'
};

const formatIcsText = (text: string | null) => {
  if (!text) return '';
  return text.replace(/,/g, '\\,').replace(/\n/g, '\\n');
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { data: calendarItems, error } = await supabaseClient
      .from('calendar_feed_data')
      .select('*');

    if (error) throw error;

    let icsString = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//CIEC.Now//Agenda General//ES',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Agenda CIEC.Now',
      'X-WR-CALDESC:Calendario de eventos y reuniones de CIEC.Now'
    ].join('\r\n');

    const dtstamp = new Date().toISOString().replace(/-|:|\.\d+/g, '') + 'Z';

    calendarItems.forEach((item: any) => {
      const uid = `${item.item_type}-${item.id}@ciec.now`;
      const summary = formatIcsText(item.subject);
      const description = formatIcsText(item.description);
      const location = formatIcsText(item.location);
      const category = formatIcsText(item.category); // Tomamos la nueva categoría

      icsString += '\r\nBEGIN:VEVENT';
      icsString += `\r\nUID:${uid}`;
      icsString += `\r\nDTSTAMP:${dtstamp}`;
      icsString += `\r\nSUMMARY:${summary}`;
      if (category) icsString += `\r\nCATEGORIES:${category}`; // ✨ LÍNEA AÑADIDA
      if (description) icsString += `\r\nDESCRIPTION:${description}`;
      if (location) icsString += `\r\nLOCATION:${location}`;

      if (item.is_all_day) {
        icsString += `\r\nDTSTART;VALUE=DATE:${item.allday_dtstart}`;
        icsString += `\r\nDTEND;VALUE=DATE:${item.allday_dtend}`;
      } else {
        icsString += `\r\nDTSTART:${item.dtstart}`;
        icsString += `\r\nDTEND:${item.dtend}`;
      }

      icsString += '\r\nEND:VEVENT';
    });

    icsString += '\r\nEND:VCALENDAR';

    return new Response(icsString, {
      headers: { ...corsHeaders, 'Content-Type': 'text/calendar; charset=utf-8' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
