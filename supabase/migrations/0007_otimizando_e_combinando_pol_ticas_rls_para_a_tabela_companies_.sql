-- Drop existing policies for 'companies' to recreate them
DROP POLICY IF EXISTS "Authenticated users can create their own company" ON public.companies;
DROP POLICY IF EXISTS "Users can view companies they created" ON public.companies;
DROP POLICY IF EXISTS "Admin can update their company" ON public.companies;
DROP POLICY IF EXISTS "Admin can view their company" ON public.companies;
DROP POLICY IF EXISTS "Developer can manage all companies" ON public.companies;

-- Recreate combined and optimized policies for 'companies'
CREATE POLICY "companies_combined_select_policy" ON public.companies
FOR SELECT TO authenticated USING (
    (created_by = (select auth.uid())) OR
    (id = (select get_user_company_id())) OR
    ((select is_developer()))
);

CREATE POLICY "companies_combined_insert_policy" ON public.companies
FOR INSERT TO authenticated WITH CHECK (
    (created_by = (select auth.uid())) OR
    ((select is_developer()))
);

CREATE POLICY "companies_combined_update_policy" ON public.companies
FOR UPDATE TO authenticated USING (
    ((id = (select get_user_company_id())) AND (select is_administrator())) OR
    ((select is_developer()))
);

CREATE POLICY "companies_combined_delete_policy" ON public.companies
FOR DELETE TO authenticated USING (
    ((select is_developer()))
);