// supabase/functions/get-user-permissions/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization header is missing.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
      });
    }

    // 1. Create a Supabase client with the user's auth token
    const userSupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // 2. Get the user from the token
    const { data: { user } } = await userSupabaseClient.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'User not authenticated.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }
    
    // 3. Create a Supabase client with the service role key to perform admin actions.
    const adminSupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    // 4. Get the user's role_id from their profile
    const { data: profile, error: profileError } = await adminSupabaseClient
      .from('userprofiles')
      .select('role_id, roles (name)') // Also get role name
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      console.error('Error fetching user profile or profile not found:', profileError?.message);
      // Return empty permissions if profile is not found, maybe it's a new user.
      return new Response(JSON.stringify({ permissions: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // SuperAdmin gets all permissions implicitly.
    if (profile.roles?.name === 'SuperAdmin') {
       const { data: allPermissions } = await adminSupabaseClient
        .from('permissions')
        .select('action, subject');
      const permissionsSet = (allPermissions || []).map(p => `${p.action}:${p.subject}`);
      return new Response(JSON.stringify({ permissions: permissionsSet }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    if (!profile.role_id) {
       return new Response(JSON.stringify({ permissions: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // 5. Get the permissions for that role
    const { data: rolePermissionLinks, error: rolePermsError } = await adminSupabaseClient
      .from('rolepermissions')
      .select('permission_id')
      .eq('role_id', profile.role_id)

    if (rolePermsError) {
      throw rolePermsError;
    }

    const permissionIds = rolePermissionLinks.map(link => link.permission_id);

    if (permissionIds.length === 0) {
      return new Response(JSON.stringify({ permissions: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const { data: permissionsData, error: permissionsError } = await adminSupabaseClient
      .from('permissions')
      .select('action, subject')
      .in('id', permissionIds);

    if (permissionsError) {
      throw permissionsError;
    }
    
    const userPermissions = (permissionsData || []).map(p => `${p.action}:${p.subject}`);

    // 6. Return the permissions
    return new Response(JSON.stringify({ permissions: userPermissions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error in get-user-permissions function:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})