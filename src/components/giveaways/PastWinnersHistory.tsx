import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../integrations/supabase/client';
import { showError } from '../../utils/toast';

interface PastWinner {
    created_at: string;
    winner_name: string;
    winner_phone: string | null;
    rank: number;
    prize_id: string;
    prizes: { name: string } | null;
}

interface PastWinnersHistoryProps {
    selectedSurveyId: string;
    canViewGiveawayData: boolean; // Adicionado prop de permissão
}

const PastWinnersHistory: React.FC<PastWinnersHistoryProps> = ({ selectedSurveyId, canViewGiveawayData }) => {
    const [pastWinners, setPastWinners] = useState<PastWinner[]>([]);
    const [loading, setLoading] = useState(true);

    // O componente PastWinnersHistory agora é renderizado condicionalmente pelo pai,
    // então não precisamos de um retorno null aqui.

    const fetchPastWinners = useCallback(async () => {
        if (!canViewGiveawayData) {
            setPastWinners([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        const { data, error } = await supabase
            .from('giveaway_winners')
            .select(`
                created_at,
                winner_name,
                winner_phone,
                rank,
                prize_id,
                prizes!left(name)
            `)
            .eq('survey_id', selectedSurveyId)
            .order('created_at', { ascending: false })
            .order('rank', { ascending: true });

        if (error) {
            showError('Não foi possível carregar o histórico de sorteios.');
            setPastWinners([]);
        } else {
            const mappedWinners: PastWinner[] = (data || []).map((item: any) => ({
                created_at: item.created_at,
                winner_name: item.winner_name,
                winner_phone: item.winner_phone,
                rank: item.rank,
                prize_id: item.prize_id,
                prizes: item.prizes ? { name: item.prizes.name } : null,
            }));
            setPastWinners(mappedWinners);
        }
        setLoading(false);
    }, [selectedSurveyId, canViewGiveawayData]);

    useEffect(() => {
        fetchPastWinners();
    }, [fetchPastWinners]);

    if (!canViewGiveawayData) {
        return (
            <div className="mt-12 text-center text-text-light">
                <p>Você não tem permissão para visualizar o histórico de sorteios.</p>
            </div>
        );
    }

    return (
        <div className="mt-12">
            <h3 className="text-xl font-semibold text-text-main mb-4">Histórico de Sorteios</h3>
            {loading ? (
                <p className="text-text-light text-sm text-center py-4">Carregando histórico...</p>
            ) : pastWinners.length > 0 ? (
                <div className="overflow-x-auto bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <table className="min-w-full bg-white">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="py-2 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Data/Hora</th>
                                <th className="py-2 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Nome</th>
                                <th className="py-2 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Telefone</th>
                                <th className="py-2 px-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Classificação</th>
                                <th className="py-2 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Prêmio</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {pastWinners.map((winner, index) => (
                                <tr key={index}>
                                    <td className="py-3 px-4 text-sm text-gray-700 whitespace-nowrap">{new Date(winner.created_at).toLocaleString('pt-BR')}</td>
                                    <td className="py-3 px-4 text-sm text-gray-800 font-medium">{winner.winner_name}</td>
                                    <td className="py-3 px-4 text-sm text-gray-700">{winner.winner_phone || 'N/A'}</td>
                                    <td className="py-3 px-4 text-sm text-gray-700 text-center">{winner.rank}º</td>
                                    <td className="py-3 px-4 text-sm text-gray-700">{winner.prizes?.name || 'Prêmio desconhecido'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p className="text-text-light text-sm text-center py-4">Nenhum sorteio realizado para esta pesquisa ainda.</p>
            )}
        </div>
    );
};

export default PastWinnersHistory;