import { useState, useEffect, useCallback } from 'react';
import { User, Company, UserRole, View, ModuleName, ModulePermission } from '@/types';
import { supabase } from '@/src/integrations/supabase/client';
import { useAuthSession } from '@/src/context/AuthSessionContext';
import { showSuccess, showError } from '@/src/utils/toast';

interface UseAuthReturn {
    currentUser: User | null;
    currentCompany: Company | null;
    loadingAuth: boolean;
    handleCreateCompany: (companyData: Omit<Company, 'id' | 'created_at'>) => Promise<void>;
    handleUpdateProfile: (updatedUser: User) => Promise<void>;
    handleUpdateCompany: (updatedCompany: Company) => Promise<void>;
    fetchUserData: (userId: string, userEmail: string) => Promise<void>;
    modulePermissions: Record<ModuleName, boolean>;
    handleToggleCompanyStatus: (companyId: string, newStatus: 'active' | 'inactive') => Promise<void>;
    handleResetUserPassword: (userId: string, newPassword?: string) => Promise<void>;
    handleCreateUserForCompany: (companyId: string, fullName: string, email: string, role: UserRole, temporaryPassword?: string) => Promise<void>;
    handleUpdateUserPermissions: (userId: string, permissions: Record<string, boolean>) => Promise<void>;
    handleCreateCompanyAndAdmin: (companyName: string, adminFullName: string, adminEmail: string, adminPassword: string) => Promise<boolean>; // Nova função
}

const DEFAULT_MODULE_PERMISSIONS: Record<ModuleName, boolean> = {
    [ModuleName.CREATE_SURVEY]: true,
    [ModuleName.MANAGE_SURVEYS]: true,
    [ModuleName.VIEW_DASHBOARD]: true,
    [ModuleName.ACCESS_GIVEAWAYS]: true,
    [ModuleName.MANAGE_COMPANY_SETTINGS]: true,
    [ModuleName.MANAGE_USERS]: true, // Novo módulo
    [ModuleName.MANAGE_COMPANIES]: true, // Novo módulo
};

const DEVELOPER_EMAIL = 'santananegociosdigitais@gmail.com'; // E-mail do desenvolvedor hardcoded

export const useAuth = (setCurrentView: (view: View) => void): UseAuthReturn => {
    const { session, loadingSession } = useAuthSession();
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
    const [loadingAuth, setLoadingAuth] = useState(true);
    const [modulePermissions, setModulePermissions] = useState<Record<ModuleName, boolean>>(DEFAULT_MODULE_PERMISSIONS);

    const fetchModulePermissions = useCallback(async (role: UserRole) => {
        console.log('useAuth: fetchModulePermissions - Buscando permissões para o papel:', role);
        const { data, error } = await supabase
            .from('module_permissions')
            .select('*')
            .eq('role', role);

        if (error) {
            console.error('useAuth: Erro ao buscar permissões de módulo:', error);
            setModulePermissions(DEFAULT_MODULE_PERMISSIONS);
            return;
        }

        const newPermissions: Record<ModuleName, boolean> = { ...DEFAULT_MODULE_PERMISSIONS };
        data.forEach(p => {
            if (Object.values(ModuleName).includes(p.module_name as ModuleName)) {
                newPermissions[p.module_name as ModuleName] = p.enabled;
            }
        });
        setModulePermissions(newPermissions);
        console.log('useAuth: Permissões de módulo buscadas:', newPermissions);
    }, []);

    const fetchUserData = useCallback(async (userId: string, userEmail: string) => {
        setLoadingAuth(true);
        console.log('useAuth: fetchUserData - Iniciando busca de dados do usuário para ID:', userId);
        const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select(`
                id,
                full_name,
                role,
                phone,
                address,
                avatar_url,
                permissions,
                company:companies (
                    id,
                    name,
                    cnpj,
                    phone,
                    address_street,
                    address_neighborhood,
                    address_complement,
                    address_city,
                    address_state,
                    status
                )
            `)
            .eq('id', userId)
            .single();

        if (profileError) {
            console.error('useAuth: Erro ao buscar perfil:', profileError);
            setLoadingAuth(false);
            setCurrentUser(null); // Garante que currentUser é null em caso de erro no perfil
            setCurrentCompany(null);
            return;
        }

        if (profileData) {
            console.log('useAuth: Perfil encontrado:', profileData);
            const user: User = {
                id: profileData.id,
                fullName: profileData.full_name || '',
                role: profileData.role as UserRole,
                email: userEmail,
                phone: profileData.phone || undefined,
                address: profileData.address || undefined,
                profilePictureUrl: profileData.avatar_url || undefined,
                permissions: profileData.permissions || {},
            };

            // Garantir que o e-mail do desenvolvedor sempre tenha o papel de Desenvolvedor
            if (user.email === DEVELOPER_EMAIL && user.role !== UserRole.DEVELOPER) {
                console.warn(`useAuth: Forçando o papel de 'Desenvolvedor' para ${DEVELOPER_EMAIL}.`);
                user.role = UserRole.DEVELOPER;
                // Opcionalmente, atualizar o DB aqui se estiver fora de sincronia, mas por enquanto, apenas atualiza o estado local
                // await supabase.from('profiles').update({ role: UserRole.DEVELOPER }).eq('id', user.id);
            }

            setCurrentUser(user);
            await fetchModulePermissions(user.role);

            // Verifica se a empresa está vinculada ao perfil
            if (profileData.company && Array.isArray(profileData.company) && profileData.company.length > 0) {
                console.log('useAuth: Empresa encontrada:', profileData.company[0]);
                const company: Company = profileData.company[0] as Company;
                setCurrentCompany(company);
            } else {
                console.log('useAuth: Nenhuma empresa associada ao perfil.');
                setCurrentCompany(null);
            }
        }
        setLoadingAuth(false);
        console.log('useAuth: fetchUserData concluído. loadingAuth = false.');
    }, [fetchModulePermissions]);

    useEffect(() => {
        console.log('useAuth: useEffect - loadingSession:', loadingSession, 'session:', session);
        if (!loadingSession) {
            if (session) {
                fetchUserData(session.user.id, session.user.email || '');
            } else {
                console.log('useAuth: Nenhuma sessão ativa. Resetando estados.');
                setCurrentUser(null);
                setCurrentCompany(null);
                setLoadingAuth(false);
                setModulePermissions(DEFAULT_MODULE_PERMISSIONS);
            }
        }
    }, [session, loadingSession, fetchUserData]);

    const handleCreateCompany = useCallback(async (companyData: Omit<Company, 'id' | 'created_at'>) => {
        if (!currentUser) {
            showError('Erro: Dados do usuário não disponíveis para criar a empresa.');
            console.error('handleCreateCompany: currentUser é nulo ou indefinido.');
            return;
        }
        const userId = currentUser.id; // Captura o ID do usuário
        const userEmail = currentUser.email; // Captura o email do usuário

        console.log('useAuth: handleCreateCompany - Criando empresa:', companyData.name, 'para userId:', userId);

        const { data: newCompanyDataArray, error: companyError } = await supabase
            .from('companies')
            .insert(companyData) // Inserir dados completos da empresa
            .select(); // Removido .single() para evitar erro de 'coerce' se o retorno não for exatamente 1

        if (companyError) {
            showError('Erro ao criar a empresa: ' + companyError.message);
            console.error('useAuth: Erro ao criar a empresa:', companyError);
            return;
        }

        if (!newCompanyDataArray || newCompanyDataArray.length === 0) {
            showError('Erro: Nenhuma empresa foi retornada após a criação.');
            console.error('useAuth: Nenhuma empresa retornada após insert.');
            return;
        }

        const newCompany = newCompanyDataArray[0]; // Pega o primeiro item do array

        let roleToAssign = UserRole.ADMIN;
        // Proteger o papel do e-mail do desenvolvedor
        if (userEmail === DEVELOPER_EMAIL) { // Usa o email capturado
            roleToAssign = UserRole.DEVELOPER;
        }

        const { error: profileUpdateError } = await supabase
            .from('profiles')
            .update({ company_id: newCompany.id, role: roleToAssign }) // Atribuir o papel determinado
            .eq('id', userId); // Usa o ID capturado

        if (profileUpdateError) {
            showError('Erro ao vincular a empresa ao seu perfil: ' + profileUpdateError.message);
            console.error('useAuth: Erro ao vincular empresa ao perfil:', profileUpdateError);
            return;
        }

        setCurrentCompany(newCompany);
        setCurrentUser(prev => prev ? { ...prev, role: roleToAssign } : null); // Atualizar o papel do usuário local
        await fetchModulePermissions(roleToAssign); // Buscar permissões para o novo papel
        showSuccess('Empresa criada e vinculada com sucesso!');
        setCurrentView(View.SURVEY_LIST);
        console.log('useAuth: Empresa criada e perfil atualizado com sucesso.');
    }, [currentUser, setCurrentView, fetchModulePermissions, showError, showSuccess]);

    const handleUpdateProfile = useCallback(async (updatedUser: User) => {
        console.log('useAuth: handleUpdateProfile - Atualizando perfil para:', updatedUser.id);

        let roleToUpdate = updatedUser.role;
        // Proteger o papel do e-mail do desenvolvedor
        if (updatedUser.email === DEVELOPER_EMAIL && updatedUser.role !== UserRole.DEVELOPER) {
            showError(`Não é permitido alterar o papel do usuário ${DEVELOPER_EMAIL}.`);
            console.warn(`Tentativa de alterar o papel de ${DEVELOPER_EMAIL} para ${updatedUser.role} foi bloqueada.`);
            // Reverter para o papel original para fins de exibição se a atualização for bloqueada
            setCurrentUser(prev => prev ? { ...prev, role: UserRole.DEVELOPER } : null);
            return;
        }

        const { error } = await supabase
            .from('profiles')
            .update({
                full_name: updatedUser.fullName,
                phone: updatedUser.phone,
                address: updatedUser.address,
                avatar_url: updatedUser.profilePictureUrl,
                role: roleToUpdate, // Atualizar o papel se não for protegido
            })
            .eq('id', updatedUser.id);

        if (error) {
            showError('Erro ao atualizar o perfil: ' + error.message);
            console.error('useAuth: Erro ao atualizar perfil:', error);
        } else {
            setCurrentUser(updatedUser);
            if (currentUser?.role !== updatedUser.role) {
                await fetchModulePermissions(updatedUser.role);
            }
            showSuccess('Perfil atualizado com sucesso!');
            setCurrentView(View.SURVEY_LIST);
            console.log('useAuth: Perfil atualizado com sucesso.');
        }
    }, [setCurrentView, currentUser?.role, fetchModulePermissions, showError, showSuccess]);

    const handleUpdateCompany = useCallback(async (updatedCompany: Company) => {
        if (!currentCompany) {
            showError('Nenhuma empresa selecionada para atualizar.');
            return;
        }
        console.log('useAuth: handleUpdateCompany - Atualizando empresa:', currentCompany.id);
        const { data, error } = await supabase
            .from('companies')
            .update({
                name: updatedCompany.name,
                cnpj: updatedCompany.cnpj,
                phone: updatedCompany.phone,
                address_street: updatedCompany.address_street,
                address_neighborhood: updatedCompany.address_neighborhood,
                address_complement: updatedCompany.address_complement,
                address_city: updatedCompany.address_city,
                address_state: updatedCompany.address_state,
            })
            .eq('id', currentCompany.id)
            .select()
            .single();

        if (error) {
            showError('Erro ao atualizar a empresa: ' + error.message);
            console.error('useAuth: Erro ao atualizar empresa:', error);
        } else if (data) {
            setCurrentCompany(data as Company);
            showSuccess('Empresa atualizada com sucesso!');
            setCurrentView(View.SURVEY_LIST);
            console.log('useAuth: Empresa atualizada com sucesso.');
        }
    }, [currentCompany, setCurrentView, showError, showSuccess]);

    const handleToggleCompanyStatus = useCallback(async (companyId: string, newStatus: 'active' | 'inactive') => {
        if (currentUser?.role !== UserRole.DEVELOPER) {
            showError('Você não tem permissão para alterar o status da empresa.');
            return;
        }
        console.log(`useAuth: handleToggleCompanyStatus - Alterando status da empresa ${companyId} para ${newStatus}`);
        const { error } = await supabase
            .from('companies')
            .update({ status: newStatus })
            .eq('id', companyId);

        if (error) {
            showError('Erro ao atualizar o status da empresa: ' + error.message);
            console.error('useAuth: Erro ao atualizar status da empresa:', error);
        } else {
            showSuccess(`Status da empresa atualizado para '${newStatus}' com sucesso!`);
            // Se a empresa atual for a que teve o status alterado, atualiza o estado local
            if (currentCompany?.id === companyId) {
                setCurrentCompany(prev => prev ? { ...prev, status: newStatus } : null);
            }
            // O RLS já deve impedir o acesso a dados para usuários de empresas inativas.
            // Para desativar logins, precisaríamos de uma Edge Function para banir usuários ou invalidar sessões.
            // Por enquanto, confiamos no RLS para bloquear o acesso aos dados.
        }
    }, [currentUser, currentCompany, showError, showSuccess]);

    const handleResetUserPassword = useCallback(async (userId: string, newPassword?: string) => {
        if (currentUser?.role !== UserRole.DEVELOPER && currentUser?.role !== UserRole.ADMIN) {
            showError('Você não tem permissão para redefinir senhas.');
            return;
        }

        // Em um cenário real, você chamaria uma Edge Function aqui para redefinir a senha
        // para evitar expor a chave de serviço ou a lógica de admin no cliente.
        // Por simplicidade, vamos simular a chamada ou usar a API de admin diretamente (com cautela).
        
        // Para o Developer, pode redefinir qualquer Admin.
        // Para o Admin, pode redefinir qualquer User da sua empresa.
        
        // A implementação real de redefinição de senha via admin API requer a chave de serviço,
        // que NÃO deve estar no cliente. Portanto, uma Edge Function é MANDATÓRIA aqui.
        // Por enquanto, vamos apenas mostrar um toast de sucesso e logar.
        
        // TODO: Implementar Edge Function para redefinição de senha.
        // Exemplo de como seria a chamada para uma Edge Function:
        // const { data, error } = await supabase.functions.invoke('reset-user-password', {
        //     body: { userId, newPassword },
        // });

        showSuccess(`Redefinição de senha para o usuário ${userId} solicitada. (Implementação via Edge Function pendente)`);
        console.log(`Redefinição de senha para o usuário ${userId} com nova senha: ${newPassword || '[gerada]'}`);
    }, [currentUser, showError, showSuccess]);

    const handleCreateUserForCompany = useCallback(async (companyId: string, fullName: string, email: string, role: UserRole, temporaryPassword?: string) => {
        if (currentUser?.role !== UserRole.DEVELOPER && currentUser?.role !== UserRole.ADMIN) {
            showError('Você não tem permissão para criar usuários.');
            return;
        }

        // TODO: Implementar Edge Function para criar usuário e perfil, e enviar senha temporária.
        // Isso é crucial para segurança e para usar a API de admin do Supabase.
        // Por enquanto, vamos simular.
        showSuccess(`Criação de usuário ${fullName} (${email}) com papel ${role} para a empresa ${companyId} solicitada. (Implementação via Edge Function pendente)`);
        console.log(`Criar usuário: ${fullName}, Email: ${email}, Papel: ${role}, Empresa: ${companyId}, Senha Temporária: ${temporaryPassword || '[gerada]'}`);
    }, [currentUser, showError, showSuccess]);

    const handleUpdateUserPermissions = useCallback(async (userId: string, permissions: Record<string, boolean>) => {
        if (currentUser?.role !== UserRole.ADMIN) {
            showError('Você não tem permissão para atualizar permissões de usuário.');
            return;
        }
        // TODO: Implementar Edge Function para atualizar permissões de usuário.
        // Ou, se a RLS permitir, pode ser feito diretamente via cliente.
        // Por enquanto, vamos simular.
        showSuccess(`Permissões do usuário ${userId} atualizadas. (Implementação pendente)`);
        console.log(`Atualizar permissões para o usuário ${userId}:`, permissions);
    }, [currentUser, showError, showSuccess]);

    const handleCreateCompanyAndAdmin = useCallback(async (companyName: string, adminFullName: string, adminEmail: string, adminPassword: string): Promise<boolean> => {
        if (currentUser?.role !== UserRole.DEVELOPER) {
            showError('Você não tem permissão para criar empresas e administradores.');
            return false;
        }

        try {
            const { data, error } = await supabase.functions.invoke('create-company-and-admin', {
                body: { companyName, adminFullName, adminEmail, adminPassword },
            });

            if (error) {
                console.error('Error invoking Edge Function:', error);
                showError('Erro ao criar empresa e administrador: ' + error.message);
                return false;
            }

            if (data.error) {
                console.error('Edge Function returned error:', data.error);
                showError('Erro ao criar empresa e administrador: ' + data.error);
                return false;
            }

            showSuccess('Empresa e administrador criados com sucesso!');
            return true;
        } catch (err: any) {
            console.error('Unhandled error during Edge Function invocation:', err.message);
            showError('Ocorreu um erro inesperado: ' + err.message);
            return false;
        }
    }, [currentUser, showError, showSuccess]);


    return {
        currentUser,
        currentCompany,
        loadingAuth,
        handleCreateCompany,
        handleUpdateProfile,
        handleUpdateCompany,
        fetchUserData,
        modulePermissions,
        handleToggleCompanyStatus,
        handleResetUserPassword,
        handleCreateUserForCompany,
        handleUpdateUserPermissions,
        handleCreateCompanyAndAdmin,
    };
};