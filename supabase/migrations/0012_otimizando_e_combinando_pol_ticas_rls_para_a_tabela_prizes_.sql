-- Drop existing policies for 'prizes' to recreate them
DROP POLICY IF EXISTS "Company members can view their prizes" ON public.prizes;
DROP POLICY IF EXISTS "Admin and Developer can manage prizes for their company" ON public.prizes;
DROP POLICY IF EXISTS "Developer can manage all prizes" ON public.prizes;

-- Recreate combined and optimized policies for 'prizes'
CREATE POLICY "prizes_combined_select_policy" ON public.prizes
FOR SELECT TO authenticated USING (
    (company_id = (select get_user_company_id())) OR
    ((select is_developer()))
);

CREATE POLICY "prizes_combined_insert_policy" ON public.prizes
FOR INSERT TO authenticated WITH CHECK (
    ((company_id = (select get_user_company_id())) AND ((select is_administrator()) OR (select is_developer()))) OR
    ((select is_developer()))
);

CREATE POLICY "prizes_combined_update_policy" ON public.prizes
FOR UPDATE TO authenticated USING (
    ((company_id = (select get_user_company_id())) AND ((select is_administrator()) OR (select is_developer()))) OR
    ((select is_developer()))
);

CREATE POLICY "prizes_combined_delete_policy" ON public.prizes
FOR DELETE TO authenticated USING (
    ((company_id = (select get_user_company_id())) AND ((select is_administrator()) OR (select is_developer()))) OR
    ((select is_developer()))
);