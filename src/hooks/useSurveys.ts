import { useState, useEffect, useCallback } from 'react';
import { Survey, SurveyResponse, Question, Answer, Company, User } from '@/types';
import { supabase } from '@/src/integrations/supabase/client';
import { showSuccess, showError } from '@/src/utils/toast'; // Importar showSuccess e showError
import { logActivity } from '@/src/utils/logger'; // Importar o utilitário de log

interface UseSurveysReturn {
    surveys: Survey[];
    surveyResponses: SurveyResponse[];
    templates: Survey[];
    loadingSurveys: boolean;
    fetchSurveys: (companyId: string) => Promise<Survey[]>;
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

    // fetchSurveys agora é estável. currentUser é acessado do closure para fins de log.
    const fetchSurveys = useCallback(async (companyId: string): Promise<Survey[]> => {
        setLoadingSurveys(true);
        console.log('useSurveys: fetchSurveys - Iniciando busca de pesquisas para companyId:', companyId);
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
                survey_responses(*)
            `)
            .eq('company_id', companyId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('useSurveys: fetchSurveys - Erro ao buscar pesquisas:', error);
            logActivity('ERROR', `Erro ao buscar pesquisas para a empresa ${companyId}: ${error.message}`, 'SURVEYS', currentUser?.id, currentUser?.email, companyId);
            setSurveys([]);
            setLoadingSurveys(false);
            return [];
        } else if (data) {
            console.log('useSurveys: fetchSurveys - Dados de pesquisas recebidos:', data);
            const fetchedSurveys: Survey[] = data.map((s: any) => ({ // Adicionado 'any' para tipagem temporária
                id: s.id,
                title: s.title,
                companyId: s.company_id,
                questions: s.questions.map((q: any) => ({
                    id: q.id,
                    text: q.text,
                    type: q.type,
                    options: q.options || undefined,
                    position: q.position || 0, // Adicionado position
                })).sort((a, b) => (a.position || 0) - (b.position || 0)),
                responseCount: s.survey_responses ? s.survey_responses.length : 0,
            }));
            console.log('useSurveys: fetchSurveys - Pesquisas processadas e definidas:', fetchedSurveys);
            logActivity('INFO', `Pesquisas carregadas para a empresa ${companyId}.`, 'SURVEYS', currentUser?.id, currentUser?.email, companyId);
            setSurveys(fetchedSurveys);
            setLoadingSurveys(false);
            return fetchedSurveys;
        }
        setLoadingSurveys(false);
        console.log('useSurveys: fetchSurveys - Nenhuma pesquisa encontrada ou erro. loadingSurveys = false.');
        return [];
    }, []); // Dependência vazia para estabilidade

    // fetchSurveyResponses agora é estável. currentUser e currentCompany são acessados do closure para fins de log.
    const fetchSurveyResponses = useCallback(async (surveyId: string) => {
        console.log('useSurveys: fetchSurveyResponses - Iniciando busca de respostas para surveyId:', surveyId);
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
            console.error('useSurveys: fetchSurveyResponses - Erro ao buscar respostas:', error);
            logActivity('ERROR', `Erro ao buscar respostas para a pesquisa ${surveyId}: ${error.message}`, 'SURVEYS', currentUser?.id, currentUser?.email, currentCompany?.id);
            setSurveyResponses([]);
            return;
        }

        if (data) {
            console.log('useSurveys: fetchSurveyResponses - Dados de respostas recebidos:', data);
            const fetchedResponses: SurveyResponse[] = data.map(r => ({
                id: r.id,
                surveyId: r.survey_id,
                answers: r.answers.map((a: any) => ({
                    questionId: a.question_id,
                    value: a.value,
                })),
            }));
            console.log('useSurveys: fetchSurveyResponses - Respostas processadas e definidas:', fetchedResponses);
            logActivity('INFO', `Respostas carregadas para a pesquisa ${surveyId}.`, 'SURVEYS', currentUser?.id, currentUser?.email, currentCompany?.id);
            setSurveyResponses(fetchedResponses);
        } else {
            console.log('useSurveys: fetchSurveyResponses - Nenhuma resposta recebida, definindo surveyResponses como array vazio.');
            logActivity('INFO', `Nenhuma resposta encontrada para a pesquisa ${surveyId}.`, 'SURVEYS', currentUser?.id, currentUser?.email, currentCompany?.id);
            setSurveyResponses([]);
        }
    }, []); // Dependência vazia para estabilidade

    // fetchTemplates agora é estável. currentUser e currentCompany são acessados do closure para fins de log.
    const fetchTemplates = useCallback(async () => {
        console.log('useSurveys: fetchTemplates - Iniciando busca de templates.');
        const { data, error } = await supabase
            .from('survey_templates')
            .select('id, title, questions');

        if (error) {
            console.error('useSurveys: fetchTemplates - Erro ao buscar templates:', error);
            logActivity('ERROR', `Erro ao buscar templates de pesquisa: ${error.message}`, 'SURVEYS', currentUser?.id, currentUser?.email, currentCompany?.id);
            return;
        }

        if (data) {
            console.log('useSurveys: fetchTemplates - Dados de templates recebidos:', data);
            const fetchedTemplates: Survey[] = data.map(template => ({
                id: template.id,
                title: template.title,
                companyId: '', // Templates não têm companyId diretamente
                questions: template.questions as Question[],
            }));
            setTemplates(fetchedTemplates);
            logActivity('INFO', `Templates de pesquisa carregados.`, 'SURVEYS', currentUser?.id, currentUser?.email, currentCompany?.id);
            console.log('useSurveys: fetchTemplates - Templates processados e definidos:', fetchedTemplates);
        }
    }, []); // Dependência vazia para estabilidade

    useEffect(() => {
        fetchTemplates();
    }, [fetchTemplates]); // fetchTemplates agora é estável, este useEffect só roda uma vez.

    useEffect(() => {
        console.log('useSurveys: useEffect - currentCompany.id mudou:', currentCompany?.id);
        if (currentCompany?.id) {
            console.log('useSurveys: currentCompany.id presente, buscando pesquisas.');
            fetchSurveys(currentCompany.id);
        } else {
            console.log('useSurveys: currentCompany.id é nulo, limpando pesquisas.');
            setSurveys([]);
            setLoadingSurveys(false);
        }
    }, [currentCompany?.id, fetchSurveys]); // fetchSurveys agora é estável, este useEffect só roda quando currentCompany.id muda.

    const handleSaveSurvey = useCallback(async (surveyData: Survey, editingSurveyId?: string) => {
        if (!currentUser || !currentCompany) {
            showError('Usuário ou empresa não identificados para salvar a pesquisa.');
            console.error('useSurveys: handleSaveSurvey - Usuário ou empresa ausentes.');
            logActivity('ERROR', `Tentativa de salvar pesquisa sem usuário ou empresa identificados.`, 'SURVEYS', currentUser?.id, currentUser?.email, currentCompany?.id);
            return;
        }

        let targetSurveyId = editingSurveyId;

        if (editingSurveyId) {
            console.log('useSurveys: handleSaveSurvey - Atualizando pesquisa existente:', editingSurveyId);
            // Atualizar pesquisa existente
            const { error: surveyUpdateError } = await supabase
                .from('surveys')
                .update({ title: surveyData.title })
                .eq('id', editingSurveyId);

            if (surveyUpdateError) {
                showError('Erro ao atualizar a pesquisa: ' + surveyUpdateError.message);
                console.error('useSurveys: handleSaveSurvey - Erro ao atualizar pesquisa:', surveyUpdateError);
                logActivity('ERROR', `Erro ao atualizar pesquisa '${surveyData.title}' (ID: ${editingSurveyId}): ${surveyUpdateError.message}`, 'SURVEYS', currentUser.id, currentUser.email, currentCompany.id);
                return;
            }

            // Excluir perguntas existentes
            const { error: deleteQuestionsError } = await supabase
                .from('questions')
                .delete()
                .eq('survey_id', editingSurveyId);

            if (deleteQuestionsError) {
                showError('Erro ao remover perguntas antigas: ' + deleteQuestionsError.message);
                console.error('useSurveys: handleSaveSurvey - Erro ao remover perguntas antigas:', deleteQuestionsError);
                logActivity('ERROR', `Erro ao remover perguntas antigas da pesquisa '${surveyData.title}' (ID: ${editingSurveyId}): ${deleteQuestionsError.message}`, 'SURVEYS', currentUser.id, currentUser.email, currentCompany.id);
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
            console.log('useSurveys: handleSaveSurvey - Inserindo novas/atualizadas perguntas:', questionsToInsert);

            const { error: insertQuestionsError } = await supabase
                .from('questions')
                .insert(questionsToInsert);

            if (insertQuestionsError) {
                showError('Erro ao inserir novas perguntas: ' + insertQuestionsError.message);
                console.error('useSurveys: handleSaveSurvey - Erro ao inserir novas perguntas:', insertQuestionsError);
                logActivity('ERROR', `Erro ao inserir novas perguntas para a pesquisa '${surveyData.title}' (ID: ${editingSurveyId}): ${insertQuestionsError.message}`, 'SURVEYS', currentUser.id, currentUser.email, currentCompany.id);
                return;
            }

            showSuccess('Pesquisa atualizada com sucesso!');
            logActivity('INFO', `Pesquisa '${surveyData.title}' (ID: ${editingSurveyId}) atualizada com sucesso.`, 'SURVEYS', currentUser.id, currentUser.email, currentCompany.id);

        } else {
            console.log('useSurveys: handleSaveSurvey - Criando nova pesquisa.');
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
                console.error('useSurveys: handleSaveSurvey - Erro ao criar pesquisa:', surveyInsertError);
                logActivity('ERROR', `Erro ao criar nova pesquisa '${surveyData.title}': ${surveyInsertError.message}`, 'SURVEYS', currentUser.id, currentUser.email, currentCompany.id);
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
                console.log('useSurveys: handleSaveSurvey - Inserindo perguntas para nova pesquisa:', questionsToInsert);

                const { error: questionsInsertError } = await supabase
                    .from('questions')
                    .insert(questionsToInsert);

                if (questionsInsertError) {
                    showError('Erro ao inserir perguntas da pesquisa: ' + questionsInsertError.message);
                    console.error('useSurveys: handleSaveSurvey - Erro ao inserir perguntas:', questionsInsertError);
                    logActivity('ERROR', `Erro ao inserir perguntas para a nova pesquisa '${surveyData.title}' (ID: ${newSurvey.id}): ${questionsInsertError.message}`, 'SURVEYS', currentUser.id, currentUser.email, currentCompany.id);
                    return;
                }
                showSuccess('Pesquisa criada com sucesso!');
                logActivity('INFO', `Nova pesquisa '${surveyData.title}' (ID: ${newSurvey.id}) criada com sucesso.`, 'SURVEYS', currentUser.id, currentUser.email, currentCompany.id);
            }
        }

        // Buscar a pesquisa específica atualizada e atualizar o estado
        if (targetSurveyId && currentCompany?.id) {
            console.log('useSurveys: handleSaveSurvey - Buscando pesquisa única atualizada para ID:', targetSurveyId);
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
                    survey_responses(*)
                `)
                .eq('id', targetSurveyId)
                .single();

            if (fetchSingleError) {
                console.error('useSurveys: handleSaveSurvey - Erro ao buscar pesquisa única atualizada:', fetchSingleError);
                logActivity('ERROR', `Erro ao buscar pesquisa única atualizada (ID: ${targetSurveyId}): ${fetchSingleError.message}`, 'SURVEYS', currentUser?.id, currentUser?.email, currentCompany.id);
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
                        position: q.position || 0, // Adicionado position
                    })).sort((a, b) => (a.position || 0) - (b.position || 0)),
                    responseCount: updatedSurveyData.survey_responses ? updatedSurveyData.survey_responses.length : 0,
                };
                console.log('useSurveys: handleSaveSurvey - Dados da pesquisa atualizada:', updatedSurvey);

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
    }, [currentUser, currentCompany, fetchSurveys, showSuccess, showError, setSurveys]);

    const handleDeleteSurvey = useCallback(async (surveyId: string) => {
        if (window.confirm('Tem certeza que deseja excluir esta pesquisa? Todas as perguntas e respostas associadas também serão excluídas.')) {
            console.log('useSurveys: handleDeleteSurvey - Excluindo pesquisa ID:', surveyId);
            const { error } = await supabase
                .from('surveys')
                .delete()
                .eq('id', surveyId);

            if (error) {
                showError('Erro ao excluir a pesquisa: ' + error.message);
                console.error('useSurveys: handleDeleteSurvey - Erro ao excluir pesquisa:', error);
                logActivity('ERROR', `Erro ao excluir pesquisa (ID: ${surveyId}): ${error.message}`, 'SURVEYS', currentUser?.id, currentUser?.email, currentCompany?.id);
            } else {
                showSuccess('Pesquisa excluída com sucesso!');
                // Atualiza o estado de surveys removendo a pesquisa excluída
                setSurveys(prevSurveys => prevSurveys.filter(s => s.id !== surveyId));
                logActivity('INFO', `Pesquisa (ID: ${surveyId}) excluída com sucesso.`, 'SURVEYS', currentUser?.id, currentUser?.email, currentCompany?.id);
                console.log('useSurveys: handleDeleteSurvey - Pesquisa excluída com sucesso.');
            }
        }
    }, [showSuccess, showError, currentUser, currentCompany, setSurveys]);

    const handleSaveResponse = useCallback(async (answers: Answer[], selectedSurvey: Survey, currentUser: User): Promise<boolean> => {
        console.log('useSurveys: handleSaveResponse - Iniciando salvamento da resposta.');
        if (!selectedSurvey || !currentUser) {
            console.error('useSurveys: handleSaveResponse - Usuário ou pesquisa não identificados.', { selectedSurvey, currentUser });
            showError('Usuário ou pesquisa não identificados para salvar a resposta.');
            logActivity('ERROR', `Tentativa de salvar resposta sem pesquisa ou usuário identificados.`, 'SURVEY_RESPONSES', currentUser?.id, currentUser?.email, currentCompany?.id);
            console.log('useSurveys: handleSaveResponse - Retornando FALSE devido a dados ausentes.');
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
            console.error('useSurveys: handleSaveResponse - Perguntas obrigatórias não respondidas:', missingAnswers);
            showError(`Por favor, responda a todas as perguntas obrigatórias: ${missingQuestionTexts}`);
            logActivity('WARN', `Tentativa de salvar resposta com campos obrigatórios ausentes para pesquisa '${selectedSurvey.title}'. Perguntas: ${missingQuestionTexts}`, 'SURVEY_RESPONSES', currentUser.id, currentUser.email, currentCompany?.id);
            console.log('useSurveys: handleSaveResponse - Retornando FALSE devido a validação de campos obrigatórios.');
            return false;
        }
        // --- End client-side validation ---

        console.log('useSurveys: handleSaveResponse - Tentando inserir em survey_responses para surveyId:', selectedSurvey.id, 'respondentId:', currentUser.id);
        const { data: newResponse, error: responseError } = await supabase
            .from('survey_responses')
            .insert({
                survey_id: selectedSurvey.id,
                respondent_id: currentUser.id,
            })
            .select()
            .single();

        if (responseError) {
            console.error('useSurveys: handleSaveResponse - Erro ao inserir survey_responses:', responseError);
            showError('Erro ao enviar a resposta da pesquisa: ' + responseError.message);
            logActivity('ERROR', `Erro ao inserir resposta principal para pesquisa '${selectedSurvey.title}': ${responseError.message}`, 'SURVEY_RESPONSES', currentUser.id, currentUser.email, currentCompany?.id);
            console.log('useSurveys: handleSaveResponse - Retornando FALSE devido a erro na inserção da resposta principal.');
            return false;
        }
        console.log('useSurveys: handleSaveResponse - Resposta principal inserida com sucesso:', newResponse);

        if (newResponse) {
            const answersToInsert = answers.map(a => ({
                response_id: newResponse.id,
                question_id: a.questionId,
                value: a.value,
            }));
            console.log('useSurveys: handleSaveResponse - Respostas detalhadas a serem inseridas:', answersToInsert);

            const { error: answersError } = await supabase
                .from('answers')
                .insert(answersToInsert);

            if (answersError) {
                console.error('useSurveys: handleSaveResponse - Erro ao inserir answers:', answersError);
                showError('Erro ao salvar as respostas detalhadas: ' + answersError.message);
                logActivity('ERROR', `Erro ao inserir respostas detalhadas para pesquisa '${selectedSurvey.title}' (Resposta ID: ${newResponse.id}): ${answersError.message}`, 'SURVEY_RESPONSES', currentUser.id, currentUser.email, currentCompany?.id);
                console.log('useSurveys: handleSaveResponse - Retornando FALSE devido a erro na inserção das respostas detalhadas.');
                return false;
            }
            console.log('useSurveys: handleSaveResponse - Respostas detalhadas inseridas com sucesso.');
            
            // Após salvar uma resposta, atualize a contagem de respostas para a pesquisa na lista E no dashboard
            if (currentCompany?.id) {
                console.log('useSurveys: handleSaveResponse - Chamando fetchSurveys e fetchSurveyResponses para atualizar contagens e dados do painel.');
                // await fetchSurveys(currentCompany.id); // TEMPORARILY COMMENTED OUT FOR DIAGNOSIS
                // await fetchSurveyResponses(selectedSurvey.id); // TEMPORARILY COMMENTED OUT FOR DIAGNOSIS
            }
            showSuccess('Resposta enviada com sucesso!');
            logActivity('INFO', `Resposta enviada com sucesso para pesquisa '${selectedSurvey.title}' (Resposta ID: ${newResponse.id}).`, 'SURVEY_RESPONSES', currentUser.id, currentUser.email, currentCompany?.id);
            console.log('useSurveys: handleSaveResponse - Retornando TRUE - sucesso total.');
            return true;
        }
        console.error('useSurveys: handleSaveResponse - newResponse foi nulo após a inserção, mas nenhum erro foi reportado.');
        logActivity('ERROR', `newResponse foi nulo após a inserção da resposta principal para pesquisa '${selectedSurvey.title}'.`, 'SURVEY_RESPONSES', currentUser.id, currentUser.email, currentCompany?.id);
        console.log('useSurveys: handleSaveResponse - Retornando FALSE - newResponse nulo.');
        return false;
    }, [currentCompany?.id, fetchSurveys, fetchSurveyResponses, showSuccess, showError, currentUser]);

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