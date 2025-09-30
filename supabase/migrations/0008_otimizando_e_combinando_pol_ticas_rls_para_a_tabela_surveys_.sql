-- Drop existing policies for 'surveys' to recreate them
DROP POLICY IF EXISTS "Admins and Developers can create surveys for their company" ON public.surveys;
DROP POLICY IF EXISTS "Company members can view their surveys" ON public.surveys;
DROP POLICY IF EXISTS "Admin and Developer can update surveys for their company" ON public.surveys;
DROP POLICY IF EXISTS "Admin and Developer can delete surveys for their company" ON public.surveys;
DROP POLICY IF EXISTS "Developer can manage all surveys" ON public.surveys;

-- Recreate combined and optimized policies for 'surveys'
CREATE POLICY "surveys_combined_select_policy" ON public.surveys
FOR SELECT TO authenticated USING (
    (company_id = (select get_user_company_id())) OR
    ((select is_developer()))
);

CREATE POLICY "surveys_combined_insert_policy" ON public.surveys
FOR INSERT TO authenticated WITH CHECK (
    ((company_id = (select get_user_company_id())) AND ((select is_administrator()) OR (select is_developer()))) OR
    ((select is_developer()))
);

CREATE POLICY "surveys_combined_update_policy" ON public.surveys
FOR UPDATE TO authenticated USING (
    ((company_id = (select get_user_company_id())) AND ((select is_administrator()) OR (select is_developer()))) OR
    ((select is_developer()))
);

CREATE POLICY "surveys_combined_delete_policy" ON public.surveys
FOR DELETE TO authenticated USING (
    ((company_id = (select get_user_company_id())) AND ((select is_administrator()) OR (select is_developer()))) OR
    ((select is_developer()))
);