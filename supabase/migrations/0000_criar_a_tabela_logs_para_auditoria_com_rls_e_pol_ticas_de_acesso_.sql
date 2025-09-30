-- Criar a tabela de logs
CREATE TABLE public.logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  level TEXT NOT NULL, -- INFO, WARN, ERROR, DEBUG
  message TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  module TEXT -- Ex: 'AUTH', 'SURVEYS', 'COMPANIES', 'GIVEAWAYS'
);

-- Habilitar RLS (OBRIGATÓRIO para segurança)
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para a tabela 'logs'

-- Desenvolvedores podem ver todos os logs
CREATE POLICY "Developer can view all logs" ON public.logs
FOR SELECT TO authenticated USING (public.is_developer());

-- Administradores podem ver logs relacionados à sua empresa
CREATE POLICY "Admin can view company-specific logs" ON public.logs
FOR SELECT TO authenticated USING (
  (public.is_administrator() AND company_id = public.get_user_company_id())
);

-- Nenhuma política de INSERT, UPDATE, DELETE para usuários comuns,
-- pois os logs devem ser inseridos apenas por funções de backend ou triggers.