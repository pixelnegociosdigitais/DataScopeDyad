-- Drop existing policies for 'survey_templates' to recreate them
DROP POLICY IF EXISTS "All authenticated users can view survey templates" ON public.survey_templates;
DROP POLICY IF EXISTS "Developer can manage survey templates" ON public.survey_templates;

-- Recreate combined and optimized policies for 'survey_templates'
CREATE POLICY "survey_templates_combined_select_policy" ON public.survey_templates
FOR SELECT TO authenticated USING (
    true -- All authenticated users can view survey templates
);

CREATE POLICY "survey_templates_combined_manage_policy" ON public.survey_templates
FOR ALL TO authenticated USING (
    ((select is_developer()))
) WITH CHECK (
    ((select is_developer()))
);