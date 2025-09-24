
import React from 'react';
import { Survey } from '../types';
import { SurveyIcon } from './icons/SurveyIcon';

interface SurveyListProps {
    surveys: Survey[];
    onSelectSurvey: (survey: Survey) => void;
}

const SurveyList: React.FC<SurveyListProps> = ({ surveys, onSelectSurvey }) => {
    return (
        <div>
            <h2 className="text-2xl font-bold mb-6 text-text-main">Pesquisas Disponíveis</h2>
            {surveys.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {surveys.map(survey => (
                        <div
                            key={survey.id}
                            className="bg-white p-6 rounded-lg shadow-md hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer"
                            onClick={() => onSelectSurvey(survey)}
                        >
                            <div className="flex items-center mb-4">
                                <div className="p-3 bg-primary/10 rounded-full mr-4">
                                    <SurveyIcon className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-text-main">{survey.title}</h3>
                                    <p className="text-sm text-text-light">{survey.questions.length} perguntas</p>
                                </div>
                            </div>
                            <button className="w-full mt-4 text-sm font-medium text-primary hover:text-primary-dark">
                                Ver Painel
                            </button>
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
