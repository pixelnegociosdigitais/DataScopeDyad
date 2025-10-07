import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';
import { SettingsIcon } from './icons/SettingsIcon';
import { UserRole, ModuleName, ModulePermission } from '../types';
import { supabase } from '../src/integrations/supabase/client';
import { showSuccess, showError } from '../src/utils/toast';
import ConfirmationDialog from '../src/components/ConfirmationDialog'; // Caminho corrigido

interface ModulePermissionsManagerProps {
    onBack: () => void;
}

const ALL_ROLES = [UserRole.DEVELOPER, UserRole.ADMIN, UserRole.USER];
const ALL_MODULES = [
    { name: ModuleName.CREATE_SURVEY, label: 'Criar Pesquisas' },
    { name: ModuleName.MANAGE_SURVEYS, label: 'Gerenciar Pesquisas (Editar/Excluir)' },
    { name: ModuleName.VIEW_DASHBOARD, label: 'Visualizar Painel de Pesquisas' },
    { name: ModuleName.ACCESS_GIVEAWAYS, label: 'Acessar Sorteios' },
    { name: ModuleName.MANAGE_COMPANY_SETTINGS, label: 'Gerenciar Configurações da Empresa' },
];

const ModulePermissionsManager: React.FC<ModulePermissionsManagerProps> = ({ onBack }) => {
    const [permissions, setPermissions] = useState<ModulePermission[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showConfirmationDialog, setShowConfirmationDialog] = useState(false); // Estado para o diálogo

    const fetchPermissions = useCallback(async () => {
        setLoading(true);
        setError(null);
        const { data, error } = await supabase
            .from('module_permissions')
            .select('*');

        if (error) {
            console.error('Erro ao buscar permissões:', error);
            setError('Não foi possível carregar as permissões.');
            setPermissions([]);
        } else {
            const fetchedPermissionsMap = new Map<string, ModulePermission>();
            data.forEach(p => fetchedPermissionsMap.set(`${p.role}-${p.module_name}`, p));

            const initialPermissions: ModulePermission[] = [];
            ALL_ROLES.forEach(role => {
                ALL_MODULES.forEach(module => {
                    const key = `${role}-${module.name}`;
                    if (fetchedPermissionsMap.has(key)) {
                        initialPermissions.push(fetchedPermissionsMap.get(key)!);
                    } else {
                        initialPermissions.push({
                            role: role,
                            module_name: module.name,
                            enabled: true,
                        });
                    }
                });
            });
            setPermissions(initialPermissions);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchPermissions();
    }, [fetchPermissions]);

    const handleTogglePermission = (role: UserRole, moduleName: ModuleName) => {
        setPermissions(prevPermissions =>
            prevPermissions.map(p =>
                p.role === role && p.module_name === moduleName
                    ? { ...p, enabled: !p.enabled }
                    : p
            )
        );
    };

    const handleSavePermissions = async () => {
        setSaving(true);
        setError(null);
        try {
            const existingPermissions = permissions.filter(p => p.id);
            const newPermissions = permissions.filter(p => !p.id);

            for (const p of existingPermissions) {
                const { error } = await supabase
                    .from('module_permissions')
                    .update({ enabled: p.enabled })
                    .eq('id', p.id);
                if (error) throw error;
            }

            if (newPermissions.length > 0) {
                const { error } = await supabase
                    .from('module_permissions')
                    .insert(newPermissions.map(p => ({
                        role: p.role,
                        module_name: p.module_name,
                        enabled: p.enabled,
                    })));
                if (error) throw error;
            }
            
            showSuccess('Permissões salvas com sucesso!');
            await fetchPermissions();
            setShowConfirmationDialog(true); // Mostrar o diálogo de confirmação
        } catch (err: any) {
            console.error('Erro ao salvar permissões:', err.message);
            setError('Erro ao salvar permissões: ' + err.message);
            showError('Erro ao salvar permissões: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="text-center py-8 text-text-light">Carregando permissões...</div>;
    }

    return (
        <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-md">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-200 transition-colors" aria-label="Voltar">
                    <ArrowLeftIcon className="h-6 w-6 text-gray-600" />
                </button>
                <SettingsIcon className="h-8 w-8 text-primary" />
                <h2 className="text-2xl font-bold text-text-main">Gerenciamento de Permissões de Módulos</h2>
            </div>
            <p className="text-text-light mb-6">
                Defina quais papéis de usuário têm acesso a quais módulos da aplicação.
                Apenas Desenvolvedores podem alterar estas configurações.
            </p>

            {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">{error}</div>}

            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                    <thead>
                        <tr className="bg-gray-100 border-b border-gray-200">
                            <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Módulo</th>
                            {ALL_ROLES.map(role => (
                                <th key={role} className="py-3 px-4 text-center text-sm font-semibold text-gray-700">{role}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {ALL_MODULES.map(module => (
                            <tr key={module.name} className="border-b border-gray-100 last:border-b-0">
                                <td className="py-3 px-4 text-sm text-gray-800 font-medium">{module.label}</td>
                                {ALL_ROLES.map(role => {
                                    const permission = permissions.find(p => p.role === role && p.module_name === module.name);
                                    const isEnabled = permission ? permission.enabled : true;
                                    return (
                                        <td key={`${role}-${module.name}`} className="py-3 px-4 text-center">
                                            <label className="inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="form-checkbox h-5 w-5 text-primary rounded focus:ring-primary"
                                                    checked={isEnabled}
                                                    onChange={() => handleTogglePermission(role, module.name)}
                                                    disabled={saving}
                                                />
                                            </label>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden space-y-4">
                {ALL_MODULES.map(module => (
                    <div key={module.name} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">{module.label}</h3>
                        <div className="grid grid-cols-2 gap-3">
                            {ALL_ROLES.map(role => {
                                const permission = permissions.find(p => p.role === role && p.module_name === module.name);
                                const isEnabled = permission ? permission.enabled : true;
                                return (
                                    <div key={`${role}-${module.name}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                                        <span className="text-sm font-medium text-gray-700">{role}</span>
                                        <label className="inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="form-checkbox h-5 w-5 text-primary rounded focus:ring-primary"
                                                checked={isEnabled}
                                                onChange={() => handleTogglePermission(role, module.name)}
                                                disabled={saving}
                                            />
                                        </label>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-6 flex justify-end">
                <button
                    onClick={handleSavePermissions}
                    className="px-6 py-2 font-semibold text-white bg-primary rounded-md hover:bg-primary-dark shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={saving}
                >
                    {saving ? 'Salvando...' : 'Salvar Permissões'}
                </button>
            </div>

            {showConfirmationDialog && (
                <ConfirmationDialog
                    title="Permissões Salvas!"
                    message="As permissões dos módulos foram atualizadas com sucesso. O que você gostaria de fazer agora?"
                    confirmText="Voltar para Configurações"
                    onConfirm={() => {
                        setShowConfirmationDialog(false);
                        onBack();
                    }}
                    cancelText="Continuar Editando"
                    onCancel={() => setShowConfirmationDialog(false)}
                />
            )}
        </div>
    );
};

export default ModulePermissionsManager;