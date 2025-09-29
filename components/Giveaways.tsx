import React, { useState, useEffect, useCallback } from 'react';
import { User, Company, QuestionType, Survey, Prize, GiveawayWinner, UserRole } from '../types';
import { supabase } from '../src/integrations/supabase/client';
import { GiftIcon } from './icons/GiftIcon';
import { PencilIcon } from './icons/PencilIcon';
import { TrashIcon } from './icons/TrashIcon';
import { CreateIcon } from './icons/CreateIcon';
import { showError, showSuccess } from '../src/utils/toast';
import WinnerDisplayPopup from '../src/components/WinnerDisplayPopup';
import ConfirmationDialog from '../src/components/ConfirmationDialog';
import CountdownPopup from '../src/components/CountdownPopup';

// Nova interface para os participantes do sorteio
interface GiveawayParticipant {
    id: string; // survey_response.id
    name: string;
    email?: string;
    phone?: string;
}

// Nova interface para o histórico de vencedores
interface PastWinner {
    created_at: string;
    winner_name: string;
    winner_phone: string | null;
    rank: number;
    prizes: { name: string } | null;
}

interface GiveawaysProps {
    currentUser: User;
    currentCompany: Company | null; // Permitir que currentCompany seja null
}

const Giveaways: React.FC<GiveawaysProps> = ({ currentUser, currentCompany }) => {
    const [participants, setParticipants] = useState<GiveawayParticipant[]>([]);
    const [prizes, setPrizes] = useState<Prize[]>([]);
    const [selectedPrizesForDraw, setSelectedPrizesForDraw] = useState<Prize[]>([]);
    const [drawResults, setDrawResults] = useState<GiveawayWinner[]>([]); // Para múltiplos vencedores
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedSurveyId, setSelectedSurveyId] = useState<string | null>(null);
    const [availableSurveys, setAvailableSurveys] = useState<Survey[]>([]);
    const [isDrawing, setIsDrawing] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const [progress, setProgress] = useState(0);
    const [showPrizeModal, setShowPrizeModal] = useState(false);
    const [editingPrize, setEditingPrize] = useState<Prize | null>(null);
    const [prizeFormName, setPrizeFormName] = useState('');
    const [prizeFormDescription, setPrizeFormDescription] = useState('');
    const [prizeFormRank, setPrizeFormRank] = useState<number | string>(''); // Novo estado para o rank
    const [showDeletePrizeDialog, setShowDeletePrizeDialog] = useState(false);
    const [prizeToDelete, setPrizeToDelete] = useState<Prize | null>(null);
    const [pastWinners, setPastWinners] = useState<PastWinner[]>([]); // Novo estado para o histórico

    const animationDuration = 3000;

    const canManagePrizes = (currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.DEVELOPER) && currentCompany !== null;

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
            if (data && data.length > 0 && !selectedSurveyId) {
                setSelectedSurveyId(data[0].id);
            } else if (data && data.length === 0) {
                setSelectedSurveyId(null);
            }
        };
        loadSurveys();
    }, [currentCompany?.id, selectedSurveyId]);

    // Função para buscar prêmios
    const fetchPrizes = useCallback(async () => {
        if (!currentCompany?.id) {
            setPrizes([]);
            return;
        }
        const { data, error } = await supabase
            .from('prizes')
            .select('*')
            .eq('company_id', currentCompany.id)
            .order('rank', { ascending: true, nullsFirst: true }) // Ordenar por rank primeiro
            .order('name', { ascending: true }); // Depois por nome

        if (error) {
            console.error('Erro ao buscar prêmios:', error);
            showError('Não foi possível carregar a lista de prêmios.');
            setPrizes([]);
            return;
        }
        setPrizes(data || []);
    }, [currentCompany?.id]);

    useEffect(() => {
        fetchPrizes();
    }, [fetchPrizes]);

    const fetchParticipants = useCallback(async () => {
        setLoading(true);
        setError(null);
        setDrawResults([]); // Limpar resultados de sorteio ao buscar novos participantes

        if (!selectedSurveyId) {
            setParticipants([]);
            setError('Por favor, selecione uma pesquisa para carregar os participantes.');
            setLoading(false);
            return;
        }

        try {
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
            
            const phoneQuestionIds: string[] = questionsData
                .filter(q => q.text === 'Telefone' && q.type === QuestionType.PHONE)
                .map(q => q.id);

            if (nameQuestionIds.length === 0) {
                setError('A pesquisa selecionada não possui uma pergunta de "Nome Completo" (Texto Curto).');
                setParticipants([]);
                setLoading(false);
                return;
            }

            const relevantQuestionIds = [...nameQuestionIds, ...emailQuestionIds, ...phoneQuestionIds];
            if (relevantQuestionIds.length === 0) {
                setParticipants([]);
                setLoading(false);
                return;
            }

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

            const responsesMap = new Map<string, { name?: string; email?: string; phone?: string }>();

            responsesData.forEach(response => {
                const responseId = response.id;
                if (!responsesMap.has(responseId)) {
                    responsesMap.set(responseId, {});
                }
                const currentResponse = responsesMap.get(responseId)!;

                response.answers.forEach((answer: any) => {
                    if (nameQuestionIds.includes(answer.question_id) && typeof answer.value === 'string') {
                        currentResponse.name = answer.value.trim();
                    }
                    if (emailQuestionIds.includes(answer.question_id) && typeof answer.value === 'string') {
                        currentResponse.email = answer.value.trim();
                    }
                    if (phoneQuestionIds.includes(answer.question_id) && typeof answer.value === 'string') {
                        currentResponse.phone = answer.value.trim();
                    }
                });
            });

            const uniqueParticipants = new Map<string, GiveawayParticipant>();

            responsesMap.forEach((responseDetails, responseId) => {
                if (responseDetails.name) {
                    const normalizedName = responseDetails.name.toLowerCase();
                    if (!uniqueParticipants.has(normalizedName)) {
                        uniqueParticipants.set(normalizedName, {
                            id: responseId, // Usar o ID da resposta como ID do participante
                            name: responseDetails.name,
                            email: responseDetails.email,
                            phone: responseDetails.phone,
                        });
                    } else {
                        const existing = uniqueParticipants.get(normalizedName);
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

    const fetchPastWinners = useCallback(async (surveyId: string) => {
        const { data, error } = await supabase
            .from('giveaway_winners')
            .select(`
                created_at,
                winner_name,
                winner_phone,
                rank,
                prizes ( name )
            `)
            .eq('survey_id', surveyId)
            .order('created_at', { ascending: false })
            .order('rank', { ascending: true });

        if (error) {
            console.error('Erro ao buscar histórico de vencedores:', error);
            showError('Não foi possível carregar o histórico de sorteios.');
            setPastWinners([]);
        } else {
            setPastWinners(data as PastWinner[]);
        }
    }, []);

    useEffect(() => {
        if (selectedSurveyId) {
            fetchParticipants();
            fetchPastWinners(selectedSurveyId);
        } else {
            setParticipants([]);
            setPastWinners([]);
            setLoading(false);
            setError('Por favor, selecione uma pesquisa para carregar os participantes.');
        }
    }, [selectedSurveyId, fetchParticipants, fetchPastWinners]);

    useEffect(() => {
        let countdownInterval: NodeJS.Timeout;
        let progressInterval: NodeJS.Timeout;

        if (isDrawing) {
            setDrawResults([]);
            setCountdown(animationDuration / 1000);
            setProgress(0);

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
            }, 50);
        }

        return () => {
            clearInterval(countdownInterval);
            clearInterval(progressInterval);
        };
    }, [isDrawing]);

    const handleDraw = async () => {
        if (!currentCompany) {
            showError('Você precisa ter uma empresa associada para realizar sorteios.');
            return;
        }
        if (participants.length === 0) {
            showError('Não há participantes para realizar o sorteio!');
            return;
        }
        if (selectedPrizesForDraw.length === 0) {
            showError('Por favor, selecione pelo menos um prêmio para o sorteio.');
            return;
        }
        if (!selectedSurveyId) {
            showError('Por favor, selecione uma pesquisa para o sorteio.');
            return;
        }

        setIsDrawing(true); // Inicia o popup de contagem regressiva

        setTimeout(async () => {
            const shuffledParticipants = [...participants].sort(() => 0.5 - Math.random());
            const winners: GiveawayWinner[] = [];
            const selectedWinnerIds = new Set<string>();

            // Os prêmios já estão ordenados por rank devido ao fetchPrizes e handlePrizeSelectionForDraw
            for (let i = 0; i < selectedPrizesForDraw.length; i++) {
                const prize = selectedPrizesForDraw[i];
                let winnerFound = false;
                for (let j = 0; j < shuffledParticipants.length; j++) {
                    const participant = shuffledParticipants[j];
                    if (!selectedWinnerIds.has(participant.id)) {
                        winners.push({
                            id: '', // Será gerado pelo Supabase
                            survey_id: selectedSurveyId,
                            prize_id: prize.id,
                            winner_response_id: participant.id,
                            winner_name: participant.name,
                            winner_email: participant.email,
                            winner_phone: participant.phone,
                            rank: i + 1, // O rank aqui é a ordem do sorteio, não o rank do prêmio
                            prize: prize, // Incluir o objeto prize para exibição no popup
                        });
                        selectedWinnerIds.add(participant.id);
                        winnerFound = true;
                        break;
                    }
                }
                if (!winnerFound) {
                    showError(`Não foi possível encontrar um vencedor único para o ${i + 1}º prêmio. Talvez não haja participantes suficientes.`);
                    break;
                }
            }

            if (winners.length > 0) {
                const { data, error } = await supabase
                    .from('giveaway_winners')
                    .insert(winners.map(w => ({
                        survey_id: w.survey_id,
                        prize_id: w.prize_id,
                        winner_response_id: w.winner_response_id,
                        winner_name: w.winner_name,
                        winner_email: w.winner_email,
                        winner_phone: w.winner_phone,
                        rank: w.rank,
                    })))
                    .select();

                if (error) {
                    console.error('Erro ao salvar vencedores:', error);
                    showError('Erro ao salvar os vencedores do sorteio: ' + error.message);
                } else {
                    showSuccess('Sorteio realizado e vencedores salvos com sucesso!');
                    setDrawResults(winners); // Define os vencedores para exibição no popup
                    fetchPastWinners(selectedSurveyId); // Atualiza o histórico
                }
            }
            setIsDrawing(false); // Para o popup de contagem regressiva, permitindo que o popup de vencedores apareça
        }, animationDuration);
    };

    const handleCloseWinnerPopup = () => {
        setDrawResults([]);
    };

    const handlePrizeSelectionForDraw = (prize: Prize, isChecked: boolean) => {
        if (isChecked) {
            setSelectedPrizesForDraw(prev => [...prev, prize].sort((a, b) => (a.rank || Infinity) - (b.rank || Infinity)));
        } else {
            setSelectedPrizesForDraw(prev => prev.filter(p => p.id !== prize.id));
        }
    };

    const handleOpenPrizeModal = (prize: Prize | null = null) => {
        if (!currentCompany) {
            showError('Você precisa ter uma empresa associada para gerenciar prêmios.');
            return;
        }
        setEditingPrize(prize);
        setPrizeFormName(prize?.name || '');
        setPrizeFormDescription(prize?.description || '');
        setPrizeFormRank(prize?.rank || ''); // Inicializa o rank
        setShowPrizeModal(true);
    };

    const handleClosePrizeModal = () => {
        setShowPrizeModal(false);
        setEditingPrize(null);
        setPrizeFormName('');
        setPrizeFormDescription('');
        setPrizeFormRank(''); // Limpa o rank ao fechar
    };

    const handleSavePrize = async () => {
        if (!prizeFormName.trim()) {
            showError('O nome do prêmio não pode estar vazio.');
            return;
        }
        if (!currentCompany?.id) {
            showError('Empresa não identificada para salvar o prêmio.');
            return;
        }

        try {
            const rankValue = prizeFormRank === '' ? null : Number(prizeFormRank);

            if (editingPrize) {
                const { error } = await supabase
                    .from('prizes')
                    .update({ name: prizeFormName, description: prizeFormDescription, rank: rankValue })
                    .eq('id', editingPrize.id);
                if (error) throw error;
                showSuccess('Prêmio atualizado com sucesso!');
            } else {
                const { error } = await supabase
                    .from('prizes')
                    .insert({ company_id: currentCompany.id, name: prizeFormName, description: prizeFormDescription, rank: rankValue });
                if (error) throw error;
                showSuccess('Prêmio criado com sucesso!');
            }
            fetchPrizes();
            handleClosePrizeModal();
        } catch (err: any) {
            console.error('Erro ao salvar prêmio:', err.message);
            showError('Erro ao salvar prêmio: ' + err.message);
        }
    };

    const handleDeletePrize = async () => {
        if (!prizeToDelete) return;
        try {
            const { error } = await supabase
                .from('prizes')
                .delete()
                .eq('id', prizeToDelete.id);
            if (error) throw error;
            showSuccess('Prêmio excluído com sucesso!');
            fetchPrizes();
            setShowDeletePrizeDialog(false);
            setPrizeToDelete(null);
        } catch (err: any) {
            console.error('Erro ao excluir prêmio:', err.message);
            showError('Erro ao excluir prêmio: ' + err.message);
        }
    };

    const confirmDeletePrize = (prize: Prize) => {
        if (!currentCompany) {
            showError('Você precisa ter uma empresa associada para gerenciar prêmios.');
            return;
        }
        setPrizeToDelete(prize);
        setShowDeletePrizeDialog(true);
    };

    if (!currentCompany) {
        return (
            <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-md text-center">
                <GiftIcon className="h-12 w-12 text-primary mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-text-main mb-4">Sorteios da Empresa</h2>
                <p className="text-text-light mb-6">
                    Você não tem uma empresa associada. Crie ou vincule-se a uma empresa para gerenciar e realizar sorteios.
                </p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-md">
            <div className="flex items-center gap-4 mb-6">
                <GiftIcon className="h-8 w-8 text-primary" />
                <h2 className="text-2xl font-bold text-text-main">Sorteios da Empresa</h2>
            </div>
            <p className="text-text-light mb-6">
                Realize sorteios entre os leads cadastrados nas pesquisas da sua empresa ({currentCompany.name}).
            </p>

            {/* Gerenciamento de Prêmios */}
            {canManagePrizes && (
                <div className="mb-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-semibold text-text-main">Gerenciar Prêmios</h3>
                        <button
                            onClick={() => handleOpenPrizeModal()}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark"
                        >
                            <CreateIcon className="h-4 w-4" /> Adicionar Prêmio
                        </button>
                    </div>
                    {prizes.length === 0 ? (
                        <p className="text-text-light text-sm">Nenhum prêmio cadastrado ainda. Adicione um para começar!</p>
                    ) : (
                        <ul className="space-y-2">
                            {prizes.map(prize => (
                                <li key={prize.id} className="flex items-center justify-between bg-white p-3 rounded-md shadow-sm border border-gray-100">
                                    <div>
                                        <p className="font-medium text-gray-800">
                                            {prize.rank ? `${prize.rank}º Lugar: ` : ''}{prize.name}
                                        </p>
                                        {prize.description && <p className="text-sm text-gray-500">{prize.description}</p>}
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleOpenPrizeModal(prize)}
                                            className="p-2 text-gray-400 hover:text-primary rounded-full hover:bg-primary/10 transition-colors"
                                            aria-label="Editar prêmio"
                                        >
                                            <PencilIcon className="h-5 w-5" />
                                        </button>
                                        <button
                                            onClick={() => confirmDeletePrize(prize)}
                                            className="p-2 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-500/10 transition-colors"
                                            aria-label="Excluir prêmio"
                                        >
                                            <TrashIcon className="h-5 w-5" />
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

            {/* Seleção de Pesquisa */}
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

            {/* Participantes */}
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
                                    <span className="text-gray-700">{p.name} {p.phone && `(${p.phone})`}</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-text-light text-sm">Nenhum participante encontrado para a pesquisa selecionada. Certifique-se de que a pesquisa inclui uma pergunta de "Nome Completo" e que há respostas cadastradas.</p>
                    )}
                </div>
            )}

            {/* Seleção de Prêmios para o Sorteio */}
            <div className="mb-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="text-xl font-semibold text-text-main mb-4">Selecionar Prêmios para o Sorteio</h3>
                {prizes.length === 0 ? (
                    <p className="text-text-light text-sm">Cadastre prêmios na seção "Gerenciar Prêmios" para poder sorteá-los.</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {prizes.map(prize => (
                            <label key={prize.id} className="flex items-center p-3 bg-white rounded-md shadow-sm border border-gray-100 cursor-pointer hover:bg-gray-50">
                                <input
                                    type="checkbox"
                                    checked={selectedPrizesForDraw.some(p => p.id === prize.id)}
                                    onChange={(e) => handlePrizeSelectionForDraw(prize, e.target.checked)}
                                    className="form-checkbox h-5 w-5 text-primary rounded focus:ring-primary"
                                />
                                <div className="ml-3">
                                    <p className="font-medium text-gray-800">
                                        {prize.rank ? `${prize.rank}º Lugar: ` : ''}{prize.name}
                                    </p>
                                    {prize.description && <p className="text-sm text-gray-500">{prize.description}</p>}
                                </div>
                            </label>
                        ))}
                    </div>
                )}
                {selectedPrizesForDraw.length > 0 && (
                    <div className="mt-4 text-sm text-text-light">
                        Prêmios selecionados para o sorteio (em ordem de classificação):
                        <ul className="list-disc list-inside ml-4">
                            {selectedPrizesForDraw.map((p, index) => (
                                <li key={p.id}>{index + 1}º Lugar: {p.name}</li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            {/* Botão Sortear */}
            <div className="flex justify-center mb-8">
                <button
                    onClick={handleDraw}
                    className="px-8 py-3 font-semibold text-white bg-primary rounded-md hover:bg-primary-dark shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={participants.length === 0 || loading || isDrawing || selectedPrizesForDraw.length === 0}
                >
                    {isDrawing ? 'Sorteando...' : 'Sortear'}
                </button>
            </div>

            {/* Histórico de Sorteios */}
            <div className="mt-12">
                <h3 className="text-xl font-semibold text-text-main mb-4">Histórico de Sorteios</h3>
                {pastWinners.length > 0 ? (
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
                                        <td className="py-3 px-4 text-sm text-gray-700 whitespace-nowrap">
                                            {new Date(winner.created_at).toLocaleString('pt-BR')}
                                        </td>
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

            {/* Popup de Contagem Regressiva */}
            {isDrawing && (
                <CountdownPopup countdown={countdown} progress={progress} />
            )}

            {/* Popup de Vencedor(es) */}
            {drawResults.length > 0 && !isDrawing && ( // Garante que o popup de vencedor só aparece após o sorteio ser concluído
                <WinnerDisplayPopup winners={drawResults} onClose={handleCloseWinnerPopup} />
            )}

            {/* Modal de Adicionar/Editar Prêmio */}
            {showPrizeModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
                        <h3 className="text-xl font-bold text-text-main mb-4">{editingPrize ? 'Editar Prêmio' : 'Adicionar Novo Prêmio'}</h3>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="prize-name" className="block text-sm font-medium text-gray-700">Nome do Prêmio</label>
                                <input
                                    type="text"
                                    id="prize-name"
                                    value={prizeFormName}
                                    onChange={(e) => setPrizeFormName(e.target.value)}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-gray-700"
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="prize-description" className="block text-sm font-medium text-gray-700">Descrição (Opcional)</label>
                                <textarea
                                    id="prize-description"
                                    value={prizeFormDescription}
                                    onChange={(e) => setPrizeFormDescription(e.target.value)}
                                    rows={3}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-gray-700"
                                />
                            </div>
                            <div>
                                <label htmlFor="prize-rank" className="block text-sm font-medium text-gray-700">Ordem (Lugar)</label>
                                <input
                                    type="number"
                                    id="prize-rank"
                                    value={prizeFormRank}
                                    onChange={(e) => setPrizeFormRank(e.target.value === '' ? '' : Number(e.target.value))}
                                    min="1"
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-gray-700"
                                />
                                <p className="text-xs text-gray-500 mt-1">Defina a ordem deste prêmio no sorteio (ex: 1 para 1º lugar).</p>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={handleClosePrizeModal}
                                className="px-4 py-2 font-semibold text-gray-700 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSavePrize}
                                className="px-4 py-2 font-semibold text-white bg-primary rounded-md hover:bg-primary-dark transition-colors"
                            >
                                {editingPrize ? 'Salvar Alterações' : 'Adicionar Prêmio'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Diálogo de Confirmação de Exclusão de Prêmio */}
            {showDeletePrizeDialog && (
                <ConfirmationDialog
                    title="Confirmar Exclusão"
                    message={`Tem certeza que deseja excluir o prêmio "${prizeToDelete?.name}"? Esta ação não pode ser desfeita.`}
                    confirmText="Excluir"
                    onConfirm={handleDeletePrize}
                    cancelText="Cancelar"
                    onCancel={() => setShowDeletePrizeDialog(false)}
                />
            )}
        </div>
    );
};

export default Giveaways;