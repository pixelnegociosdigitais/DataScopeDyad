-- Criar o tipo ENUM para os papéis de usuário, se ainda não existir
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE public.user_role AS ENUM ('Desenvolvedor', 'Administrador', 'Usuário');
    END IF;
END $$;

-- Criar a tabela notices
CREATE TABLE public.notices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_email TEXT,
  message TEXT NOT NULL,
  target_roles public.user_role[] NOT NULL, -- Array de roles para quem o aviso é destinado
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE
);

-- Habilitar RLS (OBRIGATÓRIO para segurança)
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;

-- Políticas de SELECT:
-- Desenvolvedores podem ver todos os avisos
CREATE POLICY "Developers can view all notices" ON public.notices
FOR SELECT TO authenticated
USING (public.is_developer());

-- Administradores podem ver avisos direcionados a eles ou a usuários da sua empresa
CREATE POLICY "Admins can view notices for their company or themselves" ON public.notices
FOR SELECT TO authenticated
USING (
    (public.is_administrator() AND company_id = public.get_user_company_id() AND (target_roles @> ARRAY['Administrador']::public.user_role[] OR target_roles @> ARRAY['Usuário']::public.user_role[]))
    OR public.is_developer()
);

-- Usuários podem ver avisos direcionados a eles dentro da sua empresa
CREATE POLICY "Users can view notices for their company" ON public.notices
FOR SELECT TO authenticated
USING (
    (auth.uid() IN (SELECT id FROM public.profiles WHERE company_id = public.get_user_company_id()))
    AND (target_roles @> ARRAY['Usuário']::public.user_role[])
    AND (company_id = public.get_user_company_id())
);

-- Políticas de INSERT:
-- Desenvolvedores podem inserir avisos para qualquer role e company_id (ou nulo)
CREATE POLICY "Developers can insert any notice" ON public.notices
FOR INSERT TO authenticated
WITH CHECK (public.is_developer());

-- Administradores podem inserir avisos APENAS para 'Usuário' e APENAS para sua própria empresa
CREATE POLICY "Admins can insert notices for users in their company" ON public.notices
FOR INSERT TO authenticated
WITH CHECK (
    public.is_administrator()
    AND target_roles @> ARRAY['Usuário']::public.user_role[]
    AND NOT (target_roles @> ARRAY['Administrador']::public.user_role[]) -- Não pode enviar para administradores
    AND NOT (target_roles @> ARRAY['Desenvolvedor']::public.user_role[]) -- Não pode enviar para desenvolvedores
    AND company_id = public.get_user_company_id()
);

-- Políticas de UPDATE e DELETE:
-- Apenas Desenvolvedores podem atualizar ou deletar avisos
CREATE POLICY "Developers can update notices" ON public.notices
FOR UPDATE TO authenticated
USING (public.is_developer());

CREATE POLICY "Developers can delete notices" ON public.notices
FOR DELETE TO authenticated
USING (public.is_developer());