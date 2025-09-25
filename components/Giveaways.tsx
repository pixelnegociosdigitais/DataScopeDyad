import React, { useState, useEffect } from 'react';
import { User, Company, QuestionType } from '../types'; // Importar QuestionType
import { supabase } from '../src/integrations/supabase/client';
import { GiftIcon } from './icons/GiftIcon';

// Nova interface para os participantes do sorteio
interface GiveawayParticipant {
    id: string;
    name: string;
    email?: string;
}

interface GiveawaysProps {
    currentUser: User;
    currentCompany: Company;
}

const Giveaways: React.FC<GiveawaysProps> = ({ currentUser, currentCompany }) => {
    const [participants, setParticipants] = useState<GiveawayParticipant[]>([]);
    const [winner, setWinner] = useState<GiveawayParticipant | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchParticipants();
    }, [currentCompany.id]);

    const fetchParticipants = async () => {
        setLoading(true);
        setError(null);
        try {
            // 1. Buscar todas as pesquisas da empresa atual
            const { data: surveysData, error: surveysError } = await supabase
                .from('surveys')
                .select('id')
                .eq('company_id', currentCompany.id);

            if (surveysError) throw surveysError;
            if (!surveysData || surveysData.length === 0) {
                setParticipants([]);
                setLoading(false);
                return;
            }

            const surveyIds = surveysData.map(s => s.id);

            // 2. Buscar todas as perguntas dessas pesquisas para identificar 'Nome Completo' e 'E-mail'
            const { data: questionsData, error: questionsError } = await supabase
                .from('questions')
                .select('id, text, type')
                .in('survey_id', surveyIds);

            if (questionsError) throw questionsError;

            const nameQuestionIds: string[] = questionsData
                .filter(q => q.text === 'Nome Completo' && q.type === QuestionType.SHORT_TEXT)
                .map(q => q.id);

            const emailQuestionIds: string[] = questionsData
                .filter(q => q.text === 'E-mail' && q.type === QuestionType.EMAIL)
                .map(q => q.id);

            if (nameQuestionIds.length === 0) {
                setError('Nenhuma pergunta de "Nome Completo" encontrada nas pesquisas da sua empresa. Certifique-se de que suas pesquisas incluem uma pergunta de "Nome Completo" (Texto Curto).');
                setParticipants([]);
                setLoading(false);
                return;
            }

            // 3. Buscar todas as respostas relacionadas a essas perguntas de nome e e-mail
            const relevantQuestionIds = [...nameQuestionIds, ...emailQuestionIds];
            if (relevantQuestionIds.length === 0) {
                 setParticipants([]);
                 setLoading(false);
                 return;
            }

            const { data: answersData, error: answersError } = await supabase
                .from('answers')
                .select('response_id, question_id, value')
                .in('question_id', relevantQuestionIds);

            if (answersError) throw answersError;

            // 4. Agrupar respostas por response_id para formar potenciais participantes
            const responsesMap = new Map<string, { name?: string; email?: string }>();

            answersData.forEach(answer => {
                if (!responsesMap.has(answer.response_id)) {
                    responsesMap.set(answer.response_id, {});
                }
                const currentResponse = responsesMap.get(answer.response_id)!;

                if (nameQuestionIds.includes(answer.question_id) && typeof answer.value === 'string') {
                    currentResponse.name = answer.value.trim();
                }
                if (emailQuestionIds.includes(answer.question_id) && typeof answer.value === 'string') {
                    currentResponse.email = answer.value.trim();
                }
            });

            // 5. Deduplicar participantes com base no nome
            const uniqueParticipants = new Map<string, GiveawayParticipant>();

            responsesMap.forEach((responseDetails, responseId) => {
                if (responseDetails.name) {
                    const normalizedName = responseDetails.name.toLowerCase();
                    if (!uniqueParticipants.has(normalizedName)) {
                        uniqueParticipants.set(normalizedName, {
                            id: `resp-${responseId}`, // Usar responseId para um ID único
                            name: responseDetails.name,
                            email: responseDetails.email,
                        });
                    } else {
                        // Se o nome já existe, atualizar o e-mail se um novo e-mail for encontrado
                        const existing = uniqueParticipants.get(normalizedName);
                        if (existing && responseDetails.email && !existing.email) {
                            existing.email = responseDetails.email;
                            uniqueParticipants.set(normalizedName, existing);
                        }
                    }
                }
            });

            setParticipants(Array.from(uniqueParticipants.values()));

        } catch (err: any) {
            console.error('Erro ao buscar participantes:', err.message);
            setError('Não foi possível carregar os participantes para o sorteio: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDraw = () => {
        if (participants.length === 0) {
            alert('Não há participantes para realizar o sorteio!');
            return;
        }

        const randomIndex = Math.floor(Math.random() * participants.length);
        setWinner(participants[randomIndex]);
    };

    if (loading) {
        return <div className="text-center py-8 text-text-light">Carregando participantes...</div>;
    }

    if (error) {
        return <div className="text-center py-8 text-red-600">{error}</div>;
    }

    return (
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md">
            <div className="flex items-center gap-4 mb-6">
                <GiftIcon className="h-8 w-8 text-primary" />
                <h2 className="text-2xl font-bold text-text-main">Sorteios da Empresa</h2>
            </div>
            <p className="text-text-light mb-6">
                Realize sorteios entre os leads cadastrados nas pesquisas da sua empresa ({currentCompany.name}).
            </p>

            <div className="mb-6">
                <h3 className="text-lg font-semibold text-text-main mb-2">Participantes ({participants.length} pessoas)</h3>
                {participants.length > 0 ? (
                    <ul className="max-h-60 overflow-y-auto border border-gray-200 rounded-md p-4 bg-gray-50">
                        {participants.map(p => (
                            <li key={p.id} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-b-0">
                                <div className="h-8 w-8 p-1 bg-gray-200 rounded-full text-gray-500 flex items-center justify-center text-xs">
                                    <GiftIcon className="h-4 w-4" /> {/* Usar um ícone genérico para leads */}
                                </div>
                                <span className="text-gray-700">{p.name} {p.email && `(${p.email})`}</span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-text-light text-sm">Nenhum participante encontrado. Certifique-se de que suas pesquisas incluem uma pergunta de "Nome Completo" e que há respostas cadastradas.</p>
                )}
            </div>

            <div className="flex justify-center mb-8">
                <button
                    onClick={handleDraw}
                    className="px-8 py-3 font-semibold text-white bg-primary rounded-md hover:bg-primary-dark shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={participants.length === 0}
                >
                    Sortear
                </button>
            </div>

            {winner && (
                <div className="bg-green-50 border border-green-200 text-green-800 p-6 rounded-lg text-center shadow-inner">
                    <h3 className="text-xl font-bold mb-3">🎉 Vencedor! 🎉</h3>
                    <div className="flex flex-col items-center justify-center">
                        <div className="h-24 w-24 p-4 bg-green-200 rounded-full text-green-600 flex items-center justify-center mb-4">
                            <GiftIcon className="h-12 w-12" />
                        </div>
                        <p className="text-2xl font-bold text-green-900">{winner.name}</p>
                        {winner.email && <p className="text-lg text-green-700">{winner.email}</p>}
                    </div>
                    <button
                        onClick={() => setWinner(null)}
                        className="mt-6 px-4 py-2 text-sm font-medium text-green-700 bg-green-100 rounded-md hover:bg-green-200 transition-colors"
                    >
                        Limpar Vencedor
                    </button>
                </div>
            )}
        </div>
    );
};

export default Giveaways;