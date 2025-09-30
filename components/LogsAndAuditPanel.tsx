import React from 'react';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';
import { SettingsIcon } from './icons/SettingsIcon'; // Usar SettingsIcon para consistência
import { View } from '../types';

interface LogsAndAuditPanelProps {
    onBack: () => void;
}

const LogsAndAuditPanel: React.FC<LogsAndAuditPanelProps> = ({ onBack }) => {
    return (
        <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-md">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-200 transition-colors" aria-label="Voltar">
                    <ArrowLeftIcon className="h-6 w-6 text-gray-600" />
                </button>
                <SettingsIcon className="h-8 w-8 text-primary" />
                <h2 className="text-2xl font-bold text-text-main">Logs e Auditoria</h2>
            </div>
            <p className="text-text-light mb-6">
                Esta seção exibirá logs detalhados de atividades e eventos do sistema.
                Funcionalidade em desenvolvimento.
            </p>
            <div className="bg-gray-100 p-6 rounded-md text-gray-600 text-sm italic">
                <p>Exemplo de entrada de log:</p>
                <p><code>[2024-07-26 10:30:00] Usuário 'Alice Dev' (ID: u1) acessou o painel da pesquisa 's1'.</code></p>
                <p><code>[2024-07-26 10:35:15] Usuário 'Beto Admin' (ID: u2) atualizou as configurações da empresa 'c1'.</code></p>
                <p><code>[2024-07-26 10:40:30] Erro: Falha na conexão com o banco de dados.</code></p>
            </div>
            {/* Futuramente, aqui haverá tabelas, filtros e paginação para os logs */}
        </div>
    );
};

export default LogsAndAuditPanel;