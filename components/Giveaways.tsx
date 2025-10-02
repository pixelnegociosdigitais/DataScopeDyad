import React, { useState, useEffect, useCallback } from 'react';
import { User, Company, Survey, Prize, GiveawayWinner, ModuleName } from '../types';
import { supabase } from '../src/integrations/supabase/client';
import { GiftIcon } from './icons/GiftIcon';
import { showError, showSuccess } from '../src/utils/toast';
import WinnerDisplayPopup from '../src/components/WinnerDisplayPopup';
import CountdownPopup from '../src/components/CountdownPopup';
import PrizeManager from '../src/components/giveaways/PrizeManager';
import SurveySelector from '../src/components/giveaways/SurveySelector';
import ParticipantList from '../src/components/giveaways/ParticipantList';
import DrawSetup from '../src/components/giveaways/DrawSetup';
import PastWinnersHistory from '../src/components/giveaways/PastWinnersHistory';
import { logActivity } from '../src/utils/logger'; // Importar o utilitário de log
import { useAuth } from '../src/hooks/useAuth'; // Importar useAuth para acessar modulePermissions

interface GiveawayParticipant {
    id: string;
    name: string;
    email?: string;
    phone?: string;
}

interface GiveawaysProps {
    currentUser: User;
    currentCompany: Company | null;
}

const Giveaways: React.FC<GiveawaysProps> = ({ currentUser, currentCompany }) => {
    const [participants, setParticipants] = useState<GiveawayParticipant[]>([]);
    const [prizes, setPrizes] = useState<Prize[]>([]);
    const [selectedPrizesForDraw, setSelectedPrizesForDraw] = useState<Prize[]>([]);
    const [drawResults, setDrawResults] = useState<GiveawayWinner[]>([]);
    const [selectedSurveyId, setSelectedSurveyId] = useState<string | null>(null);
    const [availableSurveys, setAvailableSurveys] = useState<Survey[]>([]);
    const [isDrawing, setIsDrawing] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const [progress, setProgress] = useState(0);

    const { modulePermissions } = useAuth(() => {}); // Obter as permissões do módulo

    const canPerformGiveaways = modulePermissions[ModuleName.PERFORM_GIVEAWAYS];
    const canViewGiveawayData = modulePermissions[ModuleName.VIEW_GIVEAWAY_DATA];

    const animationDuration = 3000;

    const fetchPrizes = useCallback(async () => {
        if (!currentCompany?.id) {
            setPrizes([]);
            return;
        }
        const { data, error } = await supabase.from('prizes').select('*').eq('company_id', currentCompany.id).order('rank', { ascending: true, nullsFirst: true }).order('name', { ascending: true });
        if (error) {
            showError('Não foi possível carregar a lista de prêmios.');
            logActivity('ERROR', `Erro ao carregar prêmios para a empresa ${currentCompany.id}: ${error.message}`, 'GIVEAWAYS', currentUser.id, currentUser.email, currentCompany.id);
            setPrizes([]);
        } else {
            setPrizes(data || []);
            logActivity('INFO', `Prêmios carregados para a empresa ${currentCompany.id}.`, 'GIVEAWAYS', currentUser.id, currentUser.email, currentCompany.id);
        }
    }, [currentCompany?.id, currentUser]);

    useEffect(() => {
        const loadSurveys = async () => {
            if (!currentCompany?.id) {
                setAvailableSurveys([]);
                setSelectedSurveyId(null);
                return;
            }
            // Ajuste na consulta para incluir todas as propriedades da interface Survey
            const { data, error } = await supabase.from('surveys').select(`
                id, 
                title, 
                company_id, 
                created_by, 
                created_at, 
                questions (id, text, type, options, position)
            `).eq('company_id', currentCompany.id).order('title', { ascending: true });
            
            if (error) {
                showError('Não foi possível carregar a lista de pesquisas.');
                logActivity('ERROR', `Erro ao carregar pesquisas para a empresa ${currentCompany.id}: ${error.message}`, 'GIVEAWAYS', currentUser.id, currentUser.email, currentCompany.id);
                setAvailableSurveys([]);
            } else {
                const fetchedSurveys: Survey[] = (data || []).map((s: any) => ({
                    id: s.id,
                    title: s.title,
                    companyId: s.company_id,
                    created_by: s.created_by,
                    created_at: s.created_at,
                    questions: s.questions || [], // Garante que questions seja um array
                }));
                setAvailableSurveys(fetchedSurveys);
                if (fetchedSurveys.length > 0 && !selectedSurveyId) {
                    setSelectedSurveyId(fetchedSurveys[0].id);
                } else if (fetchedSurveys.length === 0) {
                    setSelectedSurveyId(null);
                }
                logActivity('INFO', `Pesquisas carregadas para seleção de sorteio na empresa ${currentCompany.id}.`, 'GIVEAWAYS', currentUser.id, currentUser.email, currentCompany.id);
            }
        };
        loadSurveys();
        fetchPrizes();
    }, [currentCompany?.id, fetchPrizes, selectedSurveyId, currentUser]);

    useEffect(() => {
        let countdownInterval: NodeJS.Timeout;
        let progressInterval: NodeJS.Timeout;
        if (isDrawing) {
            setDrawResults([]);
            setCountdown(animationDuration / 1000);
            setProgress(0);
            const startTime = Date.now();
            countdownInterval = setInterval(() => setCountdown(prev => (prev <= 1 ? 0 : prev - 1)), 1000);
            progressInterval = setInterval(() => {
                const newProgress = Math.min(((Date.now() - startTime) / animationDuration) * 100, 100);
                setProgress(newProgress);
                if (newProgress >= 100) clearInterval(progressInterval);
            }, 50);
        }
        return () => {
            clearInterval(countdownInterval);
            clearInterval(progressInterval);
        };
    }, [isDrawing]);

    const handleDraw = async () => {
        if (!canPerformGiveaways) {
            showError('Você não tem permissão para realizar sorteios.');
            logActivity('WARN', `Tentativa de realizar sorteio por usuário sem permissão (${currentUser.email}).`, 'GIVEAWAYS', currentUser.id, currentUser.email, currentCompany?.id);
            return;
        }
        if (!selectedSurveyId || participants.length === 0 || selectedPrizesForDraw.length === 0) {
            showError('Selecione uma pesquisa, certifique-se de que há participantes e selecione prêmios para sortear.');
            logActivity('WARN', `Tentativa de sorteio sem pesquisa, participantes ou prêmios selecionados.`, 'GIVEAWAYS', currentUser.id, currentUser.email, currentCompany?.id);
            return;
        }
        setIsDrawing(true);
        logActivity('INFO', `Iniciando sorteio para a pesquisa ${selectedSurveyId} com ${selectedPrizesForDraw.length} prêmios.`, 'GIVEAWAYS', currentUser.id, currentUser.email, currentCompany?.id);
        setTimeout(async () => {
            const shuffled = [...participants].sort(() => 0.5 - Math.random());
            const winners: GiveawayWinner[] = [];
            const winnerIds = new Set<string>();
            for (const prize of selectedPrizesForDraw) {
                const winner = shuffled.find(p => !winnerIds.has(p.id));
                if (winner) {
                    winners.push({
                        id: '', survey_id: selectedSurveyId, prize_id: prize.id, winner_response_id: winner.id,
                        winner_name: winner.name, winner_email: winner.email, winner_phone: winner.phone,
                        rank: winners.length + 1, prize: prize,
                    });
                    winnerIds.add(winner.id);
                }
            }
            if (winners.length > 0) {
                const { error } = await supabase.from('giveaway_winners').insert(winners.map(w => ({
                    survey_id: w.survey_id, prize_id: w.prize_id, winner_response_id: w.winner_response_id,
                    winner_name: w.winner_name, winner_email: w.winner_email, winner_phone: w.winner_phone, rank: w.rank,
                })));
                if (error) {
                    showError('Erro ao salvar os vencedores: ' + error.message);
                    logActivity('ERROR', `Erro ao salvar vencedores do sorteio para pesquisa ${selectedSurveyId}: ${error.message}`, 'GIVEAWAYS', currentUser.id, currentUser.email, currentCompany?.id);
                } else {
                    showSuccess('Sorteio realizado e vencedores salvos!');
                    logActivity('INFO', `Sorteio realizado com sucesso para pesquisa ${selectedSurveyId}. Vencedores: ${winners.map(w => w.winner_name).join(', ')}.`, 'GIVEAWAYS', currentUser.id, currentUser.email, currentCompany?.id);
                    setDrawResults(winners);
                }
            } else {
                showError('Não foi possível selecionar vencedores suficientes para todos os prêmios.');
                logActivity('WARN', `Não foi possível selecionar vencedores suficientes para todos os prêmios na pesquisa ${selectedSurveyId}.`, 'GIVEAWAYS', currentUser.id, currentUser.email, currentCompany?.id);
            }
            setIsDrawing(false);
        }, animationDuration);
    };

    const handlePrizeSelectionForDraw = (prize: Prize, isChecked: boolean) => {
        setSelectedPrizesForDraw(prev => {
            const newSelection = isChecked ? [...prev, prize] : prev.filter(p => p.id !== prize.id);
            return newSelection.sort((a, b) => (a.rank || Infinity) - (b.rank || Infinity));
        });
    };

    if (!currentCompany) {
        return (
            <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-md text-center">
                <GiftIcon className="h-12 w-12 text-primary mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-text-main mb-4">Sorteios da Empresa</h2>
                <p className="text-text-light mb-6">Crie ou vincule-se a uma empresa para gerenciar e realizar sorteios.</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-md">
            <div className="flex items-center gap-4 mb-6">
                <GiftIcon className="h-8 w-8 text-primary" />
                <h2 className="text-2xl font-bold text-text-main">Sorteios da Empresa</h2>
            </div>
            <p className="text-text-light mb-6">Realize sorteios entre os leads cadastrados nas pesquisas da sua empresa ({currentCompany.name}).</p>

            {canPerformGiveaways && (
                <PrizeManager currentCompany={currentCompany} currentUser={currentUser} prizes={prizes} onPrizesUpdate={fetchPrizes} />
            )}
            
            {(canPerformGiveaways || canViewGiveawayData) && (
                <SurveySelector availableSurveys={availableSurveys} selectedSurveyId={selectedSurveyId} onSurveyChange={setSelectedSurveyId} />
            )}

            {selectedSurveyId && (canPerformGiveaways || canViewGiveawayData) && (
                <>
                    <ParticipantList selectedSurveyId={selectedSurveyId} onParticipantsLoad={setParticipants} />
                    {canPerformGiveaways && (
                        <DrawSetup prizes={prizes} selectedPrizesForDraw={selectedPrizesForDraw} onPrizeSelectionChange={handlePrizeSelectionForDraw} />
                    )}
                    {canPerformGiveaways && (
                        <div className="flex justify-center mb-8">
                            <button
                                onClick={handleDraw}
                                className="px-8 py-3 font-semibold text-white bg-primary rounded-md hover:bg-primary-dark shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={participants.length === 0 || isDrawing || selectedPrizesForDraw.length === 0}
                            >
                                {isDrawing ? 'Sorteando...' : 'Sortear'}
                            </button>
                        </div>
                    )}
                    {canViewGiveawayData && (
                        <PastWinnersHistory selectedSurveyId={selectedSurveyId} />
                    )}
                </>
            )}

            {isDrawing && <CountdownPopup countdown={countdown} progress={progress} />}
            {drawResults.length > 0 && !isDrawing && <WinnerDisplayPopup winners={drawResults} onClose={() => setDrawResults([])} />}
        </div>
    );
};

export default Giveaways;