-- Tabela para rastrear quais avisos um usuário leu
CREATE TABLE public.user_notices (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  notice_id UUID REFERENCES public.notices(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, notice_id)
);

-- Habilitar RLS (OBRIGATÓRIO para segurança)
ALTER TABLE public.user_notices ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para user_notices
-- Usuários podem ver apenas seus próprios registros de avisos lidos
CREATE POLICY "Users can view their own read notices" ON public.user_notices
FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Usuários podem inserir registros para marcar avisos como lidos
CREATE POLICY "Users can insert their own read notices" ON public.user_notices
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Usuários podem atualizar seus próprios registros (ex: atualizar read_at)
CREATE POLICY "Users can update their own read notices" ON public.user_notices
FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Usuários podem deletar seus próprios registros (se necessário)
CREATE POLICY "Users can delete their own read notices" ON public.user_notices
FOR DELETE TO authenticated USING (auth.uid() = user_id);