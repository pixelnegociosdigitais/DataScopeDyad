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
                companies (
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
            if (profileData.companies) {
                console.log('useAuth: Empresa encontrada:', profileData.companies);
                const company: Company = profileData.companies as unknown as Company;
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
        const userId = currentUser.id;
        const userEmail = currentUser.email;

        console.log('useAuth: handleCreateCompany - Criando empresa:', companyData.name, 'para userId:', userId);

        const companyToInsert = {
            ...companyData,
            created_by: userId,
        };

        const { data: newCompanyDataArray, error: companyError } = await supabase
            .from('companies')
            .insert(companyToInsert)
            .select();

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

        const newCompany = newCompanyDataArray[0];

        let roleToAssign = UserRole.ADMIN;
        if (userEmail === DEVELOPER_EMAIL) {
            roleToAssign = UserRole.DEVELOPER;
        }

        const { error: profileUpdateError } = await supabase
            .from('profiles')
            .update({ company_id: newCompany.id })
            .eq('id', userId);

        if (profileUpdateError) {
            showError('Erro ao vincular a empresa ao seu perfil: ' + profileUpdateError.message);
            console.error('useAuth: Erro ao vincular empresa ao perfil:', profileUpdateError);
            return;
        }

        setCurrentCompany(newCompany);
        setCurrentUser(prev => prev ? { ...prev, role: roleToAssign } : null);
        await fetchModulePermissions(roleToAssign);
        showSuccess('Empresa criada e vinculada com sucesso!');
        setCurrentView(View.SURVEY_LIST);
        console.log('useAuth: Empresa criada e perfil atualizado com sucesso.');
    }, [currentUser, setCurrentView, fetchModulePermissions, showError, showSuccess]);

    const handleUpdateProfile = useCallback(async (updatedUser: User) => {
        console.log('useAuth: handleUpdateProfile - Atualizando perfil para:', updatedUser.id);

        let roleToUpdate = updatedUser.role;
        if (updatedUser.email === DEVELOPER_EMAIL && updatedUser.role !== UserRole.DEVELOPER) {
            showError(`Não é permitido alterar o papel do usuário ${DEVELOPER_EMAIL}.`);
            console.warn(`Tentativa de alterar o papel de ${DEVELOPER_EMAIL} para ${updatedUser.role} foi bloqueada.`);
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
                role: roleToUpdate,
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
            if (currentCompany?.id === companyId) {
                setCurrentCompany(prev => prev ? { ...prev, status: newStatus } : null);
            }
        }
    }, [currentUser, currentCompany, showError, showSuccess]);

    const handleResetUserPassword = useCallback(async (userId: string, newPassword?: string) => {
        if (currentUser?.role !== UserRole.DEVELOPER && currentUser?.role !== UserRole.ADMIN) {
            showError('Você não tem permissão para redefinir senhas.');
            return;
        }

        const password = newPassword || `temp_${Math.random().toString(36).slice(-8)}`;
        
        const { error } = await supabase.functions.invoke('reset-user-password', {
            body: { userId, newPassword: password },
        });

        if (error) {
            showError(`Erro ao redefinir senha: ${error.message}`);
        } else {
            showSuccess(`Senha do usuário redefinida com sucesso! A nova senha temporária é: ${password}`);
        }
    }, [currentUser, showError, showSuccess]);

    const handleCreateUserForCompany = useCallback(async (companyId: string, fullName: string, email: string, role: UserRole, temporaryPassword?: string) => {
        if (currentUser?.role !== UserRole.DEVELOPER && currentUser?.role !== UserRole.ADMIN) {
            showError('Você não tem permissão para criar usuários.');
            return;
        }

        if (!temporaryPassword) {
            showError('A senha temporária é obrigatória.');
            return;
        }

        const { data, error } = await supabase.functions.invoke('create-user', {
            body: {
                email,
                password: temporaryPassword,
                fullName,
                role,
                companyId,
            },
        });

        if (error) {
            showError(`Erro ao criar usuário: ${error.message}`);
            console.error('Erro ao invocar a função create-user:', error);
        } else {
            showSuccess(`Usuário ${fullName} criado com sucesso!`);
            console.log('Usuário criado:', data);
        }
    }, [currentUser, showError, showSuccess]);

    const handleUpdateUserPermissions = useCallback(async (userId: string, permissions: Record<string, boolean>) => {
        if (currentUser?.role !== UserRole.ADMIN) {
            showError('Você não tem permissão para atualizar permissões de usuário.');
            return;
        }
        
        const { error } = await supabase
            .from('profiles')
            .update({ permissions: permissions })
            .eq('id', userId);

        if (error) {
            showError('Erro ao atualizar permissões: ' + error.message);
            console.error('Erro ao atualizar permissões:', error);
        } else {
            showSuccess(`Permissões do usuário ${userId} atualizadas com sucesso!`);
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
    };
};