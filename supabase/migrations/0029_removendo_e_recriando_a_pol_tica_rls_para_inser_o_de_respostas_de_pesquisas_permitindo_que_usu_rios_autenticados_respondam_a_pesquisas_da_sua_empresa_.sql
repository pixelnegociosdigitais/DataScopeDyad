DROP POLICY IF EXISTS "survey_responses_combined_insert_policy" ON public.survey_responses;
CREATE POLICY "survey_responses_combined_insert_policy" ON public.survey_responses
AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (survey_id IN (SELECT id FROM public.surveys WHERE company_id = public.get_user_company_id()));