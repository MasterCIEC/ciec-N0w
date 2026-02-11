// supabase/functions/notify-event-attendees/index.ts

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

const MAKE_WEBHOOK_URL = 'https://hook.us2.make.com/y3yd8rfq9i2uj5nusswry59sk4y9v5yt'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { eventId } = await req.json()
    if (!eventId) throw new Error('El ID del evento es requerido.')
    console.log(`Función invocada para el evento: ${eventId}`);

    // 1. Obtener detalles del evento (sin la columna 'organizerType')
    const { data: eventData, error: eventError } = await supabaseAdmin
      .from('events')
      .select('id, subject, date, start_time, location, description, flyer_url')
      .eq('id', eventId)
      .single()

    if (eventError) throw eventError;
    console.log('Paso 1: Datos del evento obtenidos:', eventData.subject);

    // 2. Determinar el organizador y obtener su nombre
    let organizerName = 'Organizador no especificado';
    
    // Primero, busca en las comisiones
    const { data: commissionLinks, error: commissionError } = await supabaseAdmin
        .from('event_organizing_commissions')
        .select('commissions(name)') // Hace un join para obtener el nombre directamente
        .eq('event_id', eventId);
    
    if (commissionError) console.error("Error buscando comisiones organizadoras:", commissionError.message);

    if (commissionLinks && commissionLinks.length > 0) {
        organizerName = commissionLinks.map(link => link.commissions?.name).filter(Boolean).join(', ');
    } else {
        // Si no se encontró, busca en las categorías de eventos
        const { data: categoryLinks, error: categoryError } = await supabaseAdmin
            .from('event_organizing_categories')
            .select('event_categories(name)') // Join para obtener el nombre
            .eq('event_id', eventId);
        
        if (categoryError) console.error("Error buscando categorías organizadoras:", categoryError.message);

        if (categoryLinks && categoryLinks.length > 0) {
            organizerName = categoryLinks.map(link => link.event_categories?.name).filter(Boolean).join(', ');
        }
    }

    if (!organizerName || organizerName.trim() === '') {
        organizerName = 'Organizador no especificado';
    }
    
    // Añadimos el nombre del organizador a los datos del evento
    const finalEventData = { ...eventData, organizerName };
    console.log(`Paso 2: Organizador determinado: ${organizerName}`);

    // 3. Obtener la lista de invitados
    const { data: invitees, error: inviteesError } = await supabaseAdmin
      .from('event_invitees')
      .select('participants(id, name, email)') // Corregido para coincidir con tu schema
      .eq('event_id', eventId);

    if (inviteesError) throw inviteesError;

    // El join ya devuelve el objeto del participante, así que simplificamos esto
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
      event: finalEventData, // Usamos los datos del evento con el nombre del organizador
      recipients: recipientsList,
    };

    console.log('Paso 4: Enviando payload a Make.com...');
    const makeResponse = await fetch(MAKE_WEBHOOK_URL, {
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

    return new Response(JSON.stringify({ message: `Invitaciones enviadas a la cola para ${recipientsList.length} participante(s).` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    });

  } catch (error) {
    console.error('Error CRÍTICO en la Edge Function:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
    });
  }
})
