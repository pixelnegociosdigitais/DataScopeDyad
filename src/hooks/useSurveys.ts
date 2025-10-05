import { Survey, SurveyResponse, Company, User } from '@/types';
import { useSurveyData } from './useSurveyData';
import { useSurveyMutations } from './useSurveyMutations';
import { useSurveyTemplates } from './useSurveyTemplates';

interface UseSurveysReturn {
    surveys: Survey[];
    surveyResponses: SurveyResponse[];
    templates: Survey[];
    loadingSurveys: boolean;
    fetchSurveys: (companyId: string | undefined, user: User | null, company: Company | null) => Promise<Survey[]>;
    fetchSurveyResponses: (surveyId: string) => Promise<void>;
    handleSaveSurvey: (surveyData: Survey, editingSurveyId?: string) => Promise<void>;
    handleDeleteSurvey: (surveyId: string) => Promise<boolean>;
    handleSaveResponse: (answers: any[], selectedSurvey: Survey, currentUser: User) => Promise<boolean>;
    handleSaveTemplate: (templateData: Survey, editingTemplateId?: string) => Promise<void>;
    handleDeleteTemplate: (templateId: string) => Promise<boolean>;
}

export const useSurveys = (currentCompany: Company | null, currentUser: User | null): UseSurveysReturn => {
    // Use o hook useSurveyData para gerenciar a busca e o estado das pesquisas e respostas
    const { surveys, surveyResponses, loadingSurveys, fetchSurveys, fetchSurveyResponses } = useSurveyData({ currentUser, currentCompany });

    // Use o hook useSurveyMutations para gerenciar as operações de mutação de pesquisas e respostas
    const { handleSaveSurvey, handleDeleteSurvey, handleSaveResponse } = useSurveyMutations({ currentUser, currentCompany, fetchSurveys, fetchSurveyResponses });

    // Use o hook useSurveyTemplates para gerenciar os modelos de pesquisa
    const { templates, handleSaveTemplate, handleDeleteTemplate } = useSurveyTemplates({ currentUser, currentCompany });

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