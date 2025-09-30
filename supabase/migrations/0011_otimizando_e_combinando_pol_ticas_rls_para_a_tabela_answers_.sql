-- Drop existing policies for 'answers' to recreate them
DROP POLICY IF EXISTS "Anyone can insert an answer" ON public.answers;
DROP POLICY IF EXISTS "Company members can view answers for their survey responses" ON public.answers;
DROP POLICY IF EXISTS "Developer can manage all answers" ON public.answers;

-- Recreate combined and optimized policies for 'answers'
CREATE POLICY "answers_combined_select_policy" ON public.answers
FOR SELECT TO authenticated USING (
    (response_id IN ( SELECT survey_responses.id FROM survey_responses WHERE (survey_responses.survey_id IN ( SELECT surveys.id FROM surveys WHERE (surveys.company_id = (select get_user_company_id())))))) OR
    ((select is_developer()))
);

CREATE POLICY "answers_combined_insert_policy" ON public.answers
FOR INSERT TO authenticated WITH CHECK (
    true -- Anyone can insert an answer
);

CREATE POLICY "answers_combined_update_policy" ON public.answers
FOR UPDATE TO authenticated USING (
    ((select is_developer()))
);

CREATE POLICY "answers_combined_delete_policy" ON public.answers
FOR DELETE TO authenticated USING (
    ((select is_developer()))
);