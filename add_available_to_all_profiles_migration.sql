-- Migração para adicionar coluna available_to_all_profiles à tabela surveys
-- Esta coluna determina se uma pesquisa criada a partir de template está disponível para todos os perfis

-- Adicionar a coluna available_to_all_profiles
ALTER TABLE surveys 
ADD COLUMN available_to_all_profiles BOOLEAN DEFAULT false;

-- Atualizar pesquisas existentes criadas a partir de templates para serem disponíveis para todos
UPDATE surveys 
SET available_to_all_profiles = true 
WHERE template_id IS NOT NULL;

-- Comentário na coluna para documentação
COMMENT ON COLUMN surveys.available_to_all_profiles IS 'Indica se a pesquisa está disponível para todos os perfis (true para pesquisas criadas a partir de templates)';

-- Criar índice para melhor performance nas consultas
CREATE INDEX idx_surveys_available_to_all_profiles ON surveys(available_to_all_profiles);

-- Atualizar as políticas RLS para considerar a nova coluna
DROP POLICY IF EXISTS "Users can view surveys they have access to" ON surveys;

CREATE POLICY "Users can view surveys they have access to" ON surveys
FOR SELECT USING (
    -- Pesquisas disponíveis para todos os perfis
    available_to_all_profiles = true
    OR
    -- Pesquisas do próprio usuário
    user_id = auth.uid()
    OR
    -- Pesquisas compartilhadas via survey_shares
    id IN (
        SELECT survey_id 
        FROM survey_shares 
        WHERE user_id = auth.uid()
    )
);