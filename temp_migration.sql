-- Verificar se a coluna já existe antes de adicionar
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'surveys' 
        AND column_name = 'available_to_all_profiles'
    ) THEN
        -- Adicionar campo available_to_all_profiles à tabela surveys
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
        
        RAISE NOTICE 'Coluna available_to_all_profiles adicionada com sucesso!';
    ELSE
        RAISE NOTICE 'Coluna available_to_all_profiles já existe.';
    END IF;
END $$;