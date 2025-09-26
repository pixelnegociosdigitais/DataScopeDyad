import { useState, useEffect, useCallback } from 'react';
import { Survey, SurveyResponse, Question, Answer, Company, User } from '@/types';
import { supabase } from '@/src/integrations/supabase/client';
import { showSuccess, showError } from '@/src/utils/toast'; // Importar showSuccess e showError

interface UseSurveysReturn {
    surveys: Survey[];
    surveyResponses: SurveyResponse[];
    templates: Survey[];
    loadingSurveys: boolean;
    fetchSurveys: (companyId: string) => Promise<Survey[]>; // Alterado para retornar Promise<Survey[]>
    fetchSurveyResponses: (surveyId: string) => Promise<void>;
    handleSaveSurvey: (surveyData: Survey, editingSurveyId?: string) => Promise<void>;
    handleDeleteSurvey: (surveyId: string) => Promise<void>;
    handleSaveResponse: (answers: Answer[], selectedSurvey: Survey, currentUser: User) => Promise<boolean>;
}

export const useSurveys = (currentCompany: Company | null, currentUser: User | null): UseSurveysReturn => {
    const [surveys, setSurveys] = useState<Survey[]>([]);
    const [surveyResponses, setSurveyResponses] = useState<SurveyResponse[]>([]);
    const [templates, setTemplates] = useState<Survey[]>([]);
    const [loadingSurveys, setLoadingSurveys] = useState(true);

    const fetchSurveys = useCallback(async (companyId: string): Promise<Survey[]> => {
        setLoadingSurveys(true);
        const { data, error } = await supabase
            .from('surveys')
            .select(`
                id,
                title,
                company_id,
                created_by,
                created_at,
                questions (
                    id,
                    text,
                    type,
                    options,
                    position
                ),
                survey_responses(count)
            `)
            .eq('company_id', companyId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Erro ao buscar pesquisas:', error);
            setSurveys([]);
            setLoadingSurveys(false);
            return [];
        } else if (data) {
            const fetchedSurveys: Survey[] = data.map(s => ({
                id: s.id,
                title: s.title,
                companyId: s.company_id,
                questions: s.questions.map((q: any) => ({
                    id: q.id,
                    text: q.text,
                    type: q.type,
                    options: q.options || undefined,
                })).sort((a, b) => (a.position || 0) - (b.position || 0)),
                responseCount: s.survey_responses[0]?.count || 0, // Extrai a contagem de respostas
            }));
            setSurveys(fetchedSurveys);
            setLoadingSurveys(false);
            return fetchedSurveys;
        }
        setLoadingSurveys(false);
        return [];
    }, []);

    const fetchSurveyResponses = useCallback(async (surveyId: string) => {
        const { data, error } = await supabase
            .from('survey_responses')
            .select(`
                id,
                survey_id,
                respondent_id,
                created_at,
                answers (
                    question_id,
                    value
                )
            `)
            .eq('survey_id', surveyId);

        if (error) {
            console.error('Erro ao buscar respostas da pesquisa:', error);
            setSurveyResponses([]);
            return;
        }

        if (data) {
            const fetchedResponses: SurveyResponse[] = data.map(r => ({
                id: r.id,
                surveyId: r.survey_id,
                answers: r.answers.map((a: any) => ({
                    questionId: a.question_id,
                    value: a.value,
                })),
            }));
            setSurveyResponses(fetchedResponses);
        }
    }, []);

    const fetchTemplates = useCallback(async () => {
        const { data, error } = await supabase
            .from('survey_templates')
            .select('id, title, questions');

        if (error) {
            console.error('Erro ao buscar templates de pesquisa:', error);
            return;
        }

        if (data) {
            const fetchedTemplates: Survey[] = data.map(template => ({
                id: template.id,
                title: template.title,
                companyId: '', // Templates não têm companyId diretamente
                questions: template.questions as Question[],
            }));
            setTemplates(fetchedTemplates);
        }
    }, []);

    useEffect(() => {
        fetchTemplates();
    }, [fetchTemplates]);

    useEffect(() => {
        if (currentCompany?.id) {
            fetchSurveys(currentCompany.id);
        } else {
            setSurveys([]);
            setLoadingSurveys(false);
        }
    }, [currentCompany?.id, fetchSurveys]);

    const handleSaveSurvey = useCallback(async (surveyData: Survey, editingSurveyId?: string) => {
        if (!currentUser || !currentCompany) {
            showError('Usuário ou empresa não identificados.');
            return;
        }

        let targetSurveyId = editingSurveyId;

        if (editingSurveyId) {
            // Atualizar pesquisa existente
            const { error: surveyUpdateError } = await supabase
                .from('surveys')
                .update({ title: surveyData.title })
                .eq('id', editingSurveyId);

            if (surveyUpdateError) {
                showError('Erro ao atualizar a pesquisa: ' + surveyUpdateError.message);
                console.error('Erro ao atualizar pesquisa:', surveyUpdateError);
                return;
            }

            // Excluir perguntas existentes
            const { error: deleteQuestionsError } = await supabase
                .from('questions')
                .delete()
                .eq('survey_id', editingSurveyId);

            if (deleteQuestionsError) {
                showError('Erro ao remover perguntas antigas: ' + deleteQuestionsError.message);
                console.error('Erro ao remover perguntas antigas:', deleteQuestionsError);
                return;
            }

            // Inserir novas/atualizadas perguntas
            const questionsToInsert = surveyData.questions.map((q, index) => ({
                survey_id: editingSurveyId,
                text: q.text,
                type: q.type,
                options: q.options || null,
                position: index,
            }));

            const { error: insertQuestionsError } = await supabase
                .from('questions')
                .insert(questionsToInsert);

            if (insertQuestionsError) {
                showError('Erro ao inserir novas perguntas: ' + insertQuestionsError.message);
                console.error('Erro ao inserir novas perguntas:', insertQuestionsError);
                return;
            }

            showSuccess('Pesquisa atualizada com sucesso!');

        } else {
            // Criar nova pesquisa
            const { data: newSurvey, error: surveyInsertError } = await supabase
                .from('surveys')
                .insert({
                    title: surveyData.title,
                    company_id: currentCompany.id,
                    created_by: currentUser.id,
                })
                .select()
                .single();

            if (surveyInsertError) {
                showError('Erro ao criar a pesquisa: ' + surveyInsertError.message);
                console.error('Erro ao criar pesquisa:', surveyInsertError);
                return;
            }

            if (newSurvey) {
                targetSurveyId = newSurvey.id; // Define o ID da nova pesquisa
                const questionsToInsert = surveyData.questions.map((q, index) => ({
                    survey_id: newSurvey.id,
                    text: q.text,
                    type: q.type,
                    options: q.options || null,
                    position: index,
                }));

                const { error: questionsInsertError } = await supabase
                    .from('questions')
                    .insert(questionsToInsert);

                if (questionsInsertError) {
                    showError('Erro ao inserir perguntas da pesquisa: ' + questionsInsertError.message);
                    console.error('Erro ao inserir perguntas:', questionsInsertError);
                    return;
                }
                showSuccess('Pesquisa criada com sucesso!');
            }
        }

        // Buscar a pesquisa específica atualizada e atualizar o estado
        if (targetSurveyId && currentCompany?.id) {
            const { data: updatedSurveyData, error: fetchSingleError } = await supabase
                .from('surveys')
                .select(`
                    id,
                    title,
                    company_id,
                    created_by,
                    created_at,
                    questions (
                        id,
                        text,
                        type,
                        options,
                        position
                    ),
                    survey_responses(count)
                `)
                .eq('id', targetSurveyId)
                .single();

            if (fetchSingleError) {
                console.error('Erro ao buscar pesquisa única atualizada:', fetchSingleError);
                // Fallback para buscar todas as pesquisas se a busca única falhar
                await fetchSurveys(currentCompany.id);
                return;
            }

            if (updatedSurveyData) {
                const updatedSurvey: Survey = {
                    id: updatedSurveyData.id,
                    title: updatedSurveyData.title,
                    companyId: updatedSurveyData.company_id,
                    questions: updatedSurveyData.questions.map((q: any) => ({
                        id: q.id,
                        text: q.text,
                        type: q.type,
                        options: q.options || undefined,
                    })).sort((a, b) => (a.position || 0) - (b.position || 0)),
                    responseCount: updatedSurveyData.survey_responses[0]?.count || 0,
                };

                setSurveys(prevSurveys => {
                    const existingIndex = prevSurveys.findIndex(s => s.id === updatedSurvey.id);
                    if (existingIndex > -1) {
                        // Atualiza a pesquisa existente no array
                        const newSurveys = [...prevSurveys];
                        newSurveys[existingIndex] = updatedSurvey;
                        return newSurveys;
                    } else {
                        // Adiciona a nova pesquisa ao array (para criação de nova pesquisa)
                        return [updatedSurvey, ...prevSurveys];
                    }
                });
            }
        }
    }, [currentUser, currentCompany, fetchSurveys]);

    const handleDeleteSurvey = useCallback(async (surveyId: string) => {
        if (window.confirm('Tem certeza que deseja excluir esta pesquisa? Todas as perguntas e respostas associadas também serão excluídas.')) {
            const { error } = await supabase
                .from('surveys')
                .delete()
                .eq('id', surveyId);

            if (error) {
                showError('Erro ao excluir a pesquisa: ' + error.message);
                console.error('Erro ao excluir pesquisa:', error);
            } else {
                showSuccess('Pesquisa excluída com sucesso!');
                // Atualiza o estado de surveys removendo a pesquisa excluída
                setSurveys(prevSurveys => prevSurveys.filter(s => s.id !== surveyId));
            }
        }
    }, []);

    const handleSaveResponse = useCallback(async (answers: Answer[], selectedSurvey: Survey, currentUser: User): Promise<boolean> => {
        console.log('useSurveys: handleSaveResponse: Iniciando salvamento da resposta.');
        if (!selectedSurvey || !currentUser) {
            showError('Usuário ou pesquisa não identificados para salvar a resposta.');
            console.error('useSurveys: handleSaveResponse: Usuário ou pesquisa não identificados.', { selectedSurvey, currentUser });
            return false;
        }

        // --- Client-side validation for required fields ---
        const missingAnswers = selectedSurvey.questions.filter(q => {
            const answer = answers.find(a => a.questionId === q.id);
            if (!answer || answer.value === null || answer.value === undefined) {
                return true; // No answer provided or value is null/undefined
            }

            // Check for empty values based on question type
            if (typeof answer.value === 'string' && answer.value.trim() === '') return true;
            if (Array.isArray(answer.value) && answer.value.length === 0) return true;
            
            return false;
        });

        if (missingAnswers.length > 0) {
            const missingQuestionTexts = missingAnswers.map(q => q.text).join(', ');
            showError(`Por favor, responda a todas as perguntas obrigatórias: ${missingQuestionTexts}`);
            console.error('useSurveys: handleSaveResponse: Perguntas obrigatórias não respondidas:', missingAnswers);
            return false;
        }
        // --- End client-side validation ---

        console.log('useSurveys: handleSaveResponse: Tentando inserir em survey_responses para surveyId:', selectedSurvey.id, 'respondentId:', currentUser.id);
        const { data: newResponse, error: responseError } = await supabase
            .from('survey_responses')
            .insert({
                survey_id: selectedSurvey.id,
                respondent_id: currentUser.id,
            })
            .select()
            .single();

        if (responseError) {
            showError('Erro ao enviar a resposta da pesquisa: ' + responseError.message);
            console.error('useSurveys: handleSaveResponse: Erro ao inserir survey_responses:', responseError);
            return false;
        }
        console.log('useSurveys: handleSaveResponse: Resposta principal inserida com sucesso:', newResponse);

        if (newResponse) {
            const answersToInsert = answers.map(a => ({
                response_id: newResponse.id,
                question_id: a.questionId,
                value: a.value,
            }));
            console.log('useSurveys: handleSaveResponse: Respostas detalhadas a serem inseridas:', answersToInsert);

            const { error: answersError } = await supabase
                .from('answers')
                .insert(answersToInsert);

            if (answersError) {
                showError('Erro ao salvar as respostas detalhadas: ' + answersError.message);
                console.error('useSurveys: handleSaveResponse: Erro ao inserir answers:', answersError);
                return false;
            }
            console.log('useSurveys: handleSaveResponse: Respostas detalhadas inseridas com sucesso.');
            
            // Após salvar uma resposta, atualize a contagem de respostas para a pesquisa na lista
            if (currentCompany?.id) {
                await fetchSurveys(currentCompany.id);
                await fetchSurveyResponses(selectedSurvey.id); // <--- Adicionado para atualizar o dashboard
            }
            return true;
        }
        console.error('useSurveys: handleSaveResponse: newResponse foi nulo após a inserção, mas nenhum erro foi reportado.');
        return false;
    }, [currentCompany?.id, fetchSurveys, fetchSurveyResponses]);

    return {
        surveys,
        surveyResponses,
        templates,
        loadingSurveys,
        fetchSurveys,
        fetchSurveyResponses,
        handleSaveSurvey,
        handleDeleteSurvey,
        handleSaveResponse,
    };
};