import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';
import { Survey, User, Company, UserRole } from '../../types';
import { showError, showSuccess } from '../utils/toast';
import { CreateIcon } from './icons/CreateIcon';
import { EditIcon } from './icons/EditIcon';
import { TrashIcon } from './icons/TrashIcon'; // Usando TrashIcon
import { EyeIcon } from './icons/EyeIcon';
import { ShareIcon } from './icons/ShareIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { ChartIcon } from './icons/ChartIcon';
import { PrizeIcon } from './icons/PrizeIcon';
import { LinkIcon } from './icons/LinkIcon';
import { QuestionIcon } from './icons/QuestionIcon';
import { TemplateIcon } from './icons/TemplateIcon';
import SurveyForm from './SurveyForm';
import SurveyResponses from './SurveyResponses';
import SurveyGiveaway from './SurveyGiveaway';
import SurveyQuestions from './SurveyQuestions';
import SurveyTemplates from './SurveyTemplates';
import { generatePdfReport } from '../utils/pdfGenerator';
import ConfirmationDialog from '../src/components/ConfirmationDialog'; // Importar ConfirmationDialog

interface SurveyListProps {
    currentUser: User;
    currentCompany: Company | null;
}

const SurveyList: React.FC<SurveyListProps> = ({ currentUser, currentCompany }) => {
    const [surveys, setSurveys] = useState<Survey[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingSurvey, setEditingSurvey] = useState<Survey | null>(null);
    const [showResponsesModal, setShowResponsesModal] = useState(false);
    const [selectedSurveyForResponses, setSelectedSurveyForResponses] = useState<Survey | null>(null);
    const [showGiveawayModal, setShowGiveawayModal] = useState(false);
    const [selectedSurveyForGiveaway, setSelectedSurveyForGiveaway] = useState<Survey | null>(null);
    const [showQuestionsModal, setShowQuestionsModal] = useState(false);
    const [selectedSurveyForQuestions, setSelectedSurveyForQuestions] = useState<Survey | null>(null);
    const [showTemplatesModal, setShowTemplatesModal] = useState(false);
    const [showDeleteSurveyConfirm, setShowDeleteSurveyConfirm] = useState(false); // Estado para o diálogo de confirmação
    const [surveyToDelete, setSurveyToDelete] = useState<Survey | null>(null); // Pesquisa a ser excluída

    const fetchSurveys = useCallback(async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('surveys')
                .select(`
                    id,
                    title,
                    company_id,
                    created_by,
                    created_at,
                    companies (name),
                    profiles (full_name)
                `)
                .order('created_at', { ascending: false });

            if (currentUser.role !== UserRole.DEVELOPER && currentCompany?.id) {
                query = query.eq('company_id', currentCompany.id);
            } else if (currentUser.role !== UserRole.DEVELOPER && !currentCompany?.id) {
                setSurveys([]);
                setLoading(false);
                return;
            }

            const { data, error } = await query;

            if (error) throw error;

            setSurveys(data.map(s => ({
                ...s,
                companyName: s.companies?.name || 'N/A',
                createdByName: s.profiles?.full_name || 'Usuário Desconhecido'
            })) as Survey[]);
        } catch (error: any) {
            console.error('Erro ao buscar pesquisas:', error.message);
            showError('Não foi possível carregar as pesquisas.');
        } finally {
            setLoading(false);
        }
    }, [currentUser.role, currentCompany?.id]);

    useEffect(() => {
        fetchSurveys();
    }, [fetchSurveys]);

    const handleCreateSurvey = () => {
        if (!currentCompany?.id && currentUser.role !== UserRole.DEVELOPER) {
            showError('Você precisa ter uma empresa associada para criar pesquisas.');
            return;
        }
        setEditingSurvey(null);
        setShowCreateModal(true);
    };

    const handleEditSurvey = (survey: Survey) => {
        setEditingSurvey(survey);
        setShowCreateModal(true);
    };

    const handleDeleteSurveyConfirmed = useCallback(async () => {
        if (!surveyToDelete) return;

        try {
            const { error } = await supabase
                .from('surveys')
                .delete()
                .eq('id', surveyToDelete.id);

            if (error) throw error;

            showSuccess('Pesquisa excluída com sucesso!');
            fetchSurveys();
        } catch (error: any) {
            console.error('Erro ao excluir pesquisa:', error.message);
            showError('Não foi possível excluir a pesquisa.');
        } finally {
            setShowDeleteSurveyConfirm(false);
            setSurveyToDelete(null);
        }
    }, [surveyToDelete, fetchSurveys]);

    const handleDeleteSurvey = useCallback((survey: Survey) => {
        setSurveyToDelete(survey);
        setShowDeleteSurveyConfirm(true);
    }, []);

    const handleViewResponses = (survey: Survey) => {
        setSelectedSurveyForResponses(survey);
        setShowResponsesModal(true);
    };

    const handleManageGiveaway = (survey: Survey) => {
        setSelectedSurveyForGiveaway(survey);
        setShowGiveawayModal(true);
    };

    const handleManageQuestions = (survey: Survey) => {
        setSelectedSurveyForQuestions(survey);
        setShowQuestionsModal(true);
    };

    const handleShareSurvey = (surveyId: string) => {
        const surveyLink = `${window.location.origin}/responder-pesquisa/${surveyId}`;
        navigator.clipboard.writeText(surveyLink);
        showSuccess('Link da pesquisa copiado para a área de transferência!');
    };

    const handleDownloadReport = async (survey: Survey) => {
        try {
            const { data: responses, error: responsesError } = await supabase
                .from('survey_responses')
                .select(`
                    id,
                    created_at,
                    respondent_id,
                    answers (question_id, value, questions (text, type))
                `)
                .eq('survey_id', survey.id);

            if (responsesError) throw responsesError;

            const formattedResponses = responses.map((response: any) => ({
                id: response.id,
                created_at: response.created_at,
                respondent_id: response.respondent_id,
                answers: response.answers.map((answer: any) => ({
                    question_id: answer.question_id,
                    value: answer.value,
                    question_text: answer.questions?.text,
                    question_type: answer.questions?.type,
                }))
            }));

            await generatePdfReport(survey, formattedResponses);
            showSuccess('Relatório PDF gerado com sucesso!');
        } catch (error: any) {
            console.error('Erro ao gerar relatório PDF:', error.message);
            showError('Não foi possível gerar o relatório PDF.');
        }
    };

    const canManageSurveys = currentUser.role === UserRole.ADMINISTRATOR || currentUser.role === UserRole.DEVELOPER;

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold mb-6 text-text-main">Minhas Pesquisas - {currentUser.fullName}</h2>
                <div className="flex space-x-3">
                    {canManageSurveys && (
                        <button
                            onClick={() => setShowTemplatesModal(true)}
                            className="flex items-center px-4 py-2 bg-secondary text-white rounded-md hover:bg-secondary-dark transition-colors shadow-md"
                        >
                            <TemplateIcon className="h-5 w-5 mr-2" />
                            Modelos
                        </button>
                    )}
                    {canManageSurveys && (
                        <button
                            onClick={handleCreateSurvey}
                            className="flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors shadow-md"
                        >
                            <CreateIcon className="h-5 w-5 mr-2" />
                            Nova Pesquisa
                        </button>
                    )}
                </div>
            </div>

            {!currentCompany && currentUser.role !== UserRole.DEVELOPER ? (
                <div className="text-center py-12 bg-white rounded-lg shadow-md">
                    <p className="text-text-light">Você não tem uma empresa associada. Crie ou vincule-se a uma empresa para ver e criar pesquisas.</p>
                </div>
            ) : (
                <>
                    {loading ? (
                        <div className="text-center py-8">
                            <p className="text-text-light">Carregando pesquisas...</p>
                        </div>
                    ) : surveys.length === 0 ? (
                        <div className="text-center py-8 bg-white rounded-lg shadow-md">
                            <p className="text-text-light">Nenhuma pesquisa encontrada. Comece criando uma!</p>
                        </div>
                    ) : (
                        <div className="bg-white shadow-md rounded-lg overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Título
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Empresa
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Criado Por
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Data de Criação
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Ações
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {surveys.map((survey) => (
                                        <tr key={survey.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-main">
                                                {survey.title}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-text-light">
                                                {survey.companyName}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-text-light">
                                                {survey.createdByName}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-text-light">
                                                {new Date(survey.created_at).toLocaleDateString('pt-BR')}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex justify-end space-x-2">
                                                    <button
                                                        onClick={() => handleManageQuestions(survey)}
                                                        className="text-blue-600 hover:text-blue-900 p-2 rounded-full hover:bg-blue-50"
                                                        title="Gerenciar Perguntas"
                                                    >
                                                        <QuestionIcon className="h-5 w-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleViewResponses(survey)}
                                                        className="text-green-600 hover:text-green-900 p-2 rounded-full hover:bg-green-50"
                                                        title="Ver Respostas"
                                                    >
                                                        <EyeIcon className="h-5 w-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleManageGiveaway(survey)}
                                                        className="text-purple-600 hover:text-purple-900 p-2 rounded-full hover:bg-purple-50"
                                                        title="Gerenciar Sorteio"
                                                    >
                                                        <PrizeIcon className="h-5 w-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleShareSurvey(survey.id)}
                                                        className="text-indigo-600 hover:text-indigo-900 p-2 rounded-full hover:bg-indigo-50"
                                                        title="Compartilhar Pesquisa"
                                                    >
                                                        <LinkIcon className="h-5 w-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDownloadReport(survey)}
                                                        className="text-yellow-600 hover:text-yellow-900 p-2 rounded-full hover:bg-yellow-50"
                                                        title="Baixar Relatório"
                                                    >
                                                        <DownloadIcon className="h-5 w-5" />
                                                    </button>
                                                    {canManageSurveys && (
                                                        <>
                                                            <button
                                                                onClick={() => handleEditSurvey(survey)}
                                                                className="text-primary hover:text-primary-dark p-2 rounded-full hover:bg-primary-light"
                                                                title="Editar Pesquisa"
                                                            >
                                                                <EditIcon className="h-5 w-5" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteSurvey(survey)}
                                                                className="text-red-600 hover:text-red-900 p-2 rounded-full hover:bg-red-50"
                                                                title="Excluir Pesquisa"
                                                            >
                                                                <TrashIcon className="h-5 w-5" />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}

            {showCreateModal && (
                <SurveyForm
                    isOpen={showCreateModal}
                    onClose={() => setShowCreateModal(false)}
                    onSave={() => {
                        setShowCreateModal(false);
                        fetchSurveys();
                    }}
                    initialData={editingSurvey}
                    currentUser={currentUser}
                    currentCompanyId={currentCompany?.id || ''}
                />
            )}

            {showResponsesModal && selectedSurveyForResponses && (
                <SurveyResponses
                    isOpen={showResponsesModal}
                    onClose={() => setShowResponsesModal(false)}
                    survey={selectedSurveyForResponses}
                />
            )}

            {showGiveawayModal && selectedSurveyForGiveaway && (
                <SurveyGiveaway
                    isOpen={showGiveawayModal}
                    onClose={() => setShowGiveawayModal(false)}
                    survey={selectedSurveyForGiveaway}
                    currentUser={currentUser}
                />
            )}

            {showQuestionsModal && selectedSurveyForQuestions && (
                <SurveyQuestions
                    isOpen={showQuestionsModal}
                    onClose={() => setShowQuestionsModal(false)}
                    survey={selectedSurveyForQuestions}
                    currentUser={currentUser}
                />
            )}

            {showTemplatesModal && (
                <SurveyTemplates
                    isOpen={showTemplatesModal}
                    onClose={() => setShowTemplatesModal(false)}
                    currentUser={currentUser}
                    currentCompanyId={currentCompany?.id || ''}
                    onTemplateSelected={() => {
                        setShowTemplatesModal(false);
                        fetchSurveys();
                    }}
                />
            )}

            {showDeleteSurveyConfirm && surveyToDelete && (
                <ConfirmationDialog
                    title="Confirmar Exclusão de Pesquisa"
                    message={`Tem certeza que deseja excluir a pesquisa "${surveyToDelete.title}"? Todas as perguntas e respostas associadas também serão excluídas. Esta ação é irreversível.`}
                    confirmText="Excluir"
                    onConfirm={handleDeleteSurveyConfirmed}
                    cancelText="Cancelar"
                    onCancel={() => {
                        setShowDeleteSurveyConfirm(false);
                        setSurveyToDelete(null);
                    }}
                />
            )}
        </div>
    );
};

export default SurveyList;