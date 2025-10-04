import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../integrations/supabase/client';
import { QuestionType } from '../../../types';
import { GiftIcon } from '../../../components/icons/GiftIcon';
import { logActivity } from '../../utils/logger'; // Importar logActivity

interface GiveawayParticipant {
    id: string;
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

            // Lógica mais flexível para encontrar as perguntas de nome, email e telefone
            const nameQuestionCandidates = questionsData.filter(q => 
                q.type === QuestionType.SHORT_TEXT && q.text.toLowerCase().includes('nome')
            );
            const emailQuestionCandidates = questionsData.filter(q => 
                q.type === QuestionType.EMAIL && q.text.toLowerCase().includes('e-mail')
            );
            const phoneQuestionCandidates = questionsData.filter(q => 
                q.type === QuestionType.PHONE && q.text.toLowerCase().includes('telefone')
            );

            // Priorizar correspondências exatas se existirem, caso contrário, usar o primeiro candidato
            const nameQuestion = nameQuestionCandidates.find(q => q.text === 'Nome Completo') || nameQuestionCandidates[0];
            const emailQuestion = emailQuestionCandidates.find(q => q.text === 'E-mail') || emailQuestionCandidates[0];
            const phoneQuestion = phoneQuestionCandidates.find(q => q.text === 'Telefone') || phoneQuestionCandidates[0];

            const finalNameQuestionIds = nameQuestion ? [nameQuestion.id] : [];
            const finalEmailQuestionIds = emailQuestion ? [emailQuestion.id] : [];
            const finalPhoneQuestionIds = phoneQuestion ? [phoneQuestion.id] : [];

            if (finalNameQuestionIds.length === 0) {
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

            const responsesMap = new Map<string, { name?: string; email?: string; phone?: string }>();
            responsesData.forEach(response => {
                const responseId = response.id;
                if (!responsesMap.has(responseId)) responsesMap.set(responseId, {});
                const currentResponse = responsesMap.get(responseId)!;
                response.answers.forEach((answer: any) => {
                    if (finalNameQuestionIds.includes(answer.question_id)) currentResponse.name = String(answer.value).trim();
                    if (finalEmailQuestionIds.includes(answer.question_id)) currentResponse.email = String(answer.value).trim();
                    if (finalPhoneQuestionIds.includes(answer.question_id)) currentResponse.phone = String(answer.value).trim();
                });
            });

            const uniqueParticipants = new Map<string, GiveawayParticipant>();
            responsesMap.forEach((details, id) => {
                if (details.name) {
                    const normalizedName = details.name.toLowerCase();
                    if (!uniqueParticipants.has(normalizedName)) {
                        uniqueParticipants.set(normalizedName, { id, name: details.name, email: details.email, phone: details.phone });
                    }
                }
            });
            
            const loadedParticipants = Array.from(uniqueParticipants.values());
            setParticipants(loadedParticipants);
            onParticipantsLoad(loadedParticipants);

        } catch (err: any) {
            const errorMessage = 'Não foi possível carregar os participantes: ' + err.message;
            setError(errorMessage);
            logActivity('ERROR', `Sorteio: ${errorMessage} para surveyId: ${selectedSurveyId}`, 'GIVEAWAYS', undefined, undefined, undefined, err);
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