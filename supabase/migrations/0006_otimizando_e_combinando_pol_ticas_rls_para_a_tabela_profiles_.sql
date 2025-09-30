-- Drop existing policies for 'profiles' to recreate them
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;
DROP POLICY IF EXISTS "User can view and update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "User can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update user profiles in their company" ON public.profiles;
DROP POLICY IF EXISTS "Admin can view and manage profiles in their company" ON public.profiles;
DROP POLICY IF EXISTS "Developer can manage all profiles" ON public.profiles;

-- Recreate combined and optimized policies for 'profiles'
CREATE POLICY "profiles_combined_select_policy" ON public.profiles
FOR SELECT TO authenticated USING (
    (id = (select auth.uid())) OR
    ((company_id = (select get_user_company_id())) AND (select is_administrator())) OR
    ((select is_developer()))
);

CREATE POLICY "profiles_combined_insert_policy" ON public.profiles
FOR INSERT TO authenticated WITH CHECK (
    (id = (select auth.uid())) OR
    ((company_id = (select get_user_company_id())) AND (select is_administrator())) OR
    ((select is_developer()))
);

CREATE POLICY "profiles_combined_update_policy" ON public.profiles
FOR UPDATE TO authenticated USING (
    (id = (select auth.uid())) OR
    ((company_id = (select get_user_company_id())) AND (select is_administrator())) OR
    ((select is_developer()))
);

CREATE POLICY "profiles_combined_delete_policy" ON public.profiles
FOR DELETE TO authenticated USING (
    ((company_id = (select get_user_company_id())) AND (select is_administrator())) OR
    ((select is_developer()))
);