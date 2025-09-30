CREATE OR REPLACE FUNCTION public.is_developer()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, extensions
AS $function$
BEGIN
  RETURN (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'Desenvolvedor';
END;
$function$;