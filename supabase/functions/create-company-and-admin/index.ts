/// <reference lib="deno.ns" />
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS OPTIONS request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { companyName, adminFullName, adminEmail, adminPassword } = await req.json();

    if (!companyName || !adminFullName || !adminEmail || !adminPassword) {
      return new Response(JSON.stringify({ error: 'Missing required fields.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create a Supabase client with the service role key for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify if the caller is a Developer
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Missing Authorization header.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: callerUser }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !callerUser) {
      console.error('Error getting caller user:', userError?.message);
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid token or user not found.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: callerProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', callerUser.id)
      .single();

    if (profileError || callerProfile?.role !== 'Desenvolvedor') {
      console.error('Caller is not a Developer or profile not found:', profileError?.message);
      return new Response(JSON.stringify({ error: 'Forbidden: Only Developers can perform this action.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1. Create the new admin user
    const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true, // Automatically confirm email
      user_metadata: { full_name: adminFullName },
    });

    if (createUserError || !newUser.user) {
      console.error('Error creating new user:', createUserError?.message);
      return new Response(JSON.stringify({ error: 'Failed to create admin user: ' + createUserError?.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const newUserId = newUser.user.id;

    // 2. Create the new company
    const { data: newCompany, error: createCompanyError } = await supabaseAdmin
      .from('companies')
      .insert({ name: companyName })
      .select()
      .single();

    if (createCompanyError || !newCompany) {
      console.error('Error creating new company:', createCompanyError?.message);
      // Optionally, delete the created user if company creation fails
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      return new Response(JSON.stringify({ error: 'Failed to create company: ' + createCompanyError?.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const newCompanyId = newCompany.id;

    // 3. Update the new user's profile to link to the new company and set role
    const { error: updateProfileError } = await supabaseAdmin
      .from('profiles')
      .update({ company_id: newCompanyId, role: 'Administrador', full_name: adminFullName, email: adminEmail })
      .eq('id', newUserId);

    if (updateProfileError) {
      console.error('Error updating new user profile:', updateProfileError?.message);
      // Optionally, delete the created user and company if profile update fails
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      await supabaseAdmin.from('companies').delete().eq('id', newCompanyId);
      return new Response(JSON.stringify({ error: 'Failed to link admin to company: ' + updateProfileError?.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ message: 'Company and admin created successfully!', company: newCompany, adminUser: newUser.user }), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Unhandled error:', error.message);
    return new Response(JSON.stringify({ error: 'Internal server error: ' + error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});