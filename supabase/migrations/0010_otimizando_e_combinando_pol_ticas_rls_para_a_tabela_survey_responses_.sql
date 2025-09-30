-- Drop existing policies for 'survey_responses' to recreate them
DROP POLICY IF EXISTS "Anyone can insert a survey response" ON public.survey_responses;
DROP POLICY IF EXISTS "Company members can view responses for their surveys" ON public.survey_responses;
DROP POLICY IF EXISTS "Developer can manage all survey responses" ON public.survey_responses;

-- Recreate combined and optimized policies for 'survey_responses'
CREATE POLICY "survey_responses_combined_select_policy" ON public.survey_responses
FOR SELECT TO authenticated USING (
    (survey_id IN ( SELECT surveys.id FROM surveys WHERE (surveys.company_id = (select get_user_company_id())))) OR
    ((select is_developer()))
);

CREATE POLICY "survey_responses_combined_insert_policy" ON public.survey_responses
FOR INSERT TO authenticated WITH CHECK (
    true -- Anyone can insert a survey response
);

CREATE POLICY "survey_responses_combined_update_policy" ON public.survey_responses
FOR UPDATE TO authenticated USING (
    ((select is_developer()))
);

CREATE POLICY "survey_responses_combined_delete_policy" ON public.survey_responses
FOR DELETE TO authenticated USING (
    ((select is_developer()))
);