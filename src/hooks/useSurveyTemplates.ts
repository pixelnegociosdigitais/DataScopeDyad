import { useState, useEffect, useCallback } from 'react';
import { Survey, User, Company } from '@/types';
import { supabase } from '@/src/integrations/supabase/client';
import { showSuccess, showError } from '@/src/utils/toast';
import { logActivity } from '@/src/utils/logger';

interface UseSurveyTemplatesProps {
    currentUser: User | null;
    currentCompany: Company | null;
}

interface UseSurveyTemplatesReturn {
    templates: Survey[];
    fetchTemplates: () => Promise<void>;
    handleSaveTemplate: (templateData: Survey, editingTemplateId?: string) => Promise<void>;
    handleDeleteTemplate: (templateId: string) => Promise<boolean>;
}

export const useSurveyTemplates = ({ currentUser, currentCompany }: UseSurveyTemplatesProps): UseSurveyTemplatesReturn => {
    const [templates, setTemplates] = useState<Survey[]>([]);

    const fetchTemplates = useCallback(async () => {
        console.log('useSurveyTemplates: fetchTemplates - Iniciando busca de templates.');
        const { data, error } = await supabase
            .from('survey_templates')
            .select('id, title, questions');

        if (error) {
            console.error('useSurveyTemplates: fetchTemplates - Erro ao buscar templates:', error);
            logActivity('ERROR', `Erro ao buscar templates de pesquisa: ${error.message}`, 'SURVEY_TEMPLATES', currentUser?.id, currentUser?.email, currentCompany?.id);
            return;
        }

        if (data) {
            console.log('useSurveyTemplates: fetchTemplates - Dados de templates recebidos:', data);
            const fetchedTemplates: Survey[] = data.map(template => ({
                id: template.id,
                title: template.title,
                companyId: '', // Templates não têm companyId
                questions: template.questions as any[], // Cast para any[] para corresponder a Question[]
            }));
            setTemplates(fetchedTemplates);
            logActivity('INFO', `Templates de pesquisa carregados.`, 'SURVEY_TEMPLATES', currentUser?.id, currentUser?.email, currentCompany?.id);
            console.log('useSurveyTemplates: fetchTemplates - Templates processados e definidos:', fetchedTemplates);
        }
    }, [currentUser?.id, currentUser?.email, currentCompany?.id]);

    useEffect(() => {
        fetchTemplates();
    }, [fetchTemplates]);

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
            console.error('useSurveyTemplates: handleSaveTemplate - Erro ao salvar modelo:', err.message);
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
            console.error('useSurveyTemplates: handleDeleteTemplate - Erro ao excluir modelo:', err.message);
            showError('Erro ao excluir modelo: ' + err.message);
            logActivity('ERROR', `Erro ao excluir modelo (ID: ${templateId}): ${err.message}`, 'SURVEY_TEMPLATES', currentUser.id, currentUser.email, currentCompany?.id);
            return false;
        }
    }, [currentUser, currentCompany, fetchTemplates, showSuccess, showError]);

    return {
        templates,
        fetchTemplates,
        handleSaveTemplate,
        handleDeleteTemplate,
    };
};