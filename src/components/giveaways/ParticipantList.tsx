import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../integrations/supabase/client';
import { QuestionType } from '../../../types';
import { GiftIcon } from '../../../components/icons/GiftIcon';
import { logActivity } from '../../utils/logger';

interface GiveawayParticipant {
    id: string; // Agora será o ID da resposta da pesquisa
    name: string;
    email?: string;
    phone?: string;
}

interface ParticipantListProps {
    selectedSurveyId: string;
    onParticipantsLoad: (participants: GiveawayParticipant[]) => void;
}

const ParticipantList: React.FC<ParticipantListProps> = ({ selectedSurveyId, onParticipantsLoad }) => {
    const [participants, setParticipants] = useState<GiveawayParticipant[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchParticipants = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const { data: questionsData, error: questionsError } = await supabase.from('questions').select('id, text, type').eq('survey_id', selectedSurveyId);
            if (questionsError) throw questionsError;

            // Mapeamento para encontrar as perguntas de nome, email e telefone de forma mais robusta
            const nameQuestionId = questionsData.find(q => 
                q.type === QuestionType.SHORT_TEXT && 
                (q.text.toLowerCase().includes('nome completo') || q.text.toLowerCase().includes('nome'))
            )?.id;
            
            const emailQuestionId = questionsData.find(q => 
                q.type === QuestionType.EMAIL && 
                (q.text.toLowerCase().includes('e-mail') || q.text.toLowerCase().includes('email'))
            )?.id;
            
            const phoneQuestionId = questionsData.find(q => 
                q.type === QuestionType.PHONE && 
                (q.text.toLowerCase().includes('telefone') || q.text.toLowerCase().includes('celular'))
            )?.id;

            if (!nameQuestionId) {
                const errorMessage = 'A pesquisa selecionada não possui uma pergunta de nome (ex: "Nome Completo" do tipo Texto Curto).';
                setError(errorMessage);
                logActivity('WARN', `Sorteio: ${errorMessage} para surveyId: ${selectedSurveyId}`, 'GIVEAWAYS');
                setParticipants([]);
                onParticipantsLoad([]);
                setLoading(false);
                return;
            }

            const { data: responsesData, error: responsesError } = await supabase.from('survey_responses').select(`id, answers (question_id, value)`).eq('survey_id', selectedSurveyId);
            if (responsesError) throw responsesError;

            const loadedParticipants: GiveawayParticipant[] = [];
            responsesData.forEach(response => {
                const participant: GiveawayParticipant = { id: response.id, name: '' }; // ID agora é o ID da resposta
                
                response.answers.forEach((answer: any) => {
                    if (answer.question_id === nameQuestionId) {
                        participant.name = String(answer.value).trim();
                    }
                    if (answer.question_id === emailQuestionId) {
                        participant.email = String(answer.value).trim();
                    }
                    if (answer.question_id === phoneQuestionId) {
                        participant.phone = String(answer.value).trim();
                    }
                });

                if (participant.name) { // Apenas adiciona se tiver um nome
                    loadedParticipants.push(participant);
                }
            });
            
            setParticipants(loadedParticipants);
            onParticipantsLoad(loadedParticipants);

        } catch (err: any) {
            const errorMessage = 'Não foi possível carregar os participantes: ' + err.message;
            setError(errorMessage);
            logActivity('ERROR', `Sorteio: ${errorMessage} para surveyId: ${selectedSurveyId}`, 'GIVEAWAYS');
        } finally {
            setLoading(false);
        }
    }, [selectedSurveyId, onParticipantsLoad]);

    useEffect(() => {
        fetchParticipants();
    }, [fetchParticipants]);

    if (loading) return <div className="text-center py-8 text-text-light">Carregando participantes...</div>;
    if (error) return <div className="text-center py-8 text-red-600">{error}</div>;

    return (
        <div className="mb-6">
            <h3 className="text-lg font-semibold text-text-main mb-2">Participantes ({participants.length} pessoas)</h3>
            {participants.length > 0 ? (
                <ul className="max-h-60 overflow-y-auto border border-gray-200 rounded-md p-4 bg-gray-50">
                    {participants.map(p => (
                        <li key={p.id} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-b-0">
                            <div className="h-8 w-8 p-1 bg-gray-200 rounded-full text-gray-500 flex items-center justify-center text-xs"><GiftIcon className="h-4 w-4" /></div>
                            <span className="text-gray-700">{p.name} {p.phone && `(${p.phone})`}</span>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-text-light text-sm">Nenhum participante encontrado para a pesquisa selecionada.</p>
            )}
        </div>
    );
};

export default ParticipantList;