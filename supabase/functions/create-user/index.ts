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

    const { email, password, fullName, role, companyId } = await req.json()

    if (!email || !password || !fullName || !role || !companyId) {
        return new Response(JSON.stringify({ error: 'Parâmetros ausentes: email, password, fullName, role e companyId são obrigatórios.' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }

    const { data: { user }, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName }
    })

    if (authError) {
        if (authError instanceof AuthApiError && authError.status === 409) {
            return new Response(JSON.stringify({ error: 'Já existe um usuário com este e-mail.' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 409, // Retorna 409 para conflito de e-mail
            })
        }
        throw authError
    }
    if (!user) throw new Error("Criação do usuário falhou, nenhum usuário retornado.")

    // O gatilho 'handle_new_user_with_company' já criou um perfil.
    // Agora, atualizamos esse perfil com o company_id e o papel correto.
    const { error: profileError } = await adminClient
      .from('profiles')
      .update({ company_id: companyId, role: role })
      .eq('id', user.id)

    if (profileError) throw profileError

    return new Response(JSON.stringify({ user }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})