import { useState, useEffect, useCallback } from 'react';
import { User, Company, UserRole, View, ModuleName, ModulePermission, Notice } from '@/types';
import { supabase } from '@/src/integrations/supabase/client';
import { useAuthSession } from '@/src/context/AuthSessionContext';
import { showSuccess, showError } from '@/src/utils/toast';
import { logActivity } from '@/src/utils/logger';

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
    handleAdminUpdateUserProfile: (userId: string, updatedFields: Partial<User>) => Promise<void>;
    handleDeleteUser: (userId: string, userEmail: string) => Promise<void>;
    handleCreateNotice: (message: string, targetRoles: UserRole[], companyId?: string) => Promise<boolean>;
}

const DEFAULT_MODULE_PERMISSIONS: Record<ModuleName, boolean> = {
    [ModuleName.CREATE_SURVEY]: false, // Default para false
    [ModuleName.MANAGE_SURVEYS]: false, // Default para false
    [ModuleName.VIEW_DASHBOARD]: false, // Default para false
    [ModuleName.ACCESS_GIVEAWAYS]: false,
    [ModuleName.PERFORM_GIVEAWAYS]: false,
    [ModuleName.VIEW_GIVEAWAY_DATA]: false,
    [ModuleName.MANAGE_COMPANY_SETTINGS]: false,
    [ModuleName.MANAGE_USERS]: false,
    [ModuleName.MANAGE_COMPANIES]: false,
    [ModuleName.MANAGE_NOTICES]: false, // Novo módulo de avisos
};

const DEVELOPER_EMAIL = 'santananegociosdigitais@gmail.com';

export const useAuth = (setCurrentView: (view: View) => void): UseAuthReturn => {
    const { session, loadingSession } = useAuthSession();
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
    const [loadingAuth, setLoadingAuth] = useState(true);
    const [modulePermissions, setModulePermissions] = useState<Record<ModuleName, boolean>>(DEFAULT_MODULE_PERMISSIONS);

    const fetchModulePermissions = useCallback(async (userRole: UserRole, userSpecificPermissions: Record<string, boolean> = {}) => {
        console.log('useAuth: fetchModulePermissions - Buscando permissões para o papel:', userRole, 'e aplicando overrides:', userSpecificPermissions);
        
        let combinedPermissions: Record<ModuleName, boolean> = { ...DEFAULT_MODULE_PERMISSIONS };

        // 1. Apply role-based permissions from the 'module_permissions' table
        const { data, error } = await supabase
            .from('module_permissions')
            .select('*')
            .eq('role', userRole);

        if (error) {
            console.error('useAuth: Erro ao buscar permissões de módulo baseadas no papel:', error);
            logActivity('ERROR', `Erro ao buscar permissões de módulo para o papel ${userRole}: ${error.message}`, 'AUTH', currentUser?.id, currentUser?.email, currentCompany?.id);
        } else {
            data.forEach(p => {
                if (Object.values(ModuleName).includes(p.module_name as ModuleName)) {
                    combinedPermissions[p.module_name as ModuleName] = p.enabled;
                }
            });
        }

        // 2. Apply user-specific overrides from 'profiles.permissions'
        // These overrides are primarily for 'Usuário' role to grant/revoke specific access
        for (const moduleName in userSpecificPermissions) {
            if (Object.values(ModuleName).includes(moduleName as ModuleName)) {
                combinedPermissions[moduleName as ModuleName] = userSpecificPermissions[moduleName];
            }
        }
        
        setModulePermissions(combinedPermissions);
        console.log('useAuth: Permissões de módulo combinadas e definidas:', combinedPermissions);
        logActivity('INFO', `Permissões de módulo carregadas e combinadas para o papel ${userRole}.`, 'AUTH', currentUser?.id, currentUser?.email, currentCompany?.id);
    }, [currentUser, currentCompany]);

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
                status,
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
            logActivity('ERROR', `Erro ao buscar perfil para o usuário ${userEmail}: ${profileError.message}`, 'AUTH', userId, userEmail);
            setLoadingAuth(false);
            setCurrentUser(null);
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
                status: profileData.status || 'active',
            };

            if (user.email === DEVELOPER_EMAIL && user.role !== UserRole.DEVELOPER) {
                console.warn(`useAuth: Forçando o papel de 'Desenvolvedor' para ${DEVELOPER_EMAIL}.`);
                user.role = UserRole.DEVELOPER;
                logActivity('WARN', `Papel de 'Desenvolvedor' forçado para o usuário ${userEmail}.`, 'AUTH', userId, userEmail);
            }

            // Only update currentUser if content has changed
            if (JSON.stringify(user) !== JSON.stringify(currentUser)) {
                setCurrentUser(user);
            }
            
            await fetchModulePermissions(user.role, user.permissions);

            const company: Company | null = profileData.companies ? (profileData.companies as unknown as Company) : null;
            // Only update currentCompany if content has changed
            if (JSON.stringify(company) !== JSON.stringify(currentCompany)) {
                setCurrentCompany(company);
            }

            if (company) {
                console.log('useAuth: Empresa encontrada:', profileData.companies);
                logActivity('INFO', `Usuário ${user.fullName} logado e vinculado à empresa ${company.name}.`, 'AUTH', userId, userEmail, company.id);
            } else {
                console.log('useAuth: Nenhuma empresa associada ao perfil.');
                logActivity('INFO', `Usuário ${user.fullName} logado, mas sem empresa vinculada.`, 'AUTH', userId, userEmail);
            }
        }
        setLoadingAuth(false);
        console.log('useAuth: fetchUserData concluído. loadingAuth = false.');
    }, [fetchModulePermissions, currentUser, currentCompany]); // Adicionar currentUser e currentCompany às dependências para a comparação

    useEffect(() => {
        console.log('useAuth: useEffect - loadingSession:', loadingSession, 'session:', session);
        if (!loadingSession) {
            if (session) {
                fetchUserData(session.user.id, session.user.email || '');
            } else {
                console.log('useAuth: Nenhuma sessão ativa. Resetando estados.');
                logActivity('INFO', 'Usuário deslogado.', 'AUTH', currentUser?.id, currentUser?.email, currentCompany?.id);
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
            logActivity('ERROR', 'Tentativa de criar empresa sem usuário logado.', 'COMPANIES');
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
            logActivity('ERROR', `Erro ao criar empresa '${companyData.name}': ${companyError.message}`, 'COMPANIES', userId, userEmail);
            return;
        }

        if (!newCompanyDataArray || newCompanyDataArray.length === 0) {
            showError('Erro: Nenhuma empresa foi retornada após a criação.');
            console.error('useAuth: Nenhuma empresa retornada após insert.');
            logActivity('ERROR', `Nenhuma empresa retornada após a criação de '${companyData.name}'.`, 'COMPANIES', userId, userEmail);
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
            logActivity('ERROR', `Erro ao vincular empresa '${newCompany.name}' ao perfil do usuário ${userEmail}: ${profileUpdateError.message}`, 'COMPANIES', userId, userEmail, newCompany.id);
            return;
        }

        setCurrentCompany(newCompany);
        setCurrentUser(prev => prev ? { ...prev, role: roleToAssign } : null);
        await fetchModulePermissions(roleToAssign);
        showSuccess('Empresa criada e vinculada com sucesso!');
        setCurrentView(View.SURVEY_LIST);
        logActivity('INFO', `Empresa '${newCompany.name}' criada e vinculada ao usuário ${userEmail}.`, 'COMPANIES', userId, userEmail, newCompany.id);
        console.log('useAuth: Empresa criada e perfil atualizado com sucesso.');
    }, [currentUser, setCurrentView, fetchModulePermissions, showError, showSuccess, setCurrentUser, setCurrentCompany]);

    const handleUpdateProfile = useCallback(async (updatedUser: User) => {
        console.log('useAuth: handleUpdateProfile - Atualizando perfil para:', updatedUser.id);

        let roleToUpdate = updatedUser.role;
        if (updatedUser.email === DEVELOPER_EMAIL && updatedUser.role !== UserRole.DEVELOPER) {
            showError(`Não é permitido alterar o papel do usuário ${DEVELOPER_EMAIL}.`);
            console.warn(`Tentativa de alterar o papel de ${DEVELOPER_EMAIL} para ${updatedUser.role} foi bloqueada.`);
            logActivity('WARN', `Tentativa de alterar o papel do desenvolvedor ${DEVELOPER_EMAIL} para ${updatedUser.role} foi bloqueada.`, 'AUTH', updatedUser.id, updatedUser.email, currentCompany?.id);
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
                status: updatedUser.status,
            })
            .eq('id', updatedUser.id);

        if (error) {
            showError('Erro ao atualizar o perfil: ' + error.message);
            console.error('useAuth: Erro ao atualizar perfil:', error);
            logActivity('ERROR', `Erro ao atualizar perfil do usuário ${updatedUser.email}: ${error.message}`, 'PROFILE', updatedUser.id, updatedUser.email, currentCompany?.id);
        } else {
            setCurrentUser(updatedUser);
            if (currentUser?.role !== updatedUser.role) {
                await fetchModulePermissions(updatedUser.role, updatedUser.permissions); // Passar as permissões do usuário
            }
            showSuccess('Perfil atualizado com sucesso!');
            setCurrentView(View.SURVEY_LIST);
            logActivity('INFO', `Perfil do usuário ${updatedUser.email} atualizado com sucesso.`, 'PROFILE', updatedUser.id, updatedUser.email, currentCompany?.id);
            console.log('useAuth: Perfil atualizado com sucesso.');
        }
    }, [setCurrentView, currentUser?.role, fetchModulePermissions, showError, showSuccess, currentCompany, setCurrentUser]);

    const handleUpdateCompany = useCallback(async (updatedCompany: Company) => {
        if (!currentCompany) {
            showError('Nenhuma empresa selecionada para atualizar.');
            logActivity('WARN', 'Tentativa de atualizar empresa sem empresa selecionada.', 'COMPANIES', currentUser?.id, currentUser?.email);
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
            logActivity('ERROR', `Erro ao atualizar empresa '${currentCompany.name}': ${error.message}`, 'COMPANIES', currentUser?.id, currentUser?.email, currentCompany.id);
        } else if (data) {
            setCurrentCompany(data as Company);
            showSuccess('Empresa atualizada com sucesso!');
            setCurrentView(View.SURVEY_LIST);
            logActivity('INFO', `Empresa '${data.name}' atualizada com sucesso.`, 'COMPANIES', currentUser?.id, currentUser?.email, data.id);
            console.log('useAuth: Empresa atualizada com sucesso.');
        }
    }, [currentCompany, setCurrentView, showError, showSuccess, currentUser, setCurrentCompany]);

    const handleToggleCompanyStatus = useCallback(async (companyId: string, newStatus: 'active' | 'inactive') => {
        if (currentUser?.role !== UserRole.DEVELOPER) {
            showError('Você não tem permissão para alterar o status da empresa.');
            logActivity('WARN', `Tentativa de alterar status da empresa ${companyId} por usuário sem permissão (${currentUser?.email}).`, 'COMPANIES', currentUser?.id, currentUser?.email, companyId);
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
            logActivity('ERROR', `Erro ao alterar status da empresa ${companyId} para ${newStatus}: ${error.message}`, 'COMPANIES', currentUser?.id, currentUser?.email, companyId);
        } else {
            showSuccess(`Status da empresa atualizado para '${newStatus}' com sucesso!`);
            if (currentCompany?.id === companyId) {
                setCurrentCompany(prev => prev ? { ...prev, status: newStatus } : null);
            }
            logActivity('INFO', `Status da empresa ${companyId} alterado para '${newStatus}'.`, 'COMPANIES', currentUser?.id, currentUser?.email, companyId);
        }
    }, [currentUser, currentCompany, showError, showSuccess, setCurrentCompany]);

    const handleResetUserPassword = useCallback(async (userId: string, newPassword?: string) => {
        if (currentUser?.role !== UserRole.DEVELOPER && currentUser?.role !== UserRole.ADMIN) {
            showError('Você não tem permissão para redefinir senhas.');
            logActivity('WARN', `Tentativa de redefinir senha do usuário ${userId} por usuário sem permissão (${currentUser?.email}).`, 'AUTH', currentUser?.id, currentUser?.email, currentCompany?.id);
            return;
        }

        const password = newPassword || `temp_${Math.random().toString(36).slice(-8)}`;
        
        const { error } = await supabase.functions.invoke('reset-user-password', {
            body: { userId, newPassword: password },
        });

        if (error) {
            showError(`Erro ao redefinir senha: ${error.message}`);
            logActivity('ERROR', `Erro ao redefinir senha para o usuário ${userId}: ${error.message}`, 'AUTH', currentUser?.id, currentUser?.email, currentCompany?.id);
        } else {
            showSuccess(`Senha do usuário redefinida com sucesso! A nova senha temporária é: ${password}`);
            logActivity('INFO', `Senha do usuário ${userId} redefinida com sucesso.`, 'AUTH', currentUser?.id, currentUser?.email, currentCompany?.id);
        }
    }, [currentUser, showError, showSuccess, currentCompany]);

    const handleCreateUserForCompany = useCallback(async (companyId: string, fullName: string, email: string, role: UserRole, temporaryPassword?: string) => {
        if (currentUser?.role !== UserRole.DEVELOPER && currentUser?.role !== UserRole.ADMIN) {
            showError('Você não tem permissão para criar usuários.');
            logActivity('WARN', `Tentativa de criar usuário para empresa ${companyId} por usuário sem permissão (${currentUser?.email}).`, 'AUTH', currentUser?.id, currentUser?.email, companyId);
            return;
        }

        if (!temporaryPassword) {
            showError('A senha temporária é obrigatória.');
            logActivity('ERROR', `Tentativa de criar usuário para empresa ${companyId} sem senha temporária.`, 'AUTH', currentUser?.id, currentUser?.email, companyId);
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
            logActivity('ERROR', `Erro ao criar usuário '${email}' para empresa ${companyId}: ${error.message}`, 'AUTH', currentUser?.id, currentUser?.email, companyId);
        } else {
            showSuccess(`Usuário ${fullName} criado com sucesso!`);
            console.log('Usuário criado:', data);
            logActivity('INFO', `Usuário '${email}' criado com sucesso para empresa ${companyId}.`, 'AUTH', currentUser?.id, currentUser?.email, companyId);
        }
    }, [currentUser, showError, showSuccess, currentCompany]);

    const handleUpdateUserPermissions = useCallback(async (userId: string, permissions: Record<string, boolean>) => {
        if (currentUser?.role !== UserRole.ADMIN && currentUser?.role !== UserRole.DEVELOPER) {
            showError('Você não tem permissão para atualizar permissões de usuário.');
            logActivity('WARN', `Tentativa de atualizar permissões do usuário ${userId} por usuário sem permissão (${currentUser?.email}).`, 'AUTH', currentUser?.id, currentUser?.email, currentCompany?.id);
            return;
        }
        
        const { error } = await supabase
            .from('profiles')
            .update({ permissions: permissions })
            .eq('id', userId);

        if (error) {
            showError('Erro ao atualizar permissões: ' + error.message);
            console.error('Erro ao atualizar permissões:', error);
            logActivity('ERROR', `Erro ao atualizar permissões para o usuário ${userId}: ${error.message}`, 'AUTH', currentUser?.id, currentUser?.email, currentCompany?.id);
        } else {
            showSuccess(`Permissões do usuário ${userId} atualizadas com sucesso!`);
            logActivity('INFO', `Permissões do usuário ${userId} atualizadas com sucesso.`, 'AUTH', currentUser?.id, currentUser?.email, currentCompany?.id);
            if (currentUser?.id === userId && currentUser.email) {
                await fetchUserData(userId, currentUser.email);
            }
        }
    }, [currentUser, showError, showSuccess, currentCompany, fetchUserData]);

    const handleAdminUpdateUserProfile = useCallback(async (userId: string, updatedFields: Partial<User>) => {
        if (currentUser?.role !== UserRole.ADMIN && currentUser?.role !== UserRole.DEVELOPER) {
            showError('Você não tem permissão para atualizar perfis de usuário.');
            logActivity('WARN', `Tentativa de admin atualizar perfil do usuário ${userId} por usuário sem permissão (${currentUser?.email}).`, 'ADMIN_USER_MANAGER', currentUser?.id, currentUser?.email, currentCompany?.id);
            return;
        }

        const fieldsToUpdate: Partial<User> = { ...updatedFields };
        delete fieldsToUpdate.email;
        delete fieldsToUpdate.role;
        delete fieldsToUpdate.id;

        const { error } = await supabase
            .from('profiles')
            .update(fieldsToUpdate)
            .eq('id', userId);

        if (error) {
            showError('Erro ao atualizar perfil do usuário: ' + error.message);
            console.error('Erro ao atualizar perfil do usuário:', error);
            logActivity('ERROR', `Erro ao admin atualizar perfil do usuário ${userId}: ${error.message}`, 'ADMIN_USER_MANAGER', currentUser?.id, currentUser?.email, currentCompany?.id);
        } else {
            showSuccess('Perfil do usuário atualizado com sucesso!');
            logActivity('INFO', `Perfil do usuário ${userId} atualizado por admin.`, 'ADMIN_USER_MANAGER', currentUser?.id, currentUser?.email, currentCompany?.id);
        }
    }, [currentUser, showError, showSuccess, currentCompany]);

    const handleDeleteUser = useCallback(async (userId: string, userEmail: string) => {
        if (currentUser?.role !== UserRole.ADMIN && currentUser?.role !== UserRole.DEVELOPER) {
            showError('Você não tem permissão para excluir usuários.');
            logActivity('WARN', `Tentativa de excluir usuário ${userId} por usuário sem permissão (${currentUser?.email}).`, 'ADMIN_USER_MANAGER', currentUser?.id, currentUser?.email, currentCompany?.id);
            return;
        }

        if (userId === currentUser?.id) {
            showError('Você não pode excluir seu próprio usuário.');
            logActivity('WARN', `Tentativa de auto-exclusão bloqueada para o usuário ${currentUser?.email}.`, 'ADMIN_USER_MANAGER', currentUser?.id, currentUser?.email, currentCompany?.id);
            return;
        }

        try {
            const { error } = await supabase.auth.admin.deleteUser(userId);

            if (error) {
                showError(`Erro ao excluir usuário: ${error.message}`);
                console.error('Erro ao excluir usuário:', error);
                logActivity('ERROR', `Erro ao excluir usuário ${userEmail} (ID: ${userId}): ${error.message}`, 'ADMIN_USER_MANAGER', currentUser?.id, currentUser?.email, currentCompany?.id);
            } else {
                showSuccess(`Usuário ${userEmail} excluído com sucesso!`);
                logActivity('INFO', `Usuário ${userEmail} (ID: ${userId}) excluído com sucesso.`, 'ADMIN_USER_MANAGER', currentUser?.id, currentUser?.email, currentCompany?.id);
            }
        } catch (err: any) {
            showError(`Erro inesperado ao excluir usuário: ${err.message}`);
            console.error('Erro inesperado ao excluir usuário:', err);
            logActivity('ERROR', `Erro inesperado ao excluir usuário ${userEmail} (ID: ${userId}): ${err.message}`, 'ADMIN_USER_MANAGER', currentUser?.id, currentUser?.email, currentCompany?.id);
        }
    }, [currentUser, showError, showSuccess, currentCompany]);

    const handleCreateNotice = useCallback(async (message: string, targetRoles: UserRole[], companyId?: string): Promise<boolean> => {
        if (!currentUser) {
            showError('Você precisa estar logado para criar um aviso.');
            logActivity('WARN', 'Tentativa de criar aviso sem usuário logado.', 'NOTICES');
            return false;
        }

        if (!message.trim()) {
            showError('A mensagem do aviso não pode estar vazia.');
            logActivity('WARN', `Tentativa de criar aviso vazio por ${currentUser.email}.`, 'NOTICES', currentUser.id, currentUser.email, companyId);
            return false;
        }

        if (targetRoles.length === 0) {
            showError('Selecione pelo menos um papel para o aviso.');
            logActivity('WARN', `Tentativa de criar aviso sem papéis de destino por ${currentUser.email}.`, 'NOTICES', currentUser.id, currentUser.email, companyId);
            return false;
        }

        // Validação de permissões para criar avisos
        if (currentUser.role === UserRole.ADMIN) {
            if (targetRoles.includes(UserRole.DEVELOPER) || targetRoles.includes(UserRole.ADMIN)) {
                showError('Administradores só podem enviar avisos para Usuários.');
                logActivity('WARN', `Admin ${currentUser.email} tentou enviar aviso para Desenvolvedor/Admin.`, 'NOTICES', currentUser.id, currentUser.email, companyId);
                return false;
            }
            if (!companyId || companyId !== currentCompany?.id) {
                showError('Administradores só podem enviar avisos para usuários da sua própria empresa.');
                logActivity('WARN', `Admin ${currentUser.email} tentou enviar aviso para fora da sua empresa.`, 'NOTICES', currentUser.id, currentUser.email, companyId);
                return false;
            }
        } else if (currentUser.role === UserRole.USER) {
            showError('Usuários não têm permissão para criar avisos.');
            logActivity('WARN', `Usuário ${currentUser.email} tentou criar aviso.`, 'NOTICES', currentUser.id, currentUser.email, companyId);
            return false;
        }

        try {
            const { error } = await supabase.from('notices').insert({
                sender_id: currentUser.id,
                sender_email: currentUser.email,
                message,
                target_roles: targetRoles,
                company_id: companyId,
            });

            if (error) {
                showError('Erro ao criar aviso: ' + error.message);
                logActivity('ERROR', `Erro ao criar aviso por ${currentUser.email}: ${error.message}`, 'NOTICES', currentUser.id, currentUser.email, companyId);
                return false;
            }

            showSuccess('Aviso criado e enviado com sucesso!');
            logActivity('INFO', `Aviso criado por ${currentUser.email} para ${targetRoles.join(', ')}.`, 'NOTICES', currentUser.id, currentUser.email, companyId);
            return true;
        } catch (err: any) {
            showError('Erro inesperado ao criar aviso: ' + err.message);
            logActivity('ERROR', `Erro inesperado ao criar aviso por ${currentUser.email}: ${err.message}`, 'NOTICES', currentUser.id, currentUser.email, companyId);
            return false;
        }
    }, [currentUser, currentCompany, showError, showSuccess]);


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
        handleAdminUpdateUserProfile,
        handleDeleteUser,
        handleCreateNotice,
    };
};