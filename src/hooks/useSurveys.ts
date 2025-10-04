import { useState, useEffect, useCallback } from 'react';
import { Survey, SurveyResponse, Question, Answer, Company, User, RawSurveyData, UserRole } from '@/types';
import { supabase } from '@/src/integrations/supabase/client';
import { showSuccess, showError } from '@/src/utils/toast';
import { logActivity } from '@/src/utils/logger';

interface UseSurveysReturn {
    surveys: Survey[];
    surveyResponses: SurveyResponse[];
    templates: Survey[];
    loadingSurveys: boolean;
    fetchSurveys: (companyId: string | undefined) => Promise<Survey[]>;
    fetchSurveyResponses: (surveyId: string) => Promise<void>;
    handleSaveSurvey: (surveyData: Survey, editingSurveyId?: string) => Promise<void>;
    handleDeleteSurvey: (surveyId: string) => Promise<boolean>; // Retorna Promise<boolean>
    handleSaveResponse: (answers: Answer[], selectedSurvey: Survey, currentUser: User) => Promise<boolean>;
    handleSaveTemplate: (templateData: Survey, editingTemplateId?: string) => Promise<void>;
    handleDeleteTemplate: (templateId: string) => Promise<boolean>;
}

export const useSurveys = (currentCompany: Company | null, currentUser: User | null): UseSurveysReturn => {
    const [surveys, setSurveys] = useState<Survey[]>([]);
    const [surveyResponses, setSurveyResponses] = useState<SurveyResponse[]>([]);
    const [templates, setTemplates] = useState<Survey[]>([]);
    const [loadingSurveys, setLoadingSurveys] = useState(true);

    const fetchSurveys = useCallback(async (companyId: string | undefined): Promise<Survey[]> => {
        setLoadingSurveys(true);
        console.log('useSurveys: fetchSurveys - Iniciando busca de pesquisas para companyId:', companyId, 'e currentUser.role:', currentUser?.role);
        
        let query = supabase
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
                survey_responses(*),
                companies (name),
                profiles (full_name)
            `)
            .order('created_at', { ascending: false });

        if (currentUser?.role !== UserRole.DEVELOPER && companyId) {
            query = query.eq('company_id', companyId);
        } else if (currentUser?.role === UserRole.DEVELOPER) {
            console.log('useSurveys: fetchSurveys - Current user is DEVELOPER, fetching all surveys (no company_id filter).');
            // RLS policy for developers already allows all surveys, so no additional filter needed here.
        } else {
            // If not a developer and no companyId, return empty.
            console.log('useSurveys: fetchSurveys - No companyId and not a developer, returning empty array.');
            setSurveys([]);
            setLoadingSurveys(false);
            return [];
        }
        
        const { data, error } = await query;

        if (error) {
            console.error('useSurveys: fetchSurveys - Erro ao buscar pesquisas:', error);
            logActivity('ERROR', `Erro ao buscar pesquisas para a empresa ${companyId}: ${error.message}`, 'SURVEYS', currentUser?.id, currentUser?.email, currentCompany?.id);
            setSurveys([]);
            setLoadingSurveys(false);
            return [];
        } else if (data) {
            console.log('useSurveys: fetchSurveys - RAW data received from Supabase for companyId:', companyId, data);
            const fetchedSurveys: Survey[] = (data as RawSurveyData[]).map((s) => ({
                id: s.id,
                title: s.title,
                companyId: s.company_id,
                created_by: s.created_by,
                created_at: s.created_at,
                questions: s.questions.map((q: any) => ({
                    id: q.id,
                    text: q.text,
                    type: q.type,
                    options: q.options || undefined,
                    position: q.position || 0,
                })).sort((a: Question, b: Question) => (a.position || 0) - (b.position || 0)),
                responseCount: s.survey_responses ? s.survey_responses.length : 0,
                companyName: s.companies && s.companies.length > 0 ? s.companies[0].name : 'N/A',
                createdByName: s.profiles && s.profiles.length > 0 ? s.profiles[0].full_name : 'Usuário Desconhecido'
            }));
            console.log('useSurveys: fetchSurveys - Processed surveys for companyId:', companyId, fetchedSurveys);
            logActivity('INFO', `Pesquisas carregadas para a empresa ${companyId}.`, 'SURVEYS', currentUser?.id, currentUser?.email, companyId);
            setSurveys(fetchedSurveys);
            setLoadingSurveys(false);
            return fetchedSurveys;
        }
        setLoadingSurveys(false);
        console.log('useSurveys: fetchSurveys - Nenhuma pesquisa encontrada ou erro para companyId:', companyId, 'loadingSurveys = false.');
        return [];
    }, [currentUser, currentCompany]);

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
                answers: r.answers.map((a: { question_id: string; value: string | number | string[] }) => ({
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
    }, []);

    const fetchTemplates = useCallback(async () => {
        console.log('useSurveys: fetchTemplates - Iniciando busca de templates.');
        const { data, error } = await supabase
            .from('survey_templates')
            .select('id, title, questions');

        if (error) {
            console.error('useSurveys: fetchTemplates - Erro ao buscar templates:', error);
            logActivity('ERROR', `Erro ao buscar templates de pesquisa: ${error.message}`, 'SURVEY_TEMPLATES', currentUser?.id, currentUser?.email, currentCompany?.id);
            return;
        }

        if (data) {
            console.log('useSurveys: fetchTemplates - Dados de templates recebidos:', data);
            const fetchedTemplates: Survey[] = data.map(template => ({
                id: template.id,
                title: template.title,
                companyId: '', // Templates não têm companyId
                questions: template.questions as Question[],
            }));
            setTemplates(fetchedTemplates);
            logActivity('INFO', `Templates de pesquisa carregados.`, 'SURVEY_TEMPLATES', currentUser?.id, currentUser?.email, currentCompany?.id);
            console.log('useSurveys: fetchTemplates - Templates processados e definidos:', fetchedTemplates);
        }
    }, [currentUser, currentCompany]);

    useEffect(() => {
        fetchTemplates();
    }, [fetchTemplates]);

    useEffect(() => {
        console.log('useSurveys: useEffect - currentCompany.id mudou:', currentCompany?.id, 'currentUser.role:', currentUser?.role);
        const currentCompanyId = currentUser?.role === UserRole.DEVELOPER ? undefined : currentCompany?.id;
        fetchSurveys(currentCompanyId);

        // Setup real-time subscription for surveys
        const channel = supabase
            .channel('public:surveys')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'surveys' }, payload => {
                console.log('useSurveys: Real-time event received for surveys:', payload);
                // Re-fetch surveys to update the list
                fetchSurveys(currentCompanyId);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentCompany?.id, currentUser?.role, fetchSurveys]);

    const handleSaveSurvey = useCallback(async (surveyData: Survey, editingSurveyId?: string) => {
        try {
            if (!currentUser) {
                showError('Usuário não identificado para salvar a pesquisa.');
                console.error('useSurveys: handleSaveSurvey - Usuário ausente.');
                // Fix: Explicitly pass undefined for userId and userEmail when currentUser is null
                logActivity('ERROR', `Tentativa de salvar pesquisa sem usuário identificado.`, 'SURVEYS', undefined, undefined, currentCompany?.id);
                return;
            }

            // Determine the company_id for the survey.
            // It MUST be present because the DB column is NOT NULL.
            const surveyCompanyId = currentUser.company_id;

            if (!surveyCompanyId) {
                showError('Você precisa estar vinculado a uma empresa para criar ou editar pesquisas.');
                console.error('useSurveys: handleSaveSurvey - company_id ausente para o usuário.');
                logActivity('ERROR', `Tentativa de salvar pesquisa sem company_id para o usuário.`, 'SURVEYS', currentUser?.id, currentUser?.email, currentCompany?.id);
                return;
            }

            if (editingSurveyId) {
                console.log('useSurveys: handleSaveSurvey - Atualizando pesquisa existente:', editingSurveyId);
                const { error: surveyUpdateError } = await supabase
                    .from('surveys')
                    .update({ title: surveyData.title, company_id: surveyCompanyId }) // Ensure company_id is updated if needed
                    .eq('id', editingSurveyId);

                if (surveyUpdateError) {
                    throw surveyUpdateError; // Throw to be caught by the outer try-catch
                }

                const { error: deleteQuestionsError } = await supabase
                    .from('questions')
                    .delete()
                    .eq('survey_id', editingSurveyId);

                if (deleteQuestionsError) {
                    throw deleteQuestionsError; // Throw to be caught by the outer try-catch
                }

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
                    throw insertQuestionsError; // Throw to be caught by the outer try-catch
                }

                showSuccess('Pesquisa atualizada com sucesso!');
                logActivity('INFO', `Pesquisa '${surveyData.title}' (ID: ${editingSurveyId}) atualizada com sucesso.`, 'SURVEYS', currentUser.id, currentUser.email, currentCompany?.id);

            } else { // Creating new survey
                console.log('useSurveys: handleSaveSurvey - Criando nova pesquisa.');
                console.log('useSurveys: handleSaveSurvey - Inserting with company_id:', surveyCompanyId, 'and created_by:', currentUser.id);
                const { data: newSurvey, error: surveyInsertError } = await supabase
                    .from('surveys')
                    .insert({
                        title: surveyData.title,
                        company_id: surveyCompanyId, // Use the determined company_id
                        created_by: currentUser.id,
                    })
                    .select()
                    .single();

                if (surveyInsertError) {
                    throw surveyInsertError; // Throw to be caught by the outer try-catch
                }

                if (newSurvey) {
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
                        throw questionsInsertError; // Throw to be caught by the outer try-catch
                    }
                    showSuccess('Pesquisa criada com sucesso!');
                    logActivity('INFO', `Nova pesquisa '${surveyData.title}' (ID: ${newSurvey.id}) criada com sucesso.`, 'SURVEYS', currentUser.id, currentUser.email, currentCompany?.id);
                }
            }
        } catch (err: any) {
            console.error('useSurveys: handleSaveSurvey - Erro inesperado durante o salvamento da pesquisa:', err);
            showError('Erro ao salvar a pesquisa: ' + err.message);
            logActivity('ERROR', `Erro inesperado ao salvar pesquisa '${surveyData.title}': ${err.message}`, 'SURVEYS', currentUser?.id, currentUser?.email, currentCompany?.id);
        }
    }, [currentUser, currentCompany?.id, showSuccess, showError]);

    const handleDeleteSurvey = useCallback(async (surveyId: string): Promise<boolean> => {
        console.log('useSurveys: handleDeleteSurvey - Excluindo pesquisa ID:', surveyId);
        const { error } = await supabase
            .from('surveys')
            .delete()
            .eq('id', surveyId);

        if (error) {
            showError('Erro ao excluir a pesquisa: ' + error.message);
            console.error('useSurveys: handleDeleteSurvey - Erro ao excluir pesquisa:', error);
            logActivity('ERROR', `Erro ao excluir pesquisa (ID: ${surveyId}): ${error.message}`, 'SURVEYS', currentUser?.id, currentUser?.email, currentCompany?.id);
            return false;
        } else {
            showSuccess('Pesquisa excluída com sucesso!');
            setSurveys(prevSurveys => prevSurveys.filter(s => s.id !== surveyId));
            logActivity('INFO', `Pesquisa (ID: ${surveyId}) excluída com sucesso.`, 'SURVEYS', currentUser?.id, currentUser?.email, currentCompany?.id);
            console.log('useSurveys: handleDeleteSurvey - Pesquisa excluída com sucesso.');
            return true;
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

        const missingAnswers = selectedSurvey.questions.filter(q => {
            const answer = answers.find(a => a.questionId === q.id);
            if (!answer || answer.value === null || answer.value === undefined) {
                return true;
            }

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
            const answersToInsert = answers.map((a: Answer) => ({
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
            
            if (currentCompany?.id) {
                console.log('useSurveys: handleSaveResponse - Chamando fetchSurveys e fetchSurveyResponses para atualizar contagens e dados do painel.');
                fetchSurveys(currentCompany.id); // Recarregar a lista de pesquisas para atualizar a contagem de respostas
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

    const handleSaveTemplate = useCallback(async (templateData: Survey, editingTemplateId?: string) => {
        if (!currentUser) {
            showError('Usuário não identificado para salvar o modelo.');
            logActivity('ERROR', `Tentativa de salvar modelo sem usuário logado.`, 'SURVEY_TEMPLATES', undefined, undefined, currentCompany?.id);
            return;
        }

        try {
            if (editingTemplateId) {
                // Update existing template
                const { error } = await supabase
                    .from('survey_templates')
                    .update({ title: templateData.title, questions: templateData.questions })
                    .eq('id', editingTemplateId);
                if (error) throw error;
                showSuccess('Modelo atualizado com sucesso!');
                logActivity('INFO', `Modelo '${templateData.title}' (ID: ${editingTemplateId}) atualizado com sucesso.`, 'SURVEY_TEMPLATES', currentUser.id, currentUser.email, currentCompany?.id);
            } else {
                // Create new template
                const { error } = await supabase
                    .from('survey_templates')
                    .insert({ title: templateData.title, questions: templateData.questions });
                if (error) throw error;
                showSuccess('Modelo criado com sucesso!');
                logActivity('INFO', `Novo modelo '${templateData.title}' criado com sucesso.`, 'SURVEY_TEMPLATES', currentUser.id, currentUser.email, currentCompany?.id);
            }
            fetchTemplates(); // Refresh templates list
        } catch (err: any) {
            console.error('Erro ao salvar modelo:', err.message);
            showError('Erro ao salvar modelo: ' + err.message);
            logActivity('ERROR', `Erro ao salvar modelo '${templateData.title}': ${err.message}`, 'SURVEY_TEMPLATES', currentUser.id, currentUser.email, currentCompany?.id);
        }
    }, [currentUser, currentCompany, fetchTemplates, showSuccess, showError]);

    const handleDeleteTemplate = useCallback(async (templateId: string): Promise<boolean> => {
        if (!currentUser) {
            showError('Usuário não identificado para excluir o modelo.');
            logActivity('ERROR', `Tentativa de excluir modelo sem usuário logado.`, 'SURVEY_TEMPLATES', undefined, undefined, currentCompany?.id);
            return false;
        }

        try {
            const { error } = await supabase
                .from('survey_templates')
                .delete()
                .eq('id', templateId);

            if (error) throw error;
            showSuccess('Modelo excluído com sucesso!');
            logActivity('INFO', `Modelo (ID: ${templateId}) excluído com sucesso.`, 'SURVEY_TEMPLATES', currentUser.id, currentUser.email, currentCompany?.id);
            fetchTemplates(); // Refresh templates list
            return true;
        } catch (err: any) {
            console.error('Erro ao excluir modelo:', err.message);
            showError('Erro ao excluir modelo: ' + err.message);
            logActivity('ERROR', `Erro ao excluir modelo (ID: ${templateId}): ${err.message}`, 'SURVEY_TEMPLATES', currentUser.id, currentUser.email, currentCompany?.id);
            return false;
        }
    }, [currentUser, currentCompany, fetchTemplates, showSuccess, showError]);

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
        handleSaveTemplate,
        handleDeleteTemplate,
    };
};