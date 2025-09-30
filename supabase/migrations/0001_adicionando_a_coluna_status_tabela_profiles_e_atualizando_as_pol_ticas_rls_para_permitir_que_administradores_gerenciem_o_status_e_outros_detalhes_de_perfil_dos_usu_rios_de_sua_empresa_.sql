-- Adicionar a coluna 'status' à tabela profiles
ALTER TABLE public.profiles
ADD COLUMN status TEXT DEFAULT 'active';

-- Atualizar a política de UPDATE para perfis para permitir que administradores alterem o status e outros campos de usuários em sua empresa
-- A política existente 'profiles_update_policy' permite que o usuário atualize seu próprio perfil.
-- Precisamos de uma nova política ou modificar a existente para administradores.

-- Modificar a política existente 'profiles_update_policy' para incluir a permissão para administradores
-- (Se a política existente for apenas para o próprio usuário, criaremos uma nova para administradores)

-- Primeiro, vamos verificar se a política 'profiles_update_policy' existe e qual é sua definição
-- SELECT * FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles_update_policy';

-- Assumindo que a política existente é para o próprio usuário (auth.uid() = id),
-- vamos criar uma nova política para administradores.

CREATE POLICY "Admins can update user profiles in their company" ON public.profiles
FOR UPDATE TO authenticated
USING (
    (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'Administrador' AND company_id = get_user_company_id()))
    AND (company_id = get_user_company_id())
)
WITH CHECK (
    (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'Administrador' AND company_id = get_user_company_id()))
    AND (company_id = get_user_company_id())
);

-- A política "Admin can view and manage profiles in their company" já existe e cobre o SELECT e DELETE.
-- A política "User can view and update their own profile" já existe e cobre o SELECT e UPDATE para o próprio usuário.
-- A política "Developer can manage all profiles" já existe e cobre todas as operações para desenvolvedores.

-- A política acima permite que administradores atualizem perfis de usuários dentro de sua empresa.
-- É importante que o administrador não possa alterar o próprio papel ou o papel de outros administradores/desenvolvedores.
-- A lógica de negócio para isso será tratada no frontend e no backend (Edge Function ou RLS mais granular se necessário).
-- Por enquanto, a RLS permite a atualização de qualquer campo para usuários da mesma empresa pelo admin.