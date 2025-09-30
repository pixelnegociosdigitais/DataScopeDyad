DROP POLICY IF EXISTS "answers_combined_insert_policy" ON public.answers;
CREATE POLICY "answers_combined_insert_policy" ON public.answers
AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (response_id IN (SELECT id FROM public.survey_responses WHERE survey_id IN (SELECT id FROM public.surveys WHERE company_id = public.get_user_company_id())));