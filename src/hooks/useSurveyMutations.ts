import { useCallback } from 'react';
import { Survey, Answer, User, Company, UserRole } from '@/types';
import { supabase } from '@/src/integrations/supabase/client';
import { showSuccess, showError } from '@/src/utils/toast';
import { logActivity } from '@/src/utils/logger';

interface UseSurveyMutationsProps {
    currentUser: User | null;
    currentCompany: Company | null;
    fetchSurveys: (companyId: string | undefined, user: User | null, company: Company | null) => Promise<Survey[]>;
    fetchSurveyResponses: (surveyId: string) => Promise<void>;
}

interface UseSurveyMutationsReturn {
    handleSaveSurvey: (surveyData: Survey, editingSurveyId?: string) => Promise<void>;
    handleDeleteSurvey: (surveyId: string) => Promise<boolean>;
    handleSaveResponse: (answers: Answer[], selectedSurvey: Survey, currentUser: User) => Promise<boolean>;
}

export const useSurveyMutations = ({ currentUser, currentCompany, fetchSurveys, fetchSurveyResponses }: UseSurveyMutationsProps): UseSurveyMutationsReturn => {

    const handleSaveSurvey = useCallback(async (surveyData: Survey, editingSurveyId?: string) => {
        try {
            if (!currentUser) {
                showError('Usuário não identificado para salvar a pesquisa.');
                console.error('useSurveyMutations: handleSaveSurvey - Usuário ausente.');
                logActivity('ERROR', `Tentativa de salvar pesquisa sem usuário identificado.`, 'SURVEYS', undefined, undefined, currentCompany?.id);
                return;
            }

            const surveyCompanyId = currentUser.company_id;
            console.log('useSurveyMutations: handleSaveSurvey - Usando currentUser.company_id para a pesquisa:', surveyCompanyId);

            if (!surveyCompanyId) {
                showError('Você precisa estar vinculado a uma empresa para criar ou editar pesquisas.');
                console.error('useSurveyMutations: handleSaveSurvey - company_id ausente para o usuário.');
                logActivity('ERROR', `Tentativa de salvar pesquisa sem company_id para o usuário.`, 'SURVEYS', currentUser?.id, currentUser?.email, currentCompany?.id);
                return;
            }

            console.log('useSurveyMutations: handleSaveSurvey - Tentando inserir/atualizar pesquisa com título:', surveyData.title, 'company_id:', surveyCompanyId, 'created_by:', currentUser.id);

            if (editingSurveyId) {
                console.log('useSurveyMutations: handleSaveSurvey - Atualizando pesquisa existente:', editingSurveyId);
                const { error: surveyUpdateError } = await supabase
                    .from('surveys')
                    .update({ title: surveyData.title, company_id: surveyCompanyId })
                    .eq('id', editingSurveyId);

                if (surveyUpdateError) {
                    console.error('useSurveyMutations: handleSaveSurvey - Erro ao atualizar pesquisa:', surveyUpdateError); // Log de erro
                    throw surveyUpdateError;
                }

                const { error: deleteQuestionsError } = await supabase
                    .from('questions')
                    .delete()
                    .eq('survey_id', editingSurveyId);

                if (deleteQuestionsError) {
                    console.error('useSurveyMutations: handleSaveSurvey - Erro ao excluir perguntas antigas:', deleteQuestionsError); // Log de erro
                    throw deleteQuestionsError;
                }

                const questionsToInsert = surveyData.questions.map((q, index) => ({
                    survey_id: editingSurveyId,
                    text: q.text,
                    type: q.type,
                    options: q.options || null,
                    position: index,
                }));
                console.log('useSurveyMutations: handleSaveSurvey - Inserindo novas/atualizadas perguntas:', questionsToInsert);

                const { error: insertQuestionsError } = await supabase
                    .from('questions')
                    .insert(questionsToInsert);

                if (insertQuestionsError) {
                    console.error('useSurveyMutations: handleSaveSurvey - Erro ao inserir novas perguntas:', insertQuestionsError); // Log de erro
                    throw insertQuestionsError;
                }

                showSuccess('Pesquisa atualizada com sucesso!');
                logActivity('INFO', `Pesquisa '${surveyData.title}' (ID: ${editingSurveyId}) atualizada com sucesso.`, 'SURVEYS', currentUser.id, currentUser.email, currentCompany?.id);

            } else {
                console.log('useSurveyMutations: handleSaveSurvey - Criando nova pesquisa.');
                const surveyToInsert = {
                    title: surveyData.title,
                    company_id: surveyCompanyId,
                    created_by: currentUser.id,
                };
                console.log('useSurveyMutations: handleSaveSurvey - Objeto de pesquisa para inserção:', surveyToInsert); // Log do objeto a ser inserido

                const { data: newSurvey, error: surveyInsertError } = await supabase
                    .from('surveys')
                    .insert(surveyToInsert)
                    .select()
                    .single();

                if (surveyInsertError) {
                    console.error('useSurveyMutations: handleSaveSurvey - Erro ao inserir nova pesquisa:', surveyInsertError); // Log de erro
                    throw surveyInsertError;
                }
                console.log('useSurveyMutations: handleSaveSurvey - Nova pesquisa inserida (data):', newSurvey);

                if (newSurvey) {
                    const questionsToInsert = surveyData.questions.map((q, index) => ({
                        survey_id: newSurvey.id,
                        text: q.text,
                        type: q.type,
                        options: q.options || null,
                        position: index,
                    }));
                    console.log('useSurveyMutations: handleSaveSurvey - Inserindo perguntas para nova pesquisa:', questionsToInsert);

                    const { error: questionsInsertError } = await supabase
                        .from('questions')
                        .insert(questionsToInsert);

                    if (questionsInsertError) {
                        console.error('useSurveyMutations: handleSaveSurvey - Erro ao inserir perguntas para nova pesquisa:', questionsInsertError); // Log de erro
                        throw questionsInsertError;
                    }
                    showSuccess('Pesquisa criada com sucesso!');
                    logActivity('INFO', `Nova pesquisa '${surveyData.title}' (ID: ${newSurvey.id}) criada com sucesso.`, 'SURVEYS', currentUser.id, currentUser.email, currentCompany?.id);
                }
            }
            const currentCompanyIdForRefetch = currentUser?.role === UserRole.DEVELOPER ? undefined : currentCompany?.id;
            await fetchSurveys(currentCompanyIdForRefetch, currentUser, currentCompany);

        } catch (err: any) {
            console.error('useSurveyMutations: handleSaveSurvey - Erro inesperado durante o salvamento da pesquisa:', err);
            showError('Erro ao salvar a pesquisa: ' + err.message);
            logActivity('ERROR', `Erro inesperado ao salvar pesquisa '${surveyData.title}': ${err.message}`, 'SURVEYS', currentUser?.id, currentUser?.email, currentCompany?.id);
        }
    }, [currentUser, currentCompany, showSuccess, showError, fetchSurveys]);

    const handleDeleteSurvey = useCallback(async (surveyId: string): Promise<boolean> => {
        console.log('useSurveyMutations: handleDeleteSurvey - Excluindo pesquisa ID:', surveyId);
        const { error } = await supabase
            .from('surveys')
            .delete()
            .eq('id', surveyId);

        if (error) {
            showError('Erro ao excluir a pesquisa: ' + error.message);
            console.error('useSurveyMutations: handleDeleteSurvey - Erro ao excluir pesquisa:', error);
            logActivity('ERROR', `Erro ao excluir pesquisa (ID: ${surveyId}): ${error.message}`, 'SURVEYS', currentUser?.id, currentUser?.email, currentCompany?.id);
            return false;
        } else {
            showSuccess('Pesquisa excluída com sucesso!');
            const currentCompanyIdForRefetch = currentUser?.role === UserRole.DEVELOPER ? undefined : currentCompany?.id;
            await fetchSurveys(currentCompanyIdForRefetch, currentUser, currentCompany); // Re-fetch surveys to update the list
            logActivity('INFO', `Pesquisa (ID: ${surveyId}) excluída com sucesso.`, 'SURVEYS', currentUser?.id, currentUser?.email, currentCompany?.id);
            console.log('useSurveyMutations: handleDeleteSurvey - Pesquisa excluída com sucesso.');
            return true;
        }
    }, [showSuccess, showError, currentUser, currentCompany, fetchSurveys]);

    const handleSaveResponse = useCallback(async (answers: Answer[], selectedSurvey: Survey, currentUser: User): Promise<boolean> => {
        console.log('useSurveyMutations: handleSaveResponse - Iniciando salvamento da resposta.');
        if (!selectedSurvey || !currentUser) {
            console.error('useSurveyMutations: handleSaveResponse - Usuário ou pesquisa não identificados.', { selectedSurvey, currentUser });
            showError('Usuário ou pesquisa não identificados para salvar a resposta.');
            logActivity('ERROR', `Tentativa de salvar resposta sem pesquisa ou usuário identificados.`, 'SURVEY_RESPONSES', currentUser?.id, currentUser?.email, currentCompany?.id);
            console.log('useSurveyMutations: handleSaveResponse - Retornando FALSE devido a dados ausentes.');
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
            console.error('useSurveyMutations: handleSaveResponse - Perguntas obrigatórias não respondidas:', missingAnswers);
            showError(`Por favor, responda a todas as perguntas obrigatórias: ${missingQuestionTexts}`);
            logActivity('WARN', `Tentativa de salvar resposta com campos obrigatórios ausentes para pesquisa '${selectedSurvey.title}'. Perguntas: ${missingQuestionTexts}`, 'SURVEY_RESPONSES', currentUser.id, currentUser.email, currentCompany?.id);
            console.log('useSurveyMutations: handleSaveResponse - Retornando FALSE devido a validação de campos obrigatórios.');
            return false;
        }

        console.log('useSurveyMutations: handleSaveResponse - Tentando inserir em survey_responses para surveyId:', selectedSurvey.id, 'respondentId:', currentUser.id);
        const { data: newResponse, error: responseError } = await supabase
            .from('survey_responses')
            .insert({
                survey_id: selectedSurvey.id,
                respondent_id: currentUser.id,
            })
            .select()
            .single();

        if (responseError) {
            console.error('useSurveyMutations: handleSaveResponse - Erro ao inserir survey_responses:', responseError);
            showError('Erro ao enviar a resposta da pesquisa: ' + responseError.message);
            logActivity('ERROR', `Erro ao inserir resposta principal para pesquisa '${selectedSurvey.title}': ${responseError.message}`, 'SURVEY_RESPONSES', currentUser.id, currentUser.email, currentCompany?.id);
            console.log('useSurveyMutations: handleSaveResponse - Retornando FALSE devido a erro na inserção da resposta principal.');
            return false;
        }
        console.log('useSurveyMutations: handleSaveResponse - Resposta principal inserida com sucesso:', newResponse);

        if (newResponse) {
            const answersToInsert = answers.map((a: Answer) => ({
                response_id: newResponse.id,
                question_id: a.questionId,
                value: a.value,
            }));
            console.log('useSurveyMutations: handleSaveResponse - Respostas detalhadas a serem inseridas:', answersToInsert);

            const { error: answersError } = await supabase
                .from('answers')
                .insert(answersToInsert);

            if (answersError) {
                console.error('useSurveyMutations: handleSaveResponse - Erro ao inserir answers:', answersError);
                showError('Erro ao salvar as respostas detalhadas: ' + answersError.message);
                logActivity('ERROR', `Erro ao inserir respostas detalhadas para pesquisa '${selectedSurvey.title}' (Resposta ID: ${newResponse.id}): ${answersError.message}`, 'SURVEY_RESPONSES', currentUser.id, currentUser.email, currentCompany?.id);
                console.log('useSurveyMutations: handleSaveResponse - Retornando FALSE devido a erro na inserção das respostas detalhadas.');
                return false;
            }
            console.log('useSurveyMutations: handleSaveResponse - Respostas detalhadas inseridas com sucesso.');
            
            if (currentCompany?.id) {
                console.log('useSurveyMutations: handleSaveResponse - Chamando fetchSurveys e fetchSurveyResponses para atualizar contagens e dados do painel.');
                fetchSurveys(currentCompany.id, currentUser, currentCompany); // Recarregar a lista de pesquisas para atualizar a contagem de respostas
                fetchSurveyResponses(selectedSurvey.id); // Recarregar as respostas para o dashboard, se aplicável
            }
            showSuccess('Resposta enviada com sucesso!');
            logActivity('INFO', `Resposta enviada com sucesso para pesquisa '${selectedSurvey.title}' (Resposta ID: ${newResponse.id}).`, 'SURVEY_RESPONSES', currentUser.id, currentUser.email, currentCompany?.id);
            console.log('useSurveyMutations: handleSaveResponse - Retornando TRUE - sucesso total.');
            return true;
        }
        console.error('useSurveyMutations: handleSaveResponse - newResponse foi nulo após a inserção, mas nenhum erro foi reportado.');
        logActivity('ERROR', `newResponse foi nulo após a inserção da resposta principal para pesquisa '${selectedSurvey.title}'.`, 'SURVEY_RESPONSES', currentUser.id, currentUser.email, currentCompany?.id);
        console.log('useSurveyMutations: handleSaveResponse - Retornando FALSE - newResponse nulo.');
        return false;
    }, [currentCompany, fetchSurveys, fetchSurveyResponses, showSuccess, showError, currentUser]);

    return {
        handleSaveSurvey,
        handleDeleteSurvey,
        handleSaveResponse,
    };
};