DROP POLICY IF EXISTS "surveys_combined_insert_policy" ON public.surveys;
CREATE POLICY "surveys_combined_insert_policy" ON public.surveys
AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (company_id = public.get_user_company_id());