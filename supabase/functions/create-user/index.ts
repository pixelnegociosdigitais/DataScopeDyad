import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient, AuthApiError } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const body = await req.json();
    console.log('Received body for create-user:', body);

    const { email, password, fullName, role, companyId } = body;

    // Validação mais robusta para garantir que os campos não são vazios ou apenas espaços
    if (!email || email.trim() === '' ||
        !password || password.trim() === '' ||
        !fullName || fullName.trim() === '' ||
        !role || role.trim() === '' ||
        !companyId || companyId.trim() === '') {
        console.error('Missing or empty parameters in create-user:', { email, password, fullName, role, companyId });
        return new Response(JSON.stringify({ error: 'Parâmetros ausentes ou vazios: email, password, fullName, role e companyId são obrigatórios e não podem ser vazios.' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }

    const { data: { user }, error: authError } = await adminClient.auth.admin.createUser({
      email: email.trim(),
      password: password.trim(),
      email_confirm: true,
      user_metadata: { 
        full_name: fullName.trim(), 
        company_id: companyId.trim(),
        role: role.trim() // Passar o role para o trigger
      }
    })

    if (authError) {
        console.error('Auth error in create-user:', authError);
        if (authError instanceof AuthApiError && authError.status === 409) {
            return new Response(JSON.stringify({ error: 'Já existe um usuário com este e-mail.' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 409,
            })
        }
        throw authError
    }
    if (!user) {
        console.error("User creation failed, no user returned.");
        throw new Error("Criação do usuário falhou, nenhum usuário retornado.")
    }

    // A atualização do perfil com o role e company_id corretos agora é tratada pelo trigger handle_new_user_with_company
    // Não é mais necessário fazer um update explícito aqui.

    return new Response(JSON.stringify({ user }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Unexpected error in create-user:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})