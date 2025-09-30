-- Drop existing policies for 'module_permissions' to recreate them
DROP POLICY IF EXISTS "All authenticated users can view module permissions" ON public.module_permissions;
DROP POLICY IF EXISTS "Developer can manage module permissions" ON public.module_permissions;

-- Recreate combined and optimized policies for 'module_permissions'
CREATE POLICY "module_permissions_combined_select_policy" ON public.module_permissions
FOR SELECT TO authenticated USING (
    true -- All authenticated users can view module permissions
);

CREATE POLICY "module_permissions_combined_manage_policy" ON public.module_permissions
FOR ALL TO authenticated USING (
    ((select is_developer()))
) WITH CHECK (
    ((select is_developer()))
);