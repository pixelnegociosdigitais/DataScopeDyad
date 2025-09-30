-- Drop existing policies for 'logs' to recreate them
DROP POLICY IF EXISTS "Developer can view all logs" ON public.logs;
DROP POLICY IF EXISTS "Admin can view company-specific logs" ON public.logs;

-- Recreate combined and optimized policies for 'logs'
CREATE POLICY "logs_combined_select_policy" ON public.logs
FOR SELECT TO authenticated USING (
    (((select is_administrator()) AND (company_id = (select get_user_company_id()))) OR ((select is_developer())))
);

CREATE POLICY "logs_combined_insert_policy" ON public.logs
FOR INSERT TO authenticated WITH CHECK (
    true -- Logs can be inserted by anyone authenticated (handled by logger utility)
);