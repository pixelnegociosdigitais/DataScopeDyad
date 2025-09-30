-- Drop existing policies for 'giveaway_winners' to recreate them
DROP POLICY IF EXISTS "Company members can view giveaway winners for their surveys" ON public.giveaway_winners;
DROP POLICY IF EXISTS "Admin and Developer can insert giveaway winners for their compa" ON public.giveaway_winners;
DROP POLICY IF EXISTS "Developer can manage all giveaway winners" ON public.giveaway_winners;

-- Recreate combined and optimized policies for 'giveaway_winners'
CREATE POLICY "giveaway_winners_combined_select_policy" ON public.giveaway_winners
FOR SELECT TO authenticated USING (
    (survey_id IN ( SELECT surveys.id FROM surveys WHERE (surveys.company_id = (select get_user_company_id())))) OR
    ((select is_developer()))
);

CREATE POLICY "giveaway_winners_combined_insert_policy" ON public.giveaway_winners
FOR INSERT TO authenticated WITH CHECK (
    (survey_id IN ( SELECT surveys.id FROM surveys WHERE ((surveys.company_id = (select get_user_company_id())) AND ((select is_administrator()) OR (select is_developer()))))) OR
    ((select is_developer()))
);

CREATE POLICY "giveaway_winners_combined_update_policy" ON public.giveaway_winners
FOR UPDATE TO authenticated USING (
    ((select is_developer()))
);

CREATE POLICY "giveaway_winners_combined_delete_policy" ON public.giveaway_winners
FOR DELETE TO authenticated USING (
    ((select is_developer()))
);