import React from 'react';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';
import { SettingsIcon } from './icons/SettingsIcon';
import { BellIcon } from './icons/BellIcon';
import { TemplateIcon } from './icons/TemplateIcon';
import { BuildingIcon } from './icons/BuildingIcon'; // Importar BuildingIcon
import { View, ModuleName, UserRole } from '../types';
import { useAuth } from '../src/hooks/useAuth';

interface SettingsPanelProps {
    onBack: () => void;
    setView: (view: View) => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ onBack, setView }) => {
    const { modulePermissions, currentUser } = useAuth(setView); // Usar useAuth para acessar as permissões e o usuário

    const handleManagePermissions = () => {
        setView(View.MODULE_PERMISSIONS_MANAGER);
    };

    const handleViewLogs = () => {
        setView(View.LOGS_AND_AUDIT);
    };

    const handleManageNotices = () => {
        setView(View.MANAGE_NOTICES);
    };

    const handleManageTemplates = () => {
        setView(View.SURVEY_TEMPLATES);
    };

    const handleManageCompanies = () => {
        setView(View.DEVELOPER_COMPANY_USER_MANAGER);
    };

    return (
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={onBack} className="btn-icon-mobile hover:bg-gray-200" aria-label="Voltar">
                    <ArrowLeftIcon className="h-6 w-6 text-gray-600" />
                </button>
                <SettingsIcon className="h-8 w-8 text-primary" />
                <h2 className="text-2xl font-bold text-text-main">Painel de Configurações</h2>
            </div>
            <p className="text-text-light mb-6">
                Aqui você pode gerenciar configurações avançadas da aplicação.
                Atualmente, este painel é acessível apenas por Desenvolvedores.
            </p>

            <div className="space-y-6">
                {currentUser?.role === UserRole.DEVELOPER && (
                    <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                        <h3 className="text-lg font-semibold text-text-main mb-2">Gerenciamento de Empresas e Administradores</h3>
                        <p className="text-text-light text-sm">
                            Crie novas empresas, vincule administradores e gerencie o status de todas as empresas.
                        </p>
                        <button 
                            onClick={handleManageCompanies}
                            className="btn-primary-mobile mt-4"
                        >
                            <BuildingIcon className="h-4 w-4 inline-block mr-2" /> Gerenciar Empresas
                        </button>
                    </div>
                )}

                <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                    <h3 className="text-lg font-semibold text-text-main mb-2">Gerenciamento de Módulos</h3>
                    <p className="text-text-light text-sm">
                        Esta seção permite habilitar ou desabilitar módulos e funcionalidades para diferentes papéis de usuário.
                    </p>
                    <button 
                        onClick={handleManagePermissions}
                        className="btn-primary-mobile mt-4"
                    >
                        Gerenciar Permissões
                    </button>
                </div>

                <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                    <h3 className="text-lg font-semibold text-text-main mb-2">Logs e Auditoria</h3>
                    <p className="text-text-light text-sm">
                        Visualize logs de atividades e auditoria do sistema para monitorar o uso e identificar problemas.
                    </p>
                    <button 
                        onClick={handleViewLogs}
                        className="btn-primary-mobile mt-4"
                    >
                        Ver Logs
                    </button>
                </div>

                <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                    <h3 className="text-lg font-semibold text-text-main mb-2">Gerenciamento de Avisos</h3>
                    <p className="text-text-light text-sm">
                        Crie e gerencie avisos para Administradores e Usuários da plataforma.
                    </p>
                    <button 
                        onClick={handleManageNotices}
                        className="btn-primary-mobile mt-4"
                    >
                        <BellIcon className="h-4 w-4 inline-block mr-2" /> Gerenciar Avisos
                    </button>
                </div>

                {modulePermissions[ModuleName.MANAGE_SURVEY_TEMPLATES] && (
                    <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                        <h3 className="text-lg font-semibold text-text-main mb-2">Gerenciamento de Modelos de Pesquisa</h3>
                        <p className="text-text-light text-sm">
                            Crie e edite modelos de pesquisa que estarão disponíveis para os administradores.
                        </p>
                        <button 
                            onClick={handleManageTemplates}
                            className="btn-primary-mobile mt-4"
                        >
                            <TemplateIcon className="h-4 w-4 inline-block mr-2" /> Gerenciar Modelos
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SettingsPanel;