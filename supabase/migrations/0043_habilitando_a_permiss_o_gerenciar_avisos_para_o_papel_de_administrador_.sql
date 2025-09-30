INSERT INTO public.module_permissions (role, module_name, enabled)
    VALUES ('Administrador', 'manage_notices', TRUE)
    ON CONFLICT (role, module_name) DO UPDATE
    SET enabled = EXCLUDED.enabled;