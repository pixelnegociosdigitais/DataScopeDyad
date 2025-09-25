import React from 'react';
import { Survey } from '../types';
import { SurveyIcon } from './icons/SurveyIcon';
import { DashboardIcon } from './icons/DashboardIcon';
import { PencilIcon } from './icons/PencilIcon';
import { TrashIcon } from './icons/TrashIcon';

interface SurveyListProps {
    surveys: Survey[];
    onSelectSurvey: (survey: Survey) => void;
    onStartResponse: (survey: Survey) => void;
    onEditSurvey: (survey: Survey) => void;
    onDeleteSurvey: (surveyId: string) => void;
    canManage: boolean;
}

const SurveyList: React.FC<SurveyListProps> = ({ surveys, onSelectSurvey, onStartResponse, onEditSurvey, onDeleteSurvey, canManage }) => {
    return (
        <div>
            <h2 className="text-2xl font-bold mb-6 text-text-main">Pesquisas Disponíveis</h2>
            {surveys.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {surveys.map(survey => (
                        <div
                            key={survey.id}
                            className="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow flex flex-col"
                        >
                            <div className="flex items-start mb-4">
                                <div className="p-3 bg-primary/10 rounded-full mr-4">
                                    <SurveyIcon className="h-6 w-6 text-primary" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-text-main">{survey.title}</h3>
                                    <p className="text-sm text-text-light">{survey.questions.length} perguntas</p>
                                </div>
                                {canManage && (
                                    <div className="flex items-center">
                                        <button onClick={() => onEditSurvey(survey)} className="p-2 text-gray-400 hover:text-primary rounded-full hover:bg-primary/10 transition-colors" aria-label="Editar pesquisa">
                                            <PencilIcon className="h-5 w-5" />
                                        </button>
                                        <button onClick={() => onDeleteSurvey(survey.id)} className="p-2 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-500/10 transition-colors" aria-label="Excluir pesquisa">
                                            <TrashIcon className="h-5 w-5" />
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div className="mt-auto pt-4 border-t border-gray-100 flex gap-2">
                                <button 
                                    onClick={() => onSelectSurvey(survey)}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark transition-colors"
                                >
                                    <DashboardIcon className="h-4 w-4" />
                                    Painel
                                </button>
                                <button 
                                    onClick={() => onStartResponse(survey)}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-primary border border-primary rounded-md hover:bg-primary/10 transition-colors"
                                >
                                    <PencilIcon className="h-4 w-4" />
                                    Responder
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 bg-white rounded-lg shadow-md">
                    <p className="text-text-light">Nenhuma pesquisa encontrada para esta empresa.</p>
                </div>
            )}
        </div>
    );
};

export default SurveyList;