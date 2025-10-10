-- Adicionar campo available_to_all_profiles à tabela surveys
-- Este campo indica se a pesquisa deve estar disponível para todos os perfis de usuários
ALTER TABLE public.surveys 
ADD COLUMN available_to_all_profiles BOOLEAN DEFAULT FALSE;

-- Comentário explicativo sobre o campo
COMMENT ON COLUMN public.surveys.available_to_all_profiles IS 'Indica se a pesquisa está disponível para todos os perfis de usuários do sistema, independente da empresa';

-- Atualizar a política RLS de SELECT para incluir pesquisas disponíveis para todos os perfis
DROP POLICY IF EXISTS "surveys_combined_select_policy" ON public.surveys;

CREATE POLICY "surveys_combined_select_policy" ON public.surveys
FOR SELECT TO authenticated USING (
    (company_id = (select get_user_company_id())) OR
    ((select is_developer())) OR
    (available_to_all_profiles = TRUE)
);