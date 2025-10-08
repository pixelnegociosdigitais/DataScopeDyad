import React, { useState } from 'react';
import { Survey, User, Company, UserRole } from '../../types';
import { CreateIcon } from '../../components/icons/CreateIcon';
import { PencilIcon } from '../../components/icons/PencilIcon';
import { TrashIcon } from '../../components/icons/TrashIcon';
import { EyeIcon } from '../../components/icons/EyeIcon';
import { ShareIcon } from '../../components/icons/ShareIcon';
import { DownloadIcon } from '../../components/icons/DownloadIcon';
import { QuestionIcon } from '../../components/icons/QuestionIcon';
import { GiftIcon } from '../../components/icons/GiftIcon';
import { TemplateIcon } from '../../components/icons/TemplateIcon';
import { SurveyIcon } from '../../components/icons/SurveyIcon';
import SurveyApplyModal from './SurveyApplyModal';

interface SurveyTableListProps {
    surveys: Survey[];
    loading: boolean;
    currentUser: User;
    currentCompany: Company | null;
    canManageSurveys: boolean;
    onCreateSurvey: () => void;
    onEditSurvey: (survey: Survey) => void;
    onDeleteSurvey: (survey: Survey) => void;
    onViewResponses: (survey: Survey) => void;
    onManageGiveaway: (survey: Survey) => void;
    onManageQuestions: (survey: Survey) => void;
    onShareSurvey: (surveyId: string) => void;
    onDownloadReport: (survey: Survey) => void;
    onManageTemplates: () => void;
}

const SurveyTableList: React.FC<SurveyTableListProps> = ({
    surveys,
    loading,
    currentUser,
    currentCompany,
    canManageSurveys,
    onCreateSurvey,
    onEditSurvey,
    onDeleteSurvey,
    onViewResponses,
    onManageGiveaway,
    onManageQuestions,
    onShareSurvey,
    onDownloadReport,
    onManageTemplates,
}) => {
    const [selectedSurveyForApply, setSelectedSurveyForApply] = useState<Survey | null>(null);
    console.log('SurveyTableList: Received surveys prop:', surveys);

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
                <h2 className="text-xl sm:text-2xl font-bold text-text-main">Minhas Pesquisas - {currentUser.fullName}</h2>
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
                    {canManageSurveys && (
                        <button
                            onClick={onManageTemplates}
                            className="flex items-center justify-center px-4 py-2 bg-secondary text-white rounded-md hover:bg-secondary-dark transition-colors shadow-md"
                        >
                            <TemplateIcon className="h-5 w-5 mr-2" />
                            <span className="hidden sm:inline">Modelos</span>
                            <span className="sm:hidden">Modelos</span>
                        </button>
                    )}
                    {canManageSurveys && (
                        <button
                            onClick={onCreateSurvey}
                            className="flex items-center justify-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors shadow-md"
                        >
                            <CreateIcon className="h-5 w-5 mr-2" />
                            <span className="hidden sm:inline">Nova Pesquisa</span>
                            <span className="sm:hidden">Nova</span>
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
                        <>
                            {/* Desktop Table View */}
                            <div className="hidden lg:block bg-white shadow-md rounded-lg overflow-hidden">
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
                                                    {survey.companyName || 'N/A'} 
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-light">
                                                    {survey.createdByName || 'Usuário Desconhecido'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-light">
                                                    {new Date(survey.created_at!).toLocaleDateString('pt-BR')}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <div className="flex justify-end space-x-2">
                                                        <button
                                            onClick={() => setSelectedSurveyForApply(survey)}
                                            className="text-green-600 hover:text-green-900 p-2 rounded-full hover:bg-green-50"
                                            title="Aplicar Pesquisa"
                                        >
                                            <SurveyIcon className="h-5 w-5" />
                                        </button>
                                                        <button
                                                            onClick={() => onViewResponses(survey)}
                                                            className="text-blue-600 hover:text-blue-900 p-2 rounded-full hover:bg-blue-50"
                                                            title="Ver Respostas"
                                                        >
                                                            <EyeIcon className="h-5 w-5" />
                                                        </button>
                                                        {canManageSurveys && (
                                                            <button
                                                                onClick={() => onManageQuestions(survey)}
                                                                className="text-purple-600 hover:text-purple-900 p-2 rounded-full hover:bg-purple-50"
                                                                title="Gerenciar Perguntas"
                                                            >
                                                                <QuestionIcon className="h-5 w-5" />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => onManageGiveaway(survey)}
                                                            className="text-purple-600 hover:text-purple-900 p-2 rounded-full hover:bg-purple-50"
                                                            title="Gerenciar Sorteio"
                                                        >
                                                            <GiftIcon className="h-5 w-5" />
                                                        </button>
                                                        <button
                                                            onClick={() => onShareSurvey(survey.id)}
                                                            className="text-indigo-600 hover:text-indigo-900 p-2 rounded-full hover:bg-indigo-50"
                                                            title="Compartilhar Pesquisa"
                                                        >
                                                            <ShareIcon className="h-5 w-5" />
                                                        </button>
                                                        <button
                                                            onClick={() => onDownloadReport(survey)}
                                                            className="text-yellow-600 hover:text-yellow-900 p-2 rounded-full hover:bg-yellow-50"
                                                            title="Baixar Relatório"
                                                        >
                                                            <DownloadIcon className="h-5 w-5" />
                                                        </button>
                                                        {canManageSurveys && (
                                                            <>
                                                                <button
                                                                    onClick={() => onEditSurvey(survey)}
                                                                    className="text-primary hover:text-primary-dark p-2 rounded-full hover:bg-primary/10"
                                                                    title="Editar Pesquisa"
                                                                >
                                                                    <PencilIcon className="h-5 w-5" />
                                                                </button>
                                                                <button
                                                                    onClick={() => onDeleteSurvey(survey)}
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

                            {/* Mobile Card View */}
                            <div className="lg:hidden space-y-4">
                                {surveys.map((survey) => (
                                    <div key={survey.id} className="bg-white rounded-lg shadow-md p-4">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-sm font-medium text-text-main truncate mb-1">
                                                    {survey.title}
                                                </h3>
                                                <div className="text-xs text-text-light space-y-1">
                                                    <p><span className="font-medium">Empresa:</span> {survey.companyName || 'N/A'}</p>
                                                    <p><span className="font-medium">Criado por:</span> {survey.createdByName || 'Usuário Desconhecido'}</p>
                                                    <p><span className="font-medium">Data:</span> {new Date(survey.created_at!).toLocaleDateString('pt-BR')}</p>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* Mobile Actions */}
                                        <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100">
                                            <button
                                                onClick={() => setSelectedSurveyForApply(survey)}
                                                className="flex items-center px-3 py-1.5 text-xs bg-green-50 text-green-600 rounded-md hover:bg-green-100"
                                            >
                                                <SurveyIcon className="h-3 w-3 mr-1" />
                                                Aplicar
                                            </button>
                                            <button
                                                onClick={() => onViewResponses(survey)}
                                                className="flex items-center px-3 py-1.5 text-xs bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100"
                                            >
                                                <EyeIcon className="h-3 w-3 mr-1" />
                                                Respostas
                                            </button>
                                            {canManageSurveys && (
                                                <button
                                                    onClick={() => onManageQuestions(survey)}
                                                    className="flex items-center px-3 py-1.5 text-xs bg-purple-50 text-purple-600 rounded-md hover:bg-purple-100"
                                                >
                                                    <QuestionIcon className="h-3 w-3 mr-1" />
                                                    Perguntas
                                                </button>
                                            )}
                                            <button
                                                onClick={() => onManageGiveaway(survey)}
                                                className="flex items-center px-3 py-1.5 text-xs bg-purple-50 text-purple-600 rounded-md hover:bg-purple-100"
                                            >
                                                <GiftIcon className="h-3 w-3 mr-1" />
                                                Sorteio
                                            </button>
                                            <button
                                                onClick={() => onShareSurvey(survey.id)}
                                                className="flex items-center px-3 py-1.5 text-xs bg-indigo-50 text-indigo-600 rounded-md hover:bg-indigo-100"
                                            >
                                                <ShareIcon className="h-3 w-3 mr-1" />
                                                Compartilhar
                                            </button>
                                            <button
                                                onClick={() => onDownloadReport(survey)}
                                                className="flex items-center px-3 py-1.5 text-xs bg-yellow-50 text-yellow-600 rounded-md hover:bg-yellow-100"
                                            >
                                                <DownloadIcon className="h-3 w-3 mr-1" />
                                                Relatório
                                            </button>
                                            {canManageSurveys && (
                                                <>
                                                    <button
                                                        onClick={() => onEditSurvey(survey)}
                                                        className="flex items-center px-3 py-1.5 text-xs bg-primary/10 text-primary rounded-md hover:bg-primary/20"
                                                    >
                                                        <PencilIcon className="h-3 w-3 mr-1" />
                                                        Editar
                                                    </button>
                                                    <button
                                                        onClick={() => onDeleteSurvey(survey)}
                                                        className="flex items-center px-3 py-1.5 text-xs bg-red-50 text-red-600 rounded-md hover:bg-red-100"
                                                    >
                                                        <TrashIcon className="h-3 w-3 mr-1" />
                                                        Excluir
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </>
            )}
            
            {selectedSurveyForApply && (
                <SurveyApplyModal
                    survey={selectedSurveyForApply}
                    onClose={() => setSelectedSurveyForApply(null)}
                />
            )}
        </div>
    );
};

export default SurveyTableList;