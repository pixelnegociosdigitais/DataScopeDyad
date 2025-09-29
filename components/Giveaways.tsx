import React, { useState, useEffect, useCallback } from 'react';
import { User, Company, QuestionType, Survey } from '../types';
import { supabase } from '../src/integrations/supabase/client';
import { GiftIcon } from './icons/GiftIcon';
import { showError } from '../src/utils/toast'; // Importar showError
import WinnerDisplayPopup from '../src/components/WinnerDisplayPopup'; // Importar o novo componente de popup

// Nova interface para os participantes do sorteio
interface GiveawayParticipant {
    id: string;
    name: string;
    email?: string;
    phone?: string; // Adicionado campo de telefone
}

interface GiveawaysProps {
    currentUser: User;
    currentCompany: Company;
}

const Giveaways: React.FC<GiveawaysProps> = ({ currentUser, currentCompany }) => {
    const [participants, setParticipants] = useState<GiveawayParticipant[]>([]);
    const [displayWinner, setDisplayWinner] = useState<GiveawayParticipant | null>(null); // Vencedor a ser exibido
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedSurveyId, setSelectedSurveyId] = useState<string | null>(null);
    const [availableSurveys, setAvailableSurveys] = useState<Survey[]>([]);
    const [isDrawing, setIsDrawing] = useState(false); // Estado para controlar a animação
    const [countdown, setCountdown] = useState(0); // Estado para o contador regressivo
    const [progress, setProgress] = useState(0); // Estado para a barra de progresso (0-100)

    const animationDuration = 3000; // Duração da animação em milissegundos (3 segundos)

    // Efeito para buscar as pesquisas disponíveis para a empresa
    useEffect(() => {
        const loadSurveys = async () => {
            if (!currentCompany?.id) {
                setAvailableSurveys([]);
                setSelectedSurveyId(null);
                return;
            }
            const { data, error } = await supabase
                .from('surveys')
                .select('id, title')
                .eq('company_id', currentCompany.id)
                .order('title', { ascending: true });

            if (error) {
                console.error('Erro ao buscar pesquisas disponíveis:', error);
                showError('Não foi possível carregar a lista de pesquisas para seleção.');
                setAvailableSurveys([]);
                return;
            }
            setAvailableSurveys(data || []);
            // Se não houver pesquisa selecionada e houver pesquisas disponíveis, pré-selecionar a primeira
            if (data && data.length > 0 && !selectedSurveyId) {
                setSelectedSurveyId(data[0].id);
            } else if (data && data.length === 0) {
                setSelectedSurveyId(null);
            }
        };
        loadSurveys();
    }, [currentCompany.id, selectedSurveyId]);

    const fetchParticipants = useCallback(async () => {
        setLoading(true);
        setError(null);
        setDisplayWinner(null); // Limpar vencedor ao buscar novos participantes

        if (!selectedSurveyId) {
            setParticipants([]);
            setError('Por favor, selecione uma pesquisa para carregar os participantes.');
            setLoading(false);
            return;
        }

        try {
            // 1. Buscar as perguntas da pesquisa selecionada
            const { data: questionsData, error: questionsError } = await supabase
                .from('questions')
                .select('id, text, type')
                .eq('survey_id', selectedSurveyId);

            if (questionsError) throw questionsError;

            const nameQuestionIds: string[] = questionsData
                .filter(q => q.text === 'Nome Completo' && q.type === QuestionType.SHORT_TEXT)
                .map(q => q.id);

            const emailQuestionIds: string[] = questionsData
                .filter(q => q.text === 'E-mail' && q.type === QuestionType.EMAIL)
                .map(q => q.id);
            
            const phoneQuestionIds: string[] = questionsData // Buscar perguntas de telefone
                .filter(q => q.text === 'Telefone' && q.type === QuestionType.PHONE)
                .map(q => q.id);

            if (nameQuestionIds.length === 0) {
                setError('A pesquisa selecionada não possui uma pergunta de "Nome Completo" (Texto Curto).');
                setParticipants([]);
                setLoading(false);
                return;
            }

            const relevantQuestionIds = [...nameQuestionIds, ...emailQuestionIds, ...phoneQuestionIds]; // Incluir telefone
            if (relevantQuestionIds.length === 0) {
                setParticipants([]);
                setLoading(false);
                return;
            }

            // 2. Buscar todas as respostas para a pesquisa selecionada, incluindo as respostas detalhadas
            const { data: responsesData, error: responsesError } = await supabase
                .from('survey_responses')
                .select(`
                    id,
                    answers (
                        question_id,
                        value
                    )
                `)
                .eq('survey_id', selectedSurveyId);

            if (responsesError) throw responsesError;

            const responsesMap = new Map<string, { name?: string; email?: string; phone?: string }>(); // Adicionado phone

            responsesData.forEach(response => {
                const responseId = response.id;
                if (!responsesMap.has(responseId)) {
                    responsesMap.set(responseId, {});
                }
                const currentResponse = responsesMap.get(responseId)!;

                // Iterar sobre o array aninhado 'answers'
                response.answers.forEach((answer: any) => {
                    if (nameQuestionIds.includes(answer.question_id) && typeof answer.value === 'string') {
                        currentResponse.name = answer.value.trim();
                    }
                    if (emailQuestionIds.includes(answer.question_id) && typeof answer.value === 'string') {
                        currentResponse.email = answer.value.trim();
                    }
                    if (phoneQuestionIds.includes(answer.question_id) && typeof answer.value === 'string') { // Processar telefone
                        currentResponse.phone = answer.value.trim();
                    }
                });
            });

            // 3. Deduplicar participantes com base no nome
            const uniqueParticipants = new Map<string, GiveawayParticipant>();

            responsesMap.forEach((responseDetails, responseId) => {
                if (responseDetails.name) {
                    const normalizedName = responseDetails.name.toLowerCase();
                    if (!uniqueParticipants.has(normalizedName)) {
                        uniqueParticipants.set(normalizedName, {
                            id: `resp-${responseId}`,
                            name: responseDetails.name,
                            email: responseDetails.email,
                            phone: responseDetails.phone, // Incluir telefone
                        });
                    } else {
                        const existing = uniqueParticipants.get(normalizedName);
                        // Atualizar email ou telefone se o existente não tiver e o novo tiver
                        if (existing) {
                            if (responseDetails.email && !existing.email) {
                                existing.email = responseDetails.email;
                            }
                            if (responseDetails.phone && !existing.phone) {
                                existing.phone = responseDetails.phone;
                            }
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
    }, [selectedSurveyId]);

    // Efeito para disparar a busca de participantes quando a pesquisa selecionada muda
    useEffect(() => {
        if (selectedSurveyId) {
            fetchParticipants();
        } else {
            setParticipants([]);
            setLoading(false);
            setError('Por favor, selecione uma pesquisa para carregar os participantes.');
        }
    }, [selectedSurveyId, fetchParticipants]);

    // Efeito para gerenciar a animação do contador e da barra de progresso
    useEffect(() => {
        let countdownInterval: NodeJS.Timeout;
        let progressInterval: NodeJS.Timeout;

        if (isDrawing) {
            setDisplayWinner(null); // Limpa o vencedor anterior
            setCountdown(animationDuration / 1000); // Inicia o contador
            setProgress(0); // Reseta a barra de progresso

            const startTime = Date.now();

            countdownInterval = setInterval(() => {
                setCountdown(prev => {
                    if (prev <= 1) {
                        clearInterval(countdownInterval);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            progressInterval = setInterval(() => {
                const elapsedTime = Date.now() - startTime;
                const newProgress = Math.min((elapsedTime / animationDuration) * 100, 100);
                setProgress(newProgress);

                if (newProgress >= 100) {
                    clearInterval(progressInterval);
                }
            }, 50); // Atualiza a barra de progresso a cada 50ms para uma animação suave
        }

        return () => {
            clearInterval(countdownInterval);
            clearInterval(progressInterval);
        };
    }, [isDrawing]); // Roda este efeito apenas quando isDrawing muda

    const handleDraw = () => {
        if (participants.length === 0) {
            alert('Não há participantes para realizar o sorteio!');
            return;
        }

        setIsDrawing(true); // Inicia a animação

        setTimeout(() => {
            const randomIndex = Math.floor(Math.random() * participants.length);
            const selectedWinner = participants[randomIndex];
            setDisplayWinner(selectedWinner); // Define o vencedor real para exibição
            setIsDrawing(false); // Para a animação
        }, animationDuration);
    };

    const handleCloseWinnerPopup = () => {
        setDisplayWinner(null);
    };

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
                <label htmlFor="survey-select" className="block text-sm font-medium text-gray-700 mb-2">
                    Selecionar Pesquisa para Sorteio:
                </label>
                <select
                    id="survey-select"
                    value={selectedSurveyId || ''}
                    onChange={(e) => setSelectedSurveyId(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-gray-700"
                >
                    <option value="">-- Selecione uma pesquisa --</option>
                    {availableSurveys.map(survey => (
                        <option key={survey.id} value={survey.id}>{survey.title}</option>
                    ))}
                </select>
            </div>

            {loading ? (
                <div className="text-center py-8 text-text-light">Carregando participantes...</div>
            ) : error ? (
                <div className="text-center py-8 text-red-600">{error}</div>
            ) : (
                <div className="mb-6">
                    <h3 className="text-lg font-semibold text-text-main mb-2">Participantes ({participants.length} pessoas)</h3>
                    {participants.length > 0 ? (
                        <ul className="max-h-60 overflow-y-auto border border-gray-200 rounded-md p-4 bg-gray-50">
                            {participants.map(p => (
                                <li key={p.id} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-b-0">
                                    <div className="h-8 w-8 p-1 bg-gray-200 rounded-full text-gray-500 flex items-center justify-center text-xs">
                                        <GiftIcon className="h-4 w-4" />
                                    </div>
                                    <span className="text-gray-700">{p.name} {p.phone && `(${p.phone})`}</span> {/* Exibe telefone aqui */}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-text-light text-sm">Nenhum participante encontrado para a pesquisa selecionada. Certifique-se de que a pesquisa inclui uma pergunta de "Nome Completo" e que há respostas cadastradas.</p>
                    )}
                </div>
            )}

            <div className="flex justify-center mb-8">
                <button
                    onClick={handleDraw}
                    className="px-8 py-3 font-semibold text-white bg-primary rounded-md hover:bg-primary-dark shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={participants.length === 0 || loading || isDrawing} // Desabilita durante o sorteio
                >
                    {isDrawing ? 'Sorteando...' : 'Sortear'}
                </button>
            </div>

            {isDrawing && (
                <div className="bg-blue-50 border border-blue-200 text-blue-800 p-6 rounded-lg text-center shadow-inner">
                    <h3 className="text-xl font-bold mb-3">Sorteando...</h3>
                    <div className="flex flex-col items-center justify-center">
                        <p className="text-5xl font-extrabold text-blue-700 mb-4">{countdown}</p>
                        <div className="w-full bg-blue-200 rounded-full h-4 mb-4 overflow-hidden">
                            <div
                                className="bg-primary h-4 rounded-full transition-all duration-50 ease-linear"
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                        <p className="text-lg text-blue-700">Aguarde, estamos escolhendo o sortudo!</p>
                    </div>
                </div>
            )}

            {displayWinner && !isDrawing && (
                <WinnerDisplayPopup winner={displayWinner} onClose={handleCloseWinnerPopup} />
            )}
        </div>
    );
};

export default Giveaways;