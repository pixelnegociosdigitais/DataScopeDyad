import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';
import { BuildingIcon } from './icons/BuildingIcon';
import { UserIcon } from './icons/UserIcon';
import { PencilIcon } from './icons/PencilIcon';
import { TrashIcon } from './icons/TrashIcon';
import { CreateIcon } from './icons/CreateIcon';
import { Company, User, UserRole, View } from '../types';
import { supabase } from '../src/integrations/supabase/client';
import { showSuccess, showError } from '../src/utils/toast';
import ConfirmationDialog from '../src/components/ConfirmationDialog';
import CompanyEditModal from '../src/components/CompanyEditModal'; // Importar o novo modal de edição
import { useAuth } from '../src/hooks/useAuth'; // Importar useAuth para as funções de gerenciamento

interface DeveloperCompanyUserManagerProps {
    onBack: () => void;
    setCurrentView: (view: View) => void;
}

const DeveloperCompanyUserManager: React.FC<DeveloperCompanyUserManagerProps> = ({ onBack, setCurrentView }) => {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showCreateCompanyModal, setShowCreateCompanyModal] = useState(false);
    const [newCompanyName, setNewCompanyName] = useState('');
    const [newAdminFullName, setNewAdminFullName] = useState('');
    const [newAdminEmail, setNewAdminEmail] = useState('');
    const [newAdminPassword, setNewAdminPassword] = useState('');
    const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
    const [dialogMessage, setDialogMessage] = useState('');
    const [dialogTitle, setDialogTitle] = useState('');
    const [dialogConfirmAction, setDialogConfirmAction] = useState<(() => void) | null>(null);
    const [showEditCompanyModal, setShowEditCompanyModal] = useState(false); // Estado para o modal de edição
    const [editingCompany, setEditingCompany] = useState<Company | null>(null); // Empresa sendo editada
    const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null); // Empresa a ser excluída

    const { handleToggleCompanyStatus, handleResetUserPassword, handleCreateCompany: createCompanyAndAdmin } = useAuth(setCurrentView);

    const fetchCompanies = useCallback(async () => {
        setLoading(true);
        setError(null);
        const { data, error } = await supabase
            .from('companies')
            .select(`
                *,
                profiles (
                    id,
                    full_name,
                    email,
                    role
                )
            `);

        if (error) {
            console.error('Erro ao buscar empresas:', error);
            setError('Não foi possível carregar as empresas.');
            setCompanies([]);
        } else {
            // Mapear os perfis para cada empresa, filtrando apenas administradores
            const companiesWithAdmins = data.map(company => ({
                ...company,
                administrators: company.profiles.filter((p: any) => p.role === UserRole.ADMIN)
            }));
            setCompanies(companiesWithAdmins as Company[]);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchCompanies();
    }, [fetchCompanies]);

    const handleCreateCompanyAndAdmin = async () => {
        if (!newCompanyName.trim() || !newAdminFullName.trim() || !newAdminEmail.trim() || !newAdminPassword.trim()) {
            showError('Por favor, preencha todos os campos para criar a empresa e o administrador.');
            return;
        }

        // TODO: Chamar uma Edge Function para esta operação complexa e segura
        // Por enquanto, vamos simular e mostrar um toast.
        showSuccess('Criação de empresa e administrador solicitada. (Implementação via Edge Function pendente)');
        console.log('Criar Empresa:', newCompanyName, 'Admin:', newAdminFullName, 'Email:', newAdminEmail, 'Senha:', newAdminPassword);
        
        // Simular a criação e atualização da lista
        setShowCreateCompanyModal(false);
        setNewCompanyName('');
        setNewAdminFullName('');
        setNewAdminEmail('');
        setNewAdminPassword('');
        fetchCompanies(); // Recarregar a lista para refletir a mudança
    };

    const confirmToggleStatus = (companyId: string, currentStatus: 'active' | 'inactive') => {
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        setDialogTitle(`Confirmar ${newStatus === 'inactive' ? 'Desativação' : 'Ativação'} da Empresa`);
        setDialogMessage(
            `Tem certeza que deseja ${newStatus === 'inactive' ? 'desativar' : 'ativar'} esta empresa? ` +
            (newStatus === 'inactive' ? 'Todos os usuários vinculados terão o acesso aos dados bloqueado.' : '')
        );
        setDialogConfirmAction(() => async () => {
            await handleToggleCompanyStatus(companyId, newStatus);
            fetchCompanies(); // Recarregar a lista após a atualização
            setShowConfirmationDialog(false);
        });
        setShowConfirmationDialog(true);
    };

    const confirmResetAdminPassword = (adminId: string, adminName: string) => {
        setDialogTitle('Redefinir Senha do Administrador');
        setDialogMessage(`Tem certeza que deseja redefinir a senha do administrador "${adminName}"? Uma nova senha temporária será gerada.`);
        setDialogConfirmAction(() => async () => {
            // TODO: Chamar Edge Function para redefinir senha
            await handleResetUserPassword(adminId, 'novaSenhaTemporaria123'); // Senha temporária gerada
            setShowConfirmationDialog(false);
        });
        setShowConfirmationDialog(true);
    };

    const handleOpenEditModal = (company: Company) => {
        setEditingCompany(company);
        setShowEditCompanyModal(true);
    };

    const handleCloseEditModal = () => {
        setEditingCompany(null);
        setShowEditCompanyModal(false);
    };

    const handleUpdateCompanySuccess = (updatedCompany: Company) => {
        setCompanies(prevCompanies => 
            prevCompanies.map(c => c.id === updatedCompany.id ? { ...updatedCompany, administrators: c.administrators } : c)
        );
    };

    const confirmDeleteCompany = (company: Company) => {
        setCompanyToDelete(company);
        setDialogTitle('Confirmar Exclusão da Empresa');
        setDialogMessage(
            `Tem certeza que deseja excluir a empresa "${company.name}"? ` +
            `Esta ação é irreversível e excluirá TODOS os dados relacionados (pesquisas, respostas, prêmios, etc.) e desvinculará todos os usuários.`
        );
        setDialogConfirmAction(() => handleDeleteCompany);
        setShowConfirmationDialog(true);
    };

    const handleDeleteCompany = async () => {
        if (!companyToDelete) return;

        try {
            // 1. Obter IDs de pesquisas associadas à empresa
            const { data: surveysData, error: surveysError } = await supabase
                .from('surveys')
                .select('id')
                .eq('company_id', companyToDelete.id);
            if (surveysError) throw surveysError;
            const surveyIds = surveysData.map(s => s.id);

            // 2. Obter IDs de respostas de pesquisas associadas às pesquisas
            const { data: responsesData, error: responsesError } = await supabase
                .from('survey_responses')
                .select('id')
                .in('survey_id', surveyIds);
            if (responsesError) throw responsesError;
            const responseIds = responsesData.map(r => r.id);

            // Ordem de exclusão para respeitar chaves estrangeiras
            // Excluir vencedores de sorteios
            await supabase.from('giveaway_winners').delete().in('survey_id', surveyIds);
            // Excluir respostas detalhadas
            await supabase.from('answers').delete().in('response_id', responseIds);
            // Excluir respostas de pesquisas
            await supabase.from('survey_responses').delete().in('id', responseIds);
            // Excluir perguntas
            await supabase.from('questions').delete().in('survey_id', surveyIds);
            // Excluir pesquisas
            await supabase.from('surveys').delete().in('id', surveyIds);
            // Excluir prêmios
            await supabase.from('prizes').delete().eq('company_id', companyToDelete.id);
            // Desvincular perfis de usuários da empresa
            await supabase.from('profiles').update({ company_id: null, role: UserRole.USER }).eq('company_id', companyToDelete.id);
            // Excluir a empresa
            const { error: companyDeleteError } = await supabase
                .from('companies')
                .delete()
                .eq('id', companyToDelete.id);
            if (companyDeleteError) throw companyDeleteError;

            showSuccess(`Empresa "${companyToDelete.name}" e todos os dados relacionados excluídos com sucesso!`);
            fetchCompanies(); // Recarregar a lista
            setShowConfirmationDialog(false);
            setCompanyToDelete(null);
        } catch (err: any) {
            console.error('Erro ao excluir empresa e dados relacionados:', err.message);
            showError('Erro ao excluir empresa: ' + err.message);
        }
    };


    if (loading) {
        return <div className="text-center py-8 text-text-light">Carregando gerenciamento de empresas...</div>;
    }

    return (
        <div className="max-w-5xl mx-auto bg-white p-8 rounded-lg shadow-md">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-200 transition-colors" aria-label="Voltar">
                    <ArrowLeftIcon className="h-6 w-6 text-gray-600" />
                </button>
                <BuildingIcon className="h-8 w-8 text-primary" />
                <h2 className="text-2xl font-bold text-text-main">Gerenciamento de Empresas e Administradores</h2>
            </div>
            <p className="text-text-light mb-6">
                Como Desenvolvedor, você pode criar novas empresas, vincular administradores e gerenciar o status de todas as empresas.
            </p>

            {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">{error}</div>}

            <div className="mb-6 flex justify-end">
                <button
                    onClick={() => setShowCreateCompanyModal(true)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark"
                >
                    <CreateIcon className="h-4 w-4" /> Criar Nova Empresa e Admin
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                    <thead>
                        <tr className="bg-gray-100 border-b border-gray-200">
                            <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Empresa</th>
                            <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Administrador</th>
                            <th className="py-3 px-4 text-center text-sm font-semibold text-gray-700">Status</th>
                            <th className="py-3 px-4 text-center text-sm font-semibold text-gray-700">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {companies.map(company => (
                            <tr key={company.id} className="border-b border-gray-100 last:border-b-0">
                                <td className="py-3 px-4 text-sm text-gray-800 font-medium">{company.name}</td>
                                <td className="py-3 px-4 text-sm text-gray-700">
                                    {company.administrators && company.administrators.length > 0 ? (
                                        company.administrators.map((admin: any) => (
                                            <div key={admin.id}>
                                                {admin.full_name} ({admin.email})
                                            </div>
                                        ))
                                    ) : (
                                        <span className="text-gray-500">Nenhum administrador</span>
                                    )}
                                </td>
                                <td className="py-3 px-4 text-center">
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            value=""
                                            className="sr-only peer"
                                            checked={company.status === 'active'}
                                            onChange={() => confirmToggleStatus(company.id, company.status || 'active')}
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-light rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                        <span className="ml-3 text-sm font-medium text-gray-900">
                                            {company.status === 'active' ? 'Ativa' : 'Inativa'}
                                        </span>
                                    </label>
                                </td>
                                <td className="py-3 px-4 text-center">
                                    <div className="flex justify-center gap-2">
                                        <button
                                            onClick={() => handleOpenEditModal(company)}
                                            className="p-2 text-gray-400 hover:text-primary rounded-full hover:bg-primary/10 transition-colors"
                                            aria-label="Editar empresa"
                                        >
                                            <PencilIcon className="h-5 w-5" />
                                        </button>
                                        <button
                                            onClick={() => confirmDeleteCompany(company)}
                                            className="p-2 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-500/10 transition-colors"
                                            aria-label="Excluir empresa"
                                        >
                                            <TrashIcon className="h-5 w-5" />
                                        </button>
                                        {company.administrators && company.administrators.length > 0 && (
                                            <button
                                                onClick={() => confirmResetAdminPassword(company.administrators[0].id, company.administrators[0].full_name)}
                                                className="px-3 py-1 text-xs font-medium text-primary border border-primary rounded-md hover:bg-primary/10"
                                            >
                                                Redefinir Senha Admin
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showCreateCompanyModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
                        <h3 className="text-xl font-bold text-text-main mb-4">Criar Nova Empresa e Administrador</h3>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="newCompanyName" className="block text-sm font-medium text-gray-700">Nome da Empresa</label>
                                <input
                                    type="text"
                                    id="newCompanyName"
                                    value={newCompanyName}
                                    onChange={(e) => setNewCompanyName(e.target.value)}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-gray-700"
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="newAdminFullName" className="block text-sm font-medium text-gray-700">Nome Completo do Administrador</label>
                                <input
                                    type="text"
                                    id="newAdminFullName"
                                    value={newAdminFullName}
                                    onChange={(e) => setNewAdminFullName(e.target.value)}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-gray-700"
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="newAdminEmail" className="block text-sm font-medium text-gray-700">Email do Administrador</label>
                                <input
                                    type="email"
                                    id="newAdminEmail"
                                    value={newAdminEmail}
                                    onChange={(e) => setNewAdminEmail(e.target.value)}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-gray-700"
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="newAdminPassword" className="block text-sm font-medium text-gray-700">Senha Temporária do Administrador</label>
                                <input
                                    type="password"
                                    id="newAdminPassword"
                                    value={newAdminPassword}
                                    onChange={(e) => setNewAdminPassword(e.target.value)}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-gray-700"
                                    required
                                />
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={() => setShowCreateCompanyModal(false)}
                                className="px-4 py-2 font-semibold text-gray-700 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCreateCompanyAndAdmin}
                                className="px-4 py-2 font-semibold text-white bg-primary rounded-md hover:bg-primary-dark transition-colors"
                            >
                                Criar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showEditCompanyModal && editingCompany && (
                <CompanyEditModal
                    company={editingCompany}
                    onClose={handleCloseEditModal}
                    onUpdateSuccess={handleUpdateCompanySuccess}
                />
            )}

            {showConfirmationDialog && (
                <ConfirmationDialog
                    title={dialogTitle}
                    message={dialogMessage}
                    confirmText="Confirmar"
                    onConfirm={dialogConfirmAction || (() => setShowConfirmationDialog(false))}
                    cancelText="Cancelar"
                    onCancel={() => setShowConfirmationDialog(false)}
                />
            )}
        </div>
    );
};

export default DeveloperCompanyUserManager;