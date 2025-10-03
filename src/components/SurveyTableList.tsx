import React from 'react';
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
    onDownloadReport: (survey: Survey) => Promise<void>;
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
    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-text-main">Minhas Pesquisas - {currentUser.fullName}</h2>
                <div className="flex space-x-3">
                    {canManageSurveys && (
                        <button
                            onClick={onManageTemplates}
                            className="flex items-center px-4 py-2 bg-secondary text-white rounded-md hover:bg-secondary-dark transition-colors shadow-md"
                        >
                            <TemplateIcon className="h-5 w-5 mr-2" />
                            Modelos
                        </button>
                    )}
                    {canManageSurveys && (
                        <button
                            onClick={onCreateSurvey}
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
                                                {/* Accessing companyName from survey object */}
                                                {survey.companyName || 'N/A'} 
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-text-light">
                                                {/* Accessing createdByName from survey object */}
                                                {survey.createdByName || 'Usuário Desconhecido'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-text-light">
                                                {new Date(survey.created_at!).toLocaleDateString('pt-BR')}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex justify-end space-x-2">
                                                    <button
                                                        onClick={() => onManageQuestions(survey)}
                                                        className="text-blue-600 hover:text-blue-900 p-2 rounded-full hover:bg-blue-50"
                                                        title="Gerenciar Perguntas"
                                                    >
                                                        <QuestionIcon className="h-5 w-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => onViewResponses(survey)}
                                                        className="text-green-600 hover:text-green-900 p-2 rounded-full hover:bg-green-50"
                                                        title="Ver Respostas"
                                                    >
                                                        <EyeIcon className="h-5 w-5" />
                                                    </button>
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
                    )}
                </>
            )}
        </div>
    );
};

export default SurveyTableList;