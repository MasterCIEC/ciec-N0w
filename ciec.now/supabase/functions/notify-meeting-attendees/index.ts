// supabase/functions/notify-meeting-attendees/index.ts

// We declare Deno here to satisfy TypeScript in environments that don't resolve remote types for Edge Functions.
// The Supabase Edge Function runtime will provide the actual Deno global.
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// !! IMPORTANTE: Reemplace esta URL con su nuevo webhook de Make.com para reuniones
const MAKE_WEBHOOK_URL_MEETINGS = 'https://hook.us2.make.com/tu-nuevo-webhook-para-reuniones'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { meetingId } = await req.json()
    if (!meetingId) throw new Error('El ID de la reunión es requerido.')
    console.log(`Función invocada para la reunión: ${meetingId}`);

    // 1. Obtener detalles de la reunión y el nombre de la comisión
    const { data: meetingData, error: meetingError } = await supabaseAdmin
      .from('meetings')
      .select('id, subject, date, start_time, location, description, commissions(name)')
      .eq('id', meetingId)
      .single()

    if (meetingError) throw meetingError;
    console.log('Paso 1: Datos de la reunión obtenidos:', meetingData.subject);

    // Simplificamos los datos para el payload
    const finalMeetingData = {
        ...meetingData,
        organizerName: meetingData.commissions?.name || 'Comisión no especificada'
    };
    // Eliminamos el objeto anidado para un payload más limpio
    delete (finalMeetingData as any).commissions;

    console.log(`Paso 2: Organizador determinado: ${finalMeetingData.organizerName}`);

    // 3. Obtener la lista de invitados para esta reunión
    const { data: invitees, error: inviteesError } = await supabaseAdmin
      .from('meeting_invitees')
      .select('participants(id, name, email)')
      .eq('meeting_id', meetingId);

    if (inviteesError) throw inviteesError;

    const recipientsList = invitees
      .map(item => item.participants)
      .filter(p => p && p.email);

    console.log(`Paso 3: Se encontraron ${recipientsList.length} invitados con email.`);

    if (recipientsList.length === 0) {
      return new Response(JSON.stringify({ message: 'No se encontraron invitados con email para notificar.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
      });
    }

    // 4. Enviar los datos a Make.com
    const payload = {
      meeting: finalMeetingData,
      recipients: recipientsList,
    };

    console.log('Paso 4: Enviando payload a Make.com...');
    const makeResponse = await fetch(MAKE_WEBHOOK_URL_MEETINGS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!makeResponse.ok) {
      const errorBody = await makeResponse.text();
      console.error("Error de Make.com:", errorBody);
      throw new Error(`Error al enviar datos a Make.com: ${errorBody}`);
    }
    console.log('Payload enviado a Make.com con éxito.');

    return new Response(JSON.stringify({ message: `Invitaciones de reunión enviadas a la cola para ${recipientsList.length} participante(s).` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    });

  } catch (error) {
    console.error('Error CRÍTICO en la Edge Function (notify-meeting-attendees):', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
    });
  }
})
