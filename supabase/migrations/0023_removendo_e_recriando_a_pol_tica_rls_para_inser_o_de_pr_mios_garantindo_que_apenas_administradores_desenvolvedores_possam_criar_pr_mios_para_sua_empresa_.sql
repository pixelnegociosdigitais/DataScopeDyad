DROP POLICY IF EXISTS "prizes_combined_insert_policy" ON public.prizes;
CREATE POLICY "prizes_combined_insert_policy" ON public.prizes
AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (company_id = public.get_user_company_id());