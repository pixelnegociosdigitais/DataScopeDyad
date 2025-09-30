DROP POLICY IF EXISTS "giveaway_winners_combined_insert_policy" ON public.giveaway_winners;
CREATE POLICY "giveaway_winners_combined_insert_policy" ON public.giveaway_winners
FOR INSERT TO authenticated WITH CHECK ((SELECT is_administrator()) OR (SELECT is_developer()));