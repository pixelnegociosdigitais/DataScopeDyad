import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../integrations/supabase/client';
import { showError } from '../../utils/toast';

interface PastWinner {
    created_at: string;
    winner_name: string;
    winner_phone: string | null;
    rank: number;
    prize_id: string; // Adicionado para depuração e clareza
    prizes: { name: string } | null; // Alterado para um objeto único ou null
}

interface PastWinnersHistoryProps {
    selectedSurveyId: string;
}

const PastWinnersHistory: React.FC<PastWinnersHistoryProps> = ({ selectedSurveyId }) => {
    const [pastWinners, setPastWinners] = useState<PastWinner[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchPastWinners = useCallback(async () => {
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
            `) // Usar left join para garantir que o winner seja retornado mesmo sem prêmio
            .eq('survey_id', selectedSurveyId)
            .order('created_at', { ascending: false })
            .order('rank', { ascending: true });

        if (error) {
            showError('Não foi possível carregar o histórico de sorteios.');
            setPastWinners([]);
        } else {
            // O Supabase retorna 'prizes' como um objeto se for um relacionamento one-to-one/many-to-one
            // ou null se não houver correspondência (devido ao !left)
            setPastWinners(data as PastWinner[] || []);
        }
        setLoading(false);
    }, [selectedSurveyId]);

    useEffect(() => {
        fetchPastWinners();
    }, [fetchPastWinners]);

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