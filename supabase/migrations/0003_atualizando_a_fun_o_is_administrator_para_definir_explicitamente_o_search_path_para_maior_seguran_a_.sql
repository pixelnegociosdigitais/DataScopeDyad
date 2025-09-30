CREATE OR REPLACE FUNCTION public.is_administrator()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, extensions
AS $function$
BEGIN
  RETURN (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'Administrador';
END;
$function$;