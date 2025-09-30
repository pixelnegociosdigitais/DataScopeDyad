import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';
import { SettingsIcon } from './icons/SettingsIcon';
import { LogEntry } from '../types'; // Importar LogEntry
import { supabase } from '../src/integrations/supabase/client';
import { showError } from '../src/utils/toast';
import { useAuth } from '../src/hooks/useAuth'; // Para obter currentUser e currentCompany

interface LogsAndAuditPanelProps {
    onBack: () => void;
}

const LogsAndAuditPanel: React.FC<LogsAndAuditPanelProps> = ({ onBack }) => {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { currentUser, currentCompany } = useAuth(() => {}); // Usar useAuth para contexto de usuário/empresa

    const getLevelColor = (level: LogEntry['level']) => {
        switch (level) {
            case 'INFO': return 'text-blue-600 bg-blue-100';
            case 'WARN': return 'text-yellow-600 bg-yellow-100';
            case 'ERROR': return 'text-red-600 bg-red-100';
            case 'DEBUG': return 'text-gray-600 bg-gray-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            let query = supabase.from('logs').select('*');

            // RLS policies should handle this, but adding client-side filter for clarity/fallback
            if (currentUser?.role === 'Administrador' && currentCompany?.id) {
                query = query.eq('company_id', currentCompany.id);
            }
            // Developers can see all, handled by RLS

            const { data, error } = await query.order('timestamp', { ascending: false });

            if (error) {
                console.error('Erro ao buscar logs:', error);
                setError('Não foi possível carregar os logs. Verifique suas permissões.');
                setLogs([]);
            } else {
                setLogs(data as LogEntry[] || []);
            }
        } catch (err: any) {
            console.error('Erro inesperado ao buscar logs:', err);
            setError('Ocorreu um erro inesperado ao carregar os logs: ' + err.message);
        } finally {
            setLoading(false);
        }
    }, [currentUser, currentCompany]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    return (
        <div className="max-w-full mx-auto bg-white p-8 rounded-lg shadow-md">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-200 transition-colors" aria-label="Voltar">
                    <ArrowLeftIcon className="h-6 w-6 text-gray-600" />
                </button>
                <SettingsIcon className="h-8 w-8 text-primary" />
                <h2 className="text-2xl font-bold text-text-main">Logs e Auditoria</h2>
            </div>
            <p className="text-text-light mb-6">
                Esta seção exibe logs detalhados de atividades e eventos do sistema.
            </p>
            
            {loading && <p className="text-center py-4 text-text-light">Carregando logs...</p>}
            {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">{error}</div>}

            {!loading && !error && logs.length === 0 && (
                <p className="text-center py-4 text-text-light">Nenhum log encontrado.</p>
            )}

            {!loading && !error && logs.length > 0 && (
                <div className="overflow-x-auto bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <table className="min-w-full bg-white">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="py-2 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Data/Hora</th>
                                <th className="py-2 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Nível</th>
                                <th className="py-2 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Mensagem</th>
                                <th className="py-2 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Usuário</th>
                                <th className="py-2 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Módulo</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {logs.map((log) => (
                                <tr key={log.id}>
                                    <td className="py-3 px-4 text-sm text-gray-700 whitespace-nowrap">
                                        {new Date(log.timestamp).toLocaleString('pt-BR')}
                                    </td>
                                    <td className="py-3 px-4 text-sm whitespace-nowrap">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getLevelColor(log.level)}`}>
                                            {log.level}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-sm text-gray-800">{log.message}</td>
                                    <td className="py-3 px-4 text-sm text-gray-700 whitespace-nowrap">
                                        {log.userEmail || 'N/A'}
                                    </td>
                                    <td className="py-3 px-4 text-sm text-gray-700 whitespace-nowrap">
                                        {log.module || 'N/A'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default LogsAndAuditPanel;