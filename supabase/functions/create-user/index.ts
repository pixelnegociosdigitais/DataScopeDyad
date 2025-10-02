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

    const body = await req.json(); // Captura o corpo da requisição
    console.log('Received body for create-user:', body); // Loga o corpo recebido

    const { email, password, fullName, role, companyId } = body; // Desestrutura do corpo capturado

    if (!email || !password || !fullName || !role || !companyId) {
        console.error('Missing parameters in create-user:', { email, password, fullName, role, companyId }); // Loga quais parâmetros estão faltando
        return new Response(JSON.stringify({ error: 'Parâmetros ausentes: email, password, fullName, role e companyId são obrigatórios.' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }

    const { data: { user }, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, company_id: companyId, role: role }
    })

    if (authError) {
        console.error('Auth error in create-user:', authError); // Loga erros de autenticação
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

    const { error: profileUpdateError } = await adminClient
      .from('profiles')
      .update({ role: role, company_id: companyId, full_name: fullName })
      .eq('id', user.id)

    if (profileUpdateError) {
        console.error('Profile update error in create-user:', profileUpdateError); // Loga erros de atualização de perfil
        throw profileUpdateError
    }

    return new Response(JSON.stringify({ user }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Unexpected error in create-user:', error); // Loga erros inesperados
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})