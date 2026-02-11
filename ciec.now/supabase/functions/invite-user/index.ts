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
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();
    if (!email) {
      throw new Error("Email is required.");
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization header is missing.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
      });
    }

    // Create a Supabase client with the Auth context of the logged-in user.
    // This is used to verify that the user is an admin.
    const userSupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await userSupabaseClient.auth.getUser();

    if (!user) {
      throw new Error("User not authenticated.");
    }

    // Check if the user is an admin
    const { data: profile, error: profileError } = await userSupabaseClient
      .from('userprofiles')
      .select('roles(name)')
      .eq('id', user.id)
      .single();
    
    const roleName = profile?.roles?.name;

    if (profileError || !roleName || !['Admin', 'SuperAdmin'].includes(roleName)) {
       return new Response(JSON.stringify({ error: 'Permission denied. User is not an admin.' }), {
         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
         status: 403,
       });
    }
    
    // Create a Supabase client with the service role key to perform admin actions.
    const adminSupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    
    const { data, error } = await adminSupabaseClient.auth.admin.inviteUserByEmail(email);

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});