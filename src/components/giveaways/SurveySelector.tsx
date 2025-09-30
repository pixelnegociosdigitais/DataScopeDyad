import React from 'react';
import { Survey } from '../../../types';

interface SurveySelectorProps {
    availableSurveys: Survey[];
    selectedSurveyId: string | null;
    onSurveyChange: (surveyId: string) => void;
}

const SurveySelector: React.FC<SurveySelectorProps> = ({ availableSurveys, selectedSurveyId, onSurveyChange }) => {
    return (
        <div className="mb-6">
            <label htmlFor="survey-select" className="block text-sm font-medium text-gray-700 mb-2">
                Selecionar Pesquisa para Sorteio:
            </label>
            <select
                id="survey-select"
                value={selectedSurveyId || ''}
                onChange={(e) => onSurveyChange(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-gray-700"
            >
                <option value="">-- Selecione uma pesquisa --</option>
                {availableSurveys.map(survey => (
                    <option key={survey.id} value={survey.id}>{survey.title}</option>
                ))}
            </select>
        </div>
    );
};

export default SurveySelector;