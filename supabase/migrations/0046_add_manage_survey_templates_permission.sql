-- Adicionar a nova permissão ao enum ModuleName se ainda não existir
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'modulename') THEN
        CREATE TYPE public.modulename AS ENUM (
            'create_survey',
            'manage_surveys',
            'view_dashboard',
            'access_giveaways',
            'perform_giveaways',
            'view_giveaway_data',
            'manage_company_settings',
            'manage_users',
            'manage_companies',
            'manage_notices',
            'access_chat',
            'manage_survey_templates' -- Nova permissão
        );
    ELSE
        -- Adicionar 'manage_survey_templates' se já existe e não está presente
        ALTER TYPE public.modulename ADD VALUE 'manage_survey_templates' IF NOT EXISTS;
    END IF;
END $$;

-- Inserir a permissão para o papel de Desenvolvedor
INSERT INTO public.module_permissions (role, module_name, enabled)
VALUES ('Desenvolvedor', 'manage_survey_templates', TRUE)
ON CONFLICT (role, module_name) DO UPDATE SET enabled = EXCLUDED.enabled;

-- Garantir que outros papéis não tenham essa permissão por padrão (se existirem)
INSERT INTO public.module_permissions (role, module_name, enabled)
VALUES ('Administrador', 'manage_survey_templates', FALSE)
ON CONFLICT (role, module_name) DO UPDATE SET enabled = EXCLUDED.enabled;

INSERT INTO public.module_permissions (role, module_name, enabled)
VALUES ('Usuário', 'manage_survey_templates', FALSE)
ON CONFLICT (role, module_name) DO UPDATE SET enabled = EXCLUDED.enabled;