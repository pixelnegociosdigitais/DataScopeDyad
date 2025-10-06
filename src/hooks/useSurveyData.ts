import { useState, useEffect, useCallback } from 'react';
import { Survey, SurveyResponse, Question, RawSurveyData, User, Company, UserRole } from '@/types';
import { supabase } from '@/src/integrations/supabase/client';
import { logActivity } from '@/src/utils/logger';

interface UseSurveyDataProps {
    currentUser: User | null;
    currentCompany: Company | null;
}

interface UseSurveyDataReturn {
    surveys: Survey[];
    surveyResponses: SurveyResponse[];
    loadingSurveys: boolean;
    fetchSurveys: (companyId: string | undefined, user: User | null, company: Company | null) => Promise<Survey[]>;
    fetchSurveyResponses: (surveyId: string) => Promise<void>;
}

export const useSurveyData = ({ currentUser: hookCurrentUser, currentCompany: hookCurrentCompany }: UseSurveyDataProps): UseSurveyDataReturn => {
    const [surveys, setSurveys] = useState<Survey[]>([]);
    const [surveyResponses, setSurveyResponses] = useState<SurveyResponse[]>([]);
    const [loadingSurveys, setLoadingSurveys] = useState(true);

    const fetchSurveys = useCallback(async (companyId: string | undefined, user: User | null, company: Company | null): Promise<Survey[]> => {
        setLoadingSurveys(true);
        console.log('useSurveyData: fetchSurveys - Iniciando busca de pesquisas.');
        console.log('useSurveyData: fetchSurveys - companyId (argumento):', companyId);
        console.log('useSurveyData: fetchSurveys - user.role (argumento):', user?.role);
        console.log('useSurveyData: fetchSurveys - user.company_id (argumento):', user?.company_id);
        console.log('useSurveyData: fetchSurveys - company.id (argumento):', company?.id);
        
        let effectiveCompanyId = companyId;
        // Se não for desenvolvedor e companyId não foi fornecido, mas o usuário tem um company_id, use-o.
        if (user?.role !== UserRole.DEVELOPER && !effectiveCompanyId && user?.company_id) {
            effectiveCompanyId = user.company_id;
            console.log('useSurveyData: fetchSurveys - Usando user.company_id como effectiveCompanyId:', effectiveCompanyId);
        }

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

        if (user?.role !== UserRole.DEVELOPER && effectiveCompanyId) { // Use effectiveCompanyId aqui
            console.log('useSurveyData: fetchSurveys - Filtrando por effectiveCompanyId:', effectiveCompanyId);
            query = query.eq('company_id', effectiveCompanyId);
        } else if (user?.role === UserRole.DEVELOPER) {
            console.log('useSurveyData: fetchSurveys - Usuário atual é DEVELOPER, buscando todas as pesquisas (sem filtro de company_id).');
            // RLS policy for developers already allows all surveys, so no additional filter needed here.
        } else {
            // Se não for desenvolvedor e não houver effectiveCompanyId, retorna vazio.
            console.log('useSurveyData: fetchSurveys - Sem effectiveCompanyId e não é desenvolvedor, retornando array vazio.');
            setSurveys([]);
            setLoadingSurveys(false);
            return [];
        }
        
        const { data, error } = await query;

        if (error) {
            console.error('useSurveyData: fetchSurveys - Erro ao buscar pesquisas:', error);
            logActivity('ERROR', `Erro ao buscar pesquisas para a empresa ${effectiveCompanyId}: ${error.message}`, 'SURVEYS', user?.id, user?.email, company?.id);
            setSurveys([]);
            setLoadingSurveys(false);
            return [];
        } else if (data) {
            console.log('useSurveyData: fetchSurveys - Dados RAW recebidos do Supabase:', data);
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
            console.log('useSurveyData: fetchSurveys - Pesquisas processadas:', fetchedSurveys);
            logActivity('INFO', `Pesquisas carregadas para a empresa ${effectiveCompanyId}.`, 'SURVEYS', user?.id, user?.email, company?.id);
            setSurveys(fetchedSurveys);
            setLoadingSurveys(false);
            return fetchedSurveys;
        }
        setLoadingSurveys(false);
        console.log('useSurveyData: fetchSurveys - Nenhuma pesquisa encontrada ou erro, loadingSurveys = false.');
        return [];
    }, []);

    const fetchSurveyResponses = useCallback(async (surveyId: string) => {
        console.log('useSurveyData: fetchSurveyResponses - Iniciando busca de respostas para surveyId:', surveyId);
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
            console.error('useSurveyData: fetchSurveyResponses - Erro ao buscar respostas:', error);
            logActivity('ERROR', `Erro ao buscar respostas para a pesquisa ${surveyId}: ${error.message}`, 'SURVEYS', hookCurrentUser?.id, hookCurrentUser?.email, hookCurrentCompany?.id);
            setSurveyResponses([]);
            return;
        }

        if (data) {
            console.log('useSurveyData: fetchSurveyResponses - Dados de respostas recebidos:', data);
            const fetchedResponses: SurveyResponse[] = data.map(r => ({
                id: r.id,
                surveyId: r.survey_id,
                answers: r.answers.map((a: { question_id: string; value: string | number | string[] }) => ({
                    questionId: a.question_id,
                    value: a.value,
                })),
            }));
            console.log('useSurveyData: fetchSurveyResponses - Respostas processadas e definidas:', fetchedResponses);
            logActivity('INFO', `Respostas carregadas para a pesquisa ${surveyId}.`, 'SURVEYS', hookCurrentUser?.id, hookCurrentUser?.email, hookCurrentCompany?.id);
            setSurveyResponses(fetchedResponses);
        } else {
            console.log('useSurveyData: fetchSurveyResponses - Nenhuma resposta recebida, definindo surveyResponses como array vazio.');
            logActivity('INFO', `Nenhuma resposta encontrada para a pesquisa ${surveyId}.`, 'SURVEYS', hookCurrentUser?.id, hookCurrentUser?.email, hookCurrentCompany?.id);
            setSurveyResponses([]);
        }
    }, [hookCurrentUser?.id, hookCurrentUser?.email, hookCurrentCompany?.id]);

    useEffect(() => {
        console.log('useSurveyData: useEffect triggered. hookCurrentCompany.id:', hookCurrentCompany?.id, 'hookCurrentUser.role:', hookCurrentUser?.role, 'hookCurrentUser.company_id:', hookCurrentUser?.company_id);
        
        let companyIdForInitialFetch: string | undefined;
        if (hookCurrentUser?.role === UserRole.DEVELOPER) {
            companyIdForInitialFetch = undefined; // Desenvolvedores veem todas as pesquisas
        } else if (hookCurrentCompany?.id) {
            companyIdForInitialFetch = hookCurrentCompany.id;
        } else if (hookCurrentUser?.company_id) { // Fallback para company_id do usuário
            companyIdForInitialFetch = hookCurrentUser.company_id;
        } else {
            companyIdForInitialFetch = undefined; // Nenhuma empresa associada
        }

        console.log('useSurveyData: Calling fetchSurveys from useEffect with companyId:', companyIdForInitialFetch);
        fetchSurveys(companyIdForInitialFetch, hookCurrentUser, hookCurrentCompany);

        // Setup real-time subscription for surveys
        const channel = supabase
            .channel('public:surveys')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'surveys' }, payload => {
                console.log('useSurveyData: Real-time event received for surveys:', payload);
                if (payload.eventType === 'INSERT') {
                    console.log('useSurveyData: INSERT event payload.new:', payload.new);
                }
                // Re-fetch surveys to update the list using the LATEST values of currentUser and currentCompany
                let companyIdForRealtimeFetch: string | undefined;
                if (hookCurrentUser?.role === UserRole.DEVELOPER) {
                    companyIdForRealtimeFetch = undefined;
                } else if (hookCurrentCompany?.id) {
                    companyIdForRealtimeFetch = hookCurrentCompany.id;
                } else if (hookCurrentUser?.company_id) { // Fallback para company_id do usuário
                    companyIdForRealtimeFetch = hookCurrentUser.company_id;
                } else {
                    companyIdForRealtimeFetch = undefined;
                }
                console.log('useSurveyData: Real-time trigger - Chamando fetchSurveys com companyId:', companyIdForRealtimeFetch);
                fetchSurveys(companyIdForRealtimeFetch, hookCurrentUser, hookCurrentCompany);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [hookCurrentCompany?.id, hookCurrentUser?.role, hookCurrentUser?.company_id, fetchSurveys, hookCurrentUser, hookCurrentCompany]);

    return {
        surveys,
        surveyResponses,
        loadingSurveys,
        fetchSurveys,
        fetchSurveyResponses,
    };
};