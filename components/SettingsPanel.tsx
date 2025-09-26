import React from 'react';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';
import { SettingsIcon } from './icons/SettingsIcon';

interface SettingsPanelProps {
    onBack: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ onBack }) => {
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
                    <h3 className="text-lg font-semibold text-text-main mb-2">Gerenciamento de Módulos (Em Breve)</h3>
                    <p className="text-text-light text-sm">
                        Esta seção permitirá habilitar ou desabilitar módulos e funcionalidades para diferentes papéis de usuário.
                        Entre em contato com o suporte para mais informações sobre como personalizar as permissões.
                    </p>
                    <button className="mt-4 px-4 py-2 text-sm font-medium text-primary border border-primary rounded-md hover:bg-primary/10 transition-colors" disabled>
                        Gerenciar Permissões
                    </button>
                </div>

                <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                    <h3 className="text-lg font-semibold text-text-main mb-2">Logs e Auditoria (Em Breve)</h3>
                    <p className="text-text-light text-sm">
                        Visualize logs de atividades e auditoria do sistema para monitorar o uso e identificar problemas.
                    </p>
                    <button className="mt-4 px-4 py-2 text-sm font-medium text-primary border border-primary rounded-md hover:bg-primary/10 transition-colors" disabled>
                        Ver Logs
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsPanel;