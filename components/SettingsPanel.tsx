import React from 'react';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';
import { SettingsIcon } from './icons/SettingsIcon';
import { BellIcon } from './icons/BellIcon';
import { TemplateIcon } from './icons/TemplateIcon'; // Importar o TemplateIcon
import { View, ModuleName } from '../types';
import { useAuth } from '../src/hooks/useAuth'; // Importar useAuth para permissões

interface SettingsPanelProps {
    onBack: () => void;
    setView: (view: View) => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ onBack, setView }) => {
    const { modulePermissions } = useAuth(setView); // Usar useAuth para acessar as permissões

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

    return (
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-200 transition-colors" aria-label="Voltar">
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
                <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                    <h3 className="text-lg font-semibold text-text-main mb-2">Gerenciamento de Módulos</h3>
                    <p className="text-text-light text-sm">
                        Esta seção permite habilitar ou desabilitar módulos e funcionalidades para diferentes papéis de usuário.
                    </p>
                    <button 
                        onClick={handleManagePermissions}
                        className="mt-4 px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark transition-colors"
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
                        className="mt-4 px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark transition-colors"
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
                        className="mt-4 px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark transition-colors"
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
                            className="mt-4 px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark transition-colors"
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