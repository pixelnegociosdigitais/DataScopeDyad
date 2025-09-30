-- Drop existing policies for 'questions' to recreate them
DROP POLICY IF EXISTS "Company members can view questions for their surveys" ON public.questions;
DROP POLICY IF EXISTS "Admin and Developer can manage questions for their company's su" ON public.questions;
DROP POLICY IF EXISTS "Developer can manage all questions" ON public.questions;

-- Recreate combined and optimized policies for 'questions'
CREATE POLICY "questions_combined_select_policy" ON public.questions
FOR SELECT TO authenticated USING (
    (survey_id IN ( SELECT surveys.id FROM surveys WHERE (surveys.company_id = (select get_user_company_id())))) OR
    ((select is_developer()))
);

CREATE POLICY "questions_combined_insert_policy" ON public.questions
FOR INSERT TO authenticated WITH CHECK (
    (survey_id IN ( SELECT surveys.id FROM surveys WHERE ((surveys.company_id = (select get_user_company_id())) AND ((select is_administrator()) OR (select is_developer()))))) OR
    ((select is_developer()))
);

CREATE POLICY "questions_combined_update_policy" ON public.questions
FOR UPDATE TO authenticated USING (
    (survey_id IN ( SELECT surveys.id FROM surveys WHERE ((surveys.company_id = (select get_user_company_id())) AND ((select is_administrator()) OR (select is_developer()))))) OR
    ((select is_developer()))
);

CREATE POLICY "questions_combined_delete_policy" ON public.questions
FOR DELETE TO authenticated USING (
    (survey_id IN ( SELECT surveys.id FROM surveys WHERE ((surveys.company_id = (select get_user_company_id())) AND ((select is_administrator()) OR (select is_developer()))))) OR
    ((select is_developer()))
);