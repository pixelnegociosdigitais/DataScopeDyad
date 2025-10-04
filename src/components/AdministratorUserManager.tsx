import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeftIcon } from '@/components/icons/ArrowLeftIcon';
import { UserIcon } from '@/components/icons/UserIcon';
import { PencilIcon } from '@/components/icons/PencilIcon';
import { TrashIcon } from '@/components/icons/TrashIcon';
import { CreateIcon } from '@/components/icons/CreateIcon';
import { User, UserRole, Company, View, ModuleName } from '@/types';
import { supabase } from '@/src/integrations/supabase/client';
import { showError } from '@/src/utils/toast';
import ConfirmationDialog from '@/src/components/ConfirmationDialog';
import UserEditModal from '@/src/components/UserEditModal';

// Mapeamento de tradução para os nomes dos módulos
const moduleNameTranslations: Record<ModuleName, string> = {
    [ModuleName.CREATE_SURVEY]: 'Criar Pesquisas',
    [ModuleName.MANAGE_SURVEYS]: 'Gerenciar Pesquisas (Editar/Excluir)',
    [ModuleName.VIEW_DASHBOARD]: 'Visualizar Painel de Pesquisas',
    [ModuleName.ACCESS_GIVEAWAYS]: 'Acessar Sorteios (Antigo)',
    [ModuleName.PERFORM_GIVEAWAYS]: 'Realizar Sorteios e Gerenciar Prêmios',
    [ModuleName.VIEW_GIVEAWAY_DATA]: 'Visualizar Histórico de Sorteios',
    [ModuleName.MANAGE_COMPANY_SETTINGS]: 'Gerenciar Configurações da Empresa',
    [ModuleName.MANAGE_USERS]: 'Gerenciar Usuários',
    [ModuleName.MANAGE_COMPANIES]: 'Gerenciar Empresas',
    [ModuleName.MANAGE_NOTICES]: 'Gerenciar Avisos',
    [ModuleName.ACCESS_CHAT]: 'Acessar Chat',
    [ModuleName.MANAGE_SURVEY_TEMPLATES]: 'Gerenciar Modelos de Pesquisa',
};

interface AdministratorUserManagerProps {
    onBack: () => void;
    currentUser: User;
    currentCompany: Company | null;
    // setCurrentView: (view: View) => void; // Removed as it's not directly used here
    // Functions passed from useAuth in App.tsx
    handleResetUserPassword: (userId: string, newPassword?: string) => Promise<void>;
    handleCreateUserForCompany: (companyId: string, fullName: string, email: string, role: UserRole, temporaryPassword: string) => Promise<void>;
    handleUpdateUserPermissions: (userId: string, permissions: Record<string, boolean>) => Promise<void>;
    handleAdminUpdateUserProfile: (userId: string, updatedFields: Partial<User>) => Promise<void>;
    handleDeleteUser: (userId: string, userEmail: string) => Promise<void>;
}

const AdministratorUserManager: React.FC<AdministratorUserManagerProps> = ({ 
    onBack, 
    currentUser, 
    currentCompany, 
    // setCurrentView, // Removed from destructuring
    handleResetUserPassword,
    handleCreateUserForCompany,
    handleUpdateUserPermissions,
    handleAdminUpdateUserProfile,
    handleDeleteUser,
}) => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showCreateUserModal, setShowCreateUserModal] = useState(false);
    const [newUserName, setNewUserName] = useState('');
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
    const [dialogMessage, setDialogMessage] = useState('');
    const [dialogTitle, setDialogTitle] = useState('');
    const [dialogConfirmAction, setDialogConfirmAction] = useState<(() => void) | null>(null);
    const [showPermissionsModal, setShowPermissionsModal] = useState(false);
    const [editingUserPermissions, setEditingUserPermissions] = useState<User | null>(null);
    const [currentPermissions, setCurrentPermissions] = useState<Record<string, boolean>>({});
    const [showEditUserModal, setShowEditUserModal] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        setError(null);
        if (!currentCompany?.id) {
            setUsers([]);
            setError('Nenhuma empresa associada para gerenciar usuários.');
            setLoading(false);
            return;
        }

        const { data, error } = await supabase
            .from('profiles')
            .select(`
                id,
                full_name,
                role,
                email,
                phone,
                address,
                avatar_url,
                permissions,
                status
            `)
            .eq('company_id', currentCompany.id)
            .neq('role', UserRole.DEVELOPER);

        if (error) {
            console.error('Erro ao buscar usuários:', error);
            setError('Não foi possível carregar os usuários da empresa.');
            setUsers([]);
        } else {
            const fetchedUsers: User[] = data.map((p: any) => ({
                id: p.id,
                fullName: p.full_name || '',
                role: p.role as UserRole,
                email: p.email || '',
                phone: p.phone || undefined,
                address: p.address || undefined,
                profilePictureUrl: p.avatar_url || undefined,
                permissions: p.permissions || {},
                status: p.status || 'active',
            }));
            setUsers(fetchedUsers);
        }
        setLoading(false);
    }, [currentCompany?.id]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleCreateUser = async () => {
        if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword.trim()) {
            showError('Por favor, preencha todos os campos para criar o usuário.');
            return;
        }
        if (!currentCompany?.id) {
            showError('Empresa não identificada para criar o usuário.');
            return;
        }

        await handleCreateUserForCompany(currentCompany.id, newUserName, newUserEmail, UserRole.USER, newUserPassword);
        
        setShowCreateUserModal(false);
        setNewUserName('');
        setNewUserEmail('');
        setNewUserPassword('');
        fetchUsers();
    };

    const confirmResetUserPassword = (userId: string, userName: string) => {
        setDialogTitle('Redefinir Senha do Usuário');
        setDialogMessage(`Tem certeza que deseja redefinir a senha do usuário "${userName}"? Uma nova senha temporária será gerada e exibida.`);
        setDialogConfirmAction(() => async () => {
            await handleResetUserPassword(userId);
            setShowConfirmationDialog(false);
        });
        setShowConfirmationDialog(true);
    };

    const handleOpenPermissionsModal = (user: User) => {
        setEditingUserPermissions(user);
        setCurrentPermissions(user.permissions || {});
        setShowPermissionsModal(true);
    };

    const handleClosePermissionsModal = () => {
        setShowPermissionsModal(false);
        setEditingUserPermissions(null);
        setCurrentPermissions({});
    };

    const handlePermissionChange = (permissionKey: string, enabled: boolean) => {
        setCurrentPermissions(prev => ({ ...prev, [permissionKey]: enabled }));
    };

    const handleSavePermissions = async () => {
        if (!editingUserPermissions) return;
        await handleUpdateUserPermissions(editingUserPermissions.id, currentPermissions);
        handleClosePermissionsModal();
        fetchUsers();
    };

    const handleOpenEditUserModal = (user: User) => {
        setEditingUser(user);
        setShowEditUserModal(true);
    };

    const handleCloseEditUserModal = () => {
        setEditingUser(null);
        setShowEditUserModal(false);
    };

    const handleUpdateUserSuccess = (updatedUser: User) => {
        setUsers(prevUsers => prevUsers.map(u => u.id === updatedUser.id ? updatedUser : u));
        fetchUsers();
    };

    const confirmDeleteUser = (user: User) => {
        setUserToDelete(user);
        setDialogTitle('Confirmar Exclusão de Usuário');
        setDialogMessage(`Tem certeza que deseja excluir o usuário "${user.fullName}" (${user.email})? Esta ação é irreversível.`);
        setDialogConfirmAction(() => async () => {
            if (userToDelete) {
                await handleDeleteUser(userToDelete.id, userToDelete.email);
                setShowConfirmationDialog(false);
                fetchUsers();
                setUserToDelete(null);
            }
        });
        setShowConfirmationDialog(true);
    };

    const handleToggleUserStatus = async (user: User) => {
        const newStatus = user.status === 'active' ? 'inactive' : 'active';
        await handleAdminUpdateUserProfile(user.id, { status: newStatus });
        fetchUsers();
    };

    if (loading) {
        return <div className="text-center py-8 text-text-light">Carregando gerenciamento de usuários...</div>;
    }

    if (!currentCompany) {
        return (
            <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-md text-center">
                <UserIcon className="h-12 w-12 text-primary mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-text-main mb-4">Gerenciamento de Usuários</h2>
                <p className="text-text-light mb-6">
                    Você precisa ter uma empresa associada para gerenciar usuários.
                </p>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto bg-white p-8 rounded-lg shadow-md">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-200 transition-colors" aria-label="Voltar">
                    <ArrowLeftIcon className="h-6 w-6 text-gray-600" />
                </button>
                <UserIcon className="h-8 w-8 text-primary" />
                <h2 className="text-2xl font-bold text-text-main">Gerenciamento de Usuários da Empresa</h2>
            </div>
            <p className="text-text-light mb-6">
                Gerencie os usuários da sua empresa ({currentCompany.name}), crie novos acessos e defina permissões.
            </p>

            {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">{error}</div>}

            <div className="mb-6 flex justify-end">
                <button
                    onClick={() => setShowCreateUserModal(true)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark"
                >
                    <CreateIcon className="h-4 w-4" /> Cadastrar Novo Usuário
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                    <thead>
                        <tr className="bg-gray-100 border-b border-gray-200">
                            <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Nome</th>
                            <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Email</th>
                            <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Papel</th>
                            <th className="py-3 px-4 text-center text-sm font-semibold text-gray-700">Status</th>
                            <th className="py-3 px-4 text-center text-sm font-semibold text-gray-700">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id} className="border-b border-gray-100 last:border-b-0">
                                <td className="py-3 px-4 text-sm text-gray-800 font-medium">{user.fullName}</td>
                                <td className="py-3 px-4 text-sm text-gray-700">{user.email}</td>
                                <td className="py-3 px-4 text-sm text-gray-700">{user.role}</td>
                                <td className="py-3 px-4 text-center">
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            value=""
                                            className="sr-only peer"
                                            checked={user.status === 'active'}
                                            onChange={() => handleToggleUserStatus(user)}
                                            disabled={user.id === currentUser.id || user.role === UserRole.ADMIN}
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-light rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                        <span className="ml-3 text-sm font-medium text-gray-900">
                                            {user.status === 'active' ? 'Ativo' : 'Inativo'}
                                        </span>
                                    </label>
                                </td>
                                <td className="py-3 px-4 text-center">
                                    <div className="flex justify-center gap-2">
                                        <button
                                            onClick={() => handleOpenEditUserModal(user)}
                                            className="p-2 text-gray-400 hover:text-primary rounded-full hover:bg-primary/10 transition-colors"
                                            aria-label="Editar usuário"
                                        >
                                            <PencilIcon className="h-5 w-5" />
                                        </button>
                                        <button
                                            onClick={() => confirmResetUserPassword(user.id, user.fullName)}
                                            className="px-3 py-1 text-xs font-medium text-primary border border-primary rounded-md hover:bg-primary/10"
                                        >
                                            Redefinir Senha
                                        </button>
                                        {user.role === UserRole.USER && (
                                            <button
                                                onClick={() => handleOpenPermissionsModal(user)}
                                                className="px-3 py-1 text-xs font-medium text-secondary border border-secondary rounded-md hover:bg-secondary/10"
                                            >
                                                Permissões
                                            </button>
                                        )}
                                        <button
                                            onClick={() => confirmDeleteUser(user)}
                                            className="p-2 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-500/10 transition-colors"
                                            aria-label="Excluir usuário"
                                            disabled={user.id === currentUser.id || user.role === UserRole.ADMIN}
                                        >
                                            <TrashIcon className="h-5 w-5" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showCreateUserModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
                        <h3 className="text-xl font-bold text-text-main mb-4">Cadastrar Novo Usuário</h3>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="newUserName" className="block text-sm font-medium text-gray-700">Nome Completo</label>
                                <input
                                    type="text"
                                    id="newUserName"
                                    value={newUserName}
                                    onChange={(e) => setNewUserName(e.target.value)}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-gray-700"
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="newUserEmail" className="block text-sm font-medium text-gray-700">Email</label>
                                <input
                                    type="email"
                                    id="newUserEmail"
                                    value={newUserEmail}
                                    onChange={(e) => setNewUserEmail(e.target.value)}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-gray-700"
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="newUserPassword" className="block text-sm font-medium text-gray-700">Senha Temporária</label>
                                <input
                                    type="password"
                                    id="newUserPassword"
                                    value={newUserPassword}
                                    onChange={(e) => setNewUserPassword(e.target.value)}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-gray-700"
                                    required
                                />
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={() => setShowCreateUserModal(false)}
                                className="px-4 py-2 font-semibold text-gray-700 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCreateUser}
                                className="px-4 py-2 font-semibold text-white bg-primary rounded-md hover:bg-primary-dark transition-colors"
                            >
                                Cadastrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showPermissionsModal && editingUserPermissions && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
                        <h3 className="text-xl font-bold text-text-main mb-4">Permissões para {editingUserPermissions.fullName}</h3>
                        <div className="space-y-3">
                            {Object.values(ModuleName).map((moduleName: ModuleName) => {
                                if (moduleName === ModuleName.ACCESS_GIVEAWAYS) return null;

                                return (
                                    <label key={moduleName} className="flex items-center space-x-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={currentPermissions[moduleName] || false}
                                            onChange={(e) => handlePermissionChange(moduleName, e.target.checked)}
                                            className="form-checkbox h-5 w-5 text-primary rounded focus:ring-primary"
                                        />
                                        <span>{moduleNameTranslations[moduleName]}</span>
                                    </label>
                                );
                            })}
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={handleClosePermissionsModal}
                                className="px-4 py-2 font-semibold text-gray-700 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSavePermissions}
                                className="px-4 py-2 font-semibold text-white bg-primary rounded-md hover:bg-primary-dark transition-colors"
                            >
                                Salvar Permissões
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showEditUserModal && editingUser && (
                <UserEditModal
                    user={editingUser}
                    onClose={handleCloseEditUserModal}
                    onUpdateSuccess={handleUpdateUserSuccess}
                    onAdminUpdateUserProfile={handleAdminUpdateUserProfile}
                />
            )}

            {showConfirmationDialog && (
                <ConfirmationDialog
                    title={dialogTitle}
                    message={dialogMessage}
                    confirmText="Confirmar"
                    onConfirm={dialogConfirmAction || (() => setShowConfirmationDialog(false))}
                    cancelText="Cancelar"
                    onCancel={() => {
                        setShowConfirmationDialog(false);
                        setUserToDelete(null);
                    }}
                />
            )}
        </div>
    );
};

export default AdministratorUserManager;