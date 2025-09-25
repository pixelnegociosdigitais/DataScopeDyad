import React, { useState } from 'react';
import { Survey, Question, QuestionType, Answer } from '../types';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';

interface SurveyFormProps {
    survey: Survey;
    onSaveResponse: (answers: Answer[]) => void;
    onBack: () => void;
}

const SurveyForm: React.FC<SurveyFormProps> = ({ survey, onSaveResponse, onBack }) => {
    const [answers, setAnswers] = useState<Record<string, any>>({});

    const handleInputChange = (questionId: string, value: any) => {
        setAnswers(prev => ({ ...prev, [questionId]: value }));
    };

    const handleCheckboxChange = (questionId: string, option: string, checked: boolean) => {
        const currentAnswers = answers[questionId] || [];
        const newAnswers = checked
            ? [...currentAnswers, option]
            : currentAnswers.filter((item: string) => item !== option);
        setAnswers(prev => ({ ...prev, [questionId]: newAnswers }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const formattedAnswers: Answer[] = Object.entries(answers).map(([questionId, value]) => ({
            questionId,
            value,
        }));
        onSaveResponse(formattedAnswers);
    };

    const renderQuestion = (q: Question) => {
        switch (q.type) {
            case QuestionType.SHORT_TEXT:
                return <input type="text" onChange={e => handleInputChange(q.id, e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary" />;
            case QuestionType.LONG_TEXT:
                return <textarea onChange={e => handleInputChange(q.id, e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary" rows={4} />;
            case QuestionType.EMAIL:
                return <input type="email" onChange={e => handleInputChange(q.id, e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary" />;
            case QuestionType.PHONE:
                return <input type="tel" onChange={e => handleInputChange(q.id, e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary" />;
            case QuestionType.RATING:
                return (
                    <div className="flex flex-wrap gap-2 mt-2">
                        {Array.from({ length: 10 }, (_, i) => i + 1).map(num => (
                            <label key={num} className="flex items-center space-x-2 cursor-pointer p-2 border rounded-md hover:bg-gray-100">
                                <input type="radio" name={q.id} value={num} onChange={e => handleInputChange(q.id, Number(e.target.value))} className="form-radio text-primary focus:ring-primary" />
                                <span>{num}</span>
                            </label>
                        ))}
                    </div>
                );
            case QuestionType.MULTIPLE_CHOICE:
                return (
                    <div className="space-y-2 mt-2">
                        {q.options?.map(opt => (
                            <label key={opt} className="flex items-center space-x-3 cursor-pointer">
                                <input type="radio" name={q.id} value={opt} onChange={e => handleInputChange(q.id, e.target.value)} className="form-radio text-primary focus:ring-primary" />
                                <span>{opt}</span>
                            </label>
                        ))}
                    </div>
                );
            case QuestionType.CHECKBOX:
                return (
                    <div className="space-y-2 mt-2">
                        {q.options?.map(opt => (
                            <label key={opt} className="flex items-center space-x-3 cursor-pointer">
                                <input type="checkbox" onChange={e => handleCheckboxChange(q.id, opt, e.target.checked)} className="form-checkbox text-primary focus:ring-primary rounded" />
                                <span>{opt}</span>
                            </label>
                        ))}
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-200 transition-colors" aria-label="Voltar">
                    <ArrowLeftIcon className="h-6 w-6 text-gray-600" />
                </button>
                <div>
                    <h2 className="text-2xl font-bold text-text-main">{survey.title}</h2>
                    <p className="text-text-light">Preencha o formulário abaixo.</p>
                </div>
            </div>
            <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-md space-y-6">
                {survey.questions.map((q, index) => (
                    <div key={q.id}>
                        <label className="block text-md font-medium text-gray-800">{index + 1}. {q.text}</label>
                        {renderQuestion(q)}
                    </div>
                ))}
                <div className="pt-4 flex justify-end">
                    <button type="submit" className="px-6 py-2 font-semibold text-white bg-primary rounded-md hover:bg-primary-dark shadow-sm">
                        Enviar Respostas
                    </button>
                </div>
            </form>
        </div>
    );
};

export default SurveyForm;