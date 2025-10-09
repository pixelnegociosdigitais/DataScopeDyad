import React, { useState, useEffect } from 'react';
import { ArrowLeftIcon } from '../../components/icons/ArrowLeftIcon';
import { BellIcon } from '../../components/icons/BellIcon';
import { UserRole, ModuleName } from '../../types';
import { useAuth } from '../hooks/useAuth';
import { showError } from '../utils/toast'; // Removido showSuccess

interface NoticeCreatorProps {
    onBack: () => void;
}

const NoticeCreator: React.FC<NoticeCreatorProps> = ({ onBack }) => {
    const { currentUser, currentCompany, modulePermissions, handleCreateNotice } = useAuth(() => {});
    const [message, setMessage] = useState('');
    const [targetRoles, setTargetRoles] = useState<UserRole[]>([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (currentUser?.role === UserRole.ADMIN) {
            // Administradores só podem enviar para Usuários
            setTargetRoles([UserRole.USER]);
        }
    }, [currentUser?.role]);

    const handleRoleChange = (role: UserRole, isChecked: boolean) => {
        if (currentUser?.role === UserRole.ADMIN && (role === UserRole.ADMIN || role === UserRole.DEVELOPER)) {
            // Admins não podem selecionar Admin ou Developer
            return;
        }
        setTargetRoles(prev => 
            isChecked ? [...prev, role] : prev.filter(r => r !== role)
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser || !modulePermissions[ModuleName.MANAGE_NOTICES]) {
            showError('Você não tem permissão para criar avisos.');
            return;
        }

        setSaving(true);
        const success = await handleCreateNotice(
            message,
            targetRoles,
            currentUser.role === UserRole.ADMIN ? currentCompany?.id : undefined // Avisos de admin são sempre para a empresa
        );
        setSaving(false);

        if (success) {
            setMessage('');
            if (currentUser.role === UserRole.DEVELOPER) {
                setTargetRoles([]); // Desenvolvedor pode resetar a seleção
            } else {
                setTargetRoles([UserRole.USER]); // Admin volta para seleção padrão de Usuário
            }
        }
    };

    if (!currentUser || !modulePermissions[ModuleName.MANAGE_NOTICES]) {
        return (
            <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md text-center">
                <BellIcon className="h-12 w-12 text-primary mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-text-main mb-4">Gerenciar Avisos</h2>
                <p className="text-text-light mb-6">Você não tem permissão para gerenciar avisos.</p>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-200 transition-colors" aria-label="Voltar">
                    <ArrowLeftIcon className="h-6 w-6 text-gray-600" />
                </button>
                <BellIcon className="h-8 w-8 text-primary" />
                <h2 className="text-2xl font-bold text-text-main">Criar Novo Aviso</h2>
            </div>
            <p className="text-text-light mb-6">
                {currentUser.role === UserRole.DEVELOPER
                    ? 'Envie avisos para Administradores e/ou Usuários de qualquer empresa.'
                    : 'Envie avisos para Usuários da sua empresa.'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label htmlFor="notice-message" className="block text-sm font-medium text-gray-700">Mensagem do Aviso</label>
                    <textarea
                        id="notice-message"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={5}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-gray-700"
                        placeholder="Digite sua mensagem aqui..."
                        required
                    />
                </div>

                <div>
                    <span className="block text-sm font-medium text-gray-700 mb-2">DESTINATÁRIOS:</span>
                    <div className="flex flex-wrap gap-4">
                        {currentUser.role === UserRole.DEVELOPER && (
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={targetRoles.includes(UserRole.ADMIN)}
                                    onChange={(e) => handleRoleChange(UserRole.ADMIN, e.target.checked)}
                                    className="form-checkbox h-5 w-5 text-primary rounded focus:ring-primary"
                                />
                                <span>ADMINISTRADORES</span>
                            </label>
                        )}
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={targetRoles.includes(UserRole.USER)}
                                onChange={(e) => handleRoleChange(UserRole.USER, e.target.checked)}
                                className="form-checkbox h-5 w-5 text-primary rounded focus:ring-primary"
                                disabled={currentUser.role === UserRole.ADMIN} // Admin sempre envia para Usuário
                            />
                            <span>USUÁRIOS</span>
                        </label>
                    </div>
                </div>

                <div className="pt-2 flex justify-end">
                    <button
                        type="submit"
                        className="px-6 py-2 font-semibold text-white bg-primary rounded-md hover:bg-primary-dark shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={saving || !message.trim() || targetRoles.length === 0}
                    >
                        {saving ? 'Enviando...' : 'Enviar Aviso'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default NoticeCreator;