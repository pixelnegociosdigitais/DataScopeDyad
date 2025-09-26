import { useState, useEffect, useCallback } from 'react';
import { User, Company, UserRole, View, ModuleName, ModulePermission } from '@/types';
import { supabase } from '@/src/integrations/supabase/client';
import { useAuthSession } from '@/src/context/AuthSessionContext';

interface UseAuthReturn {
    currentUser: User | null;
    currentCompany: Company | null;
    loadingAuth: boolean;
    handleCreateCompany: (companyName: string) => Promise<void>;
    handleUpdateProfile: (updatedUser: User) => Promise<void>;
    handleUpdateCompany: (updatedCompany: Company) => Promise<void>;
    fetchUserData: (userId: string, userEmail: string) => Promise<void>;
    needsCompanySetup: boolean;
    modulePermissions: Record<ModuleName, boolean>; // Adicionar permissões de módulo
}

const DEFAULT_MODULE_PERMISSIONS: Record<ModuleName, boolean> = {
    [ModuleName.CREATE_SURVEY]: true,
    [ModuleName.MANAGE_SURVEYS]: true,
    [ModuleName.VIEW_DASHBOARD]: true,
    [ModuleName.ACCESS_GIVEAWAYS]: true,
    [ModuleName.MANAGE_COMPANY_SETTINGS]: true,
};

export const useAuth = (setCurrentView: (view: View) => void): UseAuthReturn => {
    const { session, loadingSession } = useAuthSession();
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
    const [loadingAuth, setLoadingAuth] = useState(true);
    const [needsCompanySetup, setNeedsCompanySetup] = useState(false);
    const [modulePermissions, setModulePermissions] = useState<Record<ModuleName, boolean>>(DEFAULT_MODULE_PERMISSIONS);

    const fetchModulePermissions = useCallback(async (role: UserRole) => {
        const { data, error } = await supabase
            .from('module_permissions')
            .select('*')
            .eq('role', role);

        if (error) {
            console.error('Erro ao buscar permissões de módulo:', error);
            setModulePermissions(DEFAULT_MODULE_PERMISSIONS); // Fallback to default
            return;
        }

        const newPermissions: Record<ModuleName, boolean> = { ...DEFAULT_MODULE_PERMISSIONS };
        data.forEach(p => {
            if (Object.values(ModuleName).includes(p.module_name as ModuleName)) {
                newPermissions[p.module_name as ModuleName] = p.enabled;
            }
        });
        setModulePermissions(newPermissions);
    }, []);

    const fetchUserData = useCallback(async (userId: string, userEmail: string) => {
        setLoadingAuth(true);
        const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select(`
                id,
                full_name,
                role,
                phone,
                address,
                avatar_url,
                company:companies (
                    id, 
                    name,
                    cnpj,
                    phone,
                    address_street,
                    address_neighborhood,
                    address_complement,
                    address_city,
                    address_state
                )
            `)
            .eq('id', userId)
            .single();

        if (profileError) {
            console.error('Erro ao buscar perfil:', profileError);
            setLoadingAuth(false);
            return;
        }

        if (profileData) {
            const user: User = {
                id: profileData.id,
                fullName: profileData.full_name || '',
                role: profileData.role as UserRole,
                email: userEmail,
                phone: profileData.phone || undefined,
                address: profileData.address || undefined,
                profilePictureUrl: profileData.avatar_url || undefined,
            };
            setCurrentUser(user);
            await fetchModulePermissions(user.role); // Fetch permissions for the user's role

            if (profileData.company) {
                const company: Company = {
                    id: profileData.company.id,
                    name: profileData.company.name,
                    cnpj: profileData.company.cnpj || undefined,
                    phone: profileData.company.phone || undefined,
                    address_street: profileData.company.address_street || undefined,
                    address_neighborhood: profileData.company.address_neighborhood || undefined,
                    address_complement: profileData.company.address_complement || undefined,
                    address_city: profileData.company.address_city || undefined,
                    address_state: profileData.company.address_state || undefined,
                };
                setCurrentCompany(company);
                setNeedsCompanySetup(false);
            } else {
                setCurrentCompany(null);
                setNeedsCompanySetup(true);
                setCurrentView(View.COMPANY_SETUP);
            }
        }
        setLoadingAuth(false);
    }, [setCurrentView, fetchModulePermissions]);

    useEffect(() => {
        if (!loadingSession) {
            if (session) {
                fetchUserData(session.user.id, session.user.email || '');
            } else {
                setCurrentUser(null);
                setCurrentCompany(null);
                setLoadingAuth(false);
                setNeedsCompanySetup(false);
                setModulePermissions(DEFAULT_MODULE_PERMISSIONS); // Reset permissions on logout
            }
        }
    }, [session, loadingSession, fetchUserData]);

    const handleCreateCompany = useCallback(async (companyName: string) => {
        if (!currentUser) return;

        const { data: newCompanyData, error: companyError } = await supabase
            .from('companies')
            .insert({ name: companyName })
            .select()
            .single();

        if (companyError) {
            alert('Erro ao criar a empresa: ' + companyError.message);
            console.error('Erro ao criar a empresa:', companyError);
            return;
        }

        const { error: profileUpdateError } = await supabase
            .from('profiles')
            .update({ company_id: newCompanyData.id, role: UserRole.ADMIN })
            .eq('id', currentUser.id);

        if (profileUpdateError) {
            alert('Erro ao vincular a empresa ao seu perfil: ' + profileUpdateError.message);
            console.error('Erro ao vincular empresa ao perfil:', profileUpdateError);
            return;
        }

        setCurrentCompany(newCompanyData);
        setCurrentUser(prev => prev ? { ...prev, role: UserRole.ADMIN } : null);
        await fetchModulePermissions(UserRole.ADMIN); // Fetch permissions for the new ADMIN role
        alert('Empresa criada e vinculada com sucesso!');
        setNeedsCompanySetup(false);
        setCurrentView(View.SURVEY_LIST);
    }, [currentUser, setCurrentView, fetchModulePermissions]);

    const handleUpdateProfile = useCallback(async (updatedUser: User) => {
        const { error } = await supabase
            .from('profiles')
            .update({
                full_name: updatedUser.fullName,
                phone: updatedUser.phone,
                address: updatedUser.address,
                avatar_url: updatedUser.profilePictureUrl,
            })
            .eq('id', updatedUser.id);

        if (error) {
            alert('Erro ao atualizar o perfil: ' + error.message);
            console.error('Erro ao atualizar perfil:', error);
        } else {
            setCurrentUser(updatedUser);
            // If role changes, permissions might change, so re-fetch
            if (currentUser?.role !== updatedUser.role) {
                await fetchModulePermissions(updatedUser.role);
            }
            alert('Perfil atualizado com sucesso!');
            setCurrentView(View.SURVEY_LIST);
        }
    }, [setCurrentView, currentUser?.role, fetchModulePermissions]);

    const handleUpdateCompany = useCallback(async (updatedCompany: Company) => {
        if (!currentCompany) return;
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
            alert('Erro ao atualizar a empresa: ' + error.message);
            console.error('Erro ao atualizar empresa:', error);
        } else if (data) {
            setCurrentCompany(data as Company);
            alert('Empresa atualizada com sucesso!');
            setCurrentView(View.SURVEY_LIST);
        }
    }, [currentCompany, setCurrentView]);

    return {
        currentUser,
        currentCompany,
        loadingAuth,
        handleCreateCompany,
        handleUpdateProfile,
        handleUpdateCompany,
        fetchUserData,
        needsCompanySetup,
        modulePermissions,
    };
};