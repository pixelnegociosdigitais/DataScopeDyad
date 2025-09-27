import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom'; // Importar createPortal diretamente
import { Survey, Question, QuestionType, Answer } from '../types';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';
import { showError } from '../src/utils/toast';
import ConfirmationDialog from '../src/components/ConfirmationDialog';

interface SurveyFormProps {
    survey: Survey;
    onSaveResponse: (answers: Answer[]) => Promise<boolean>;
    onBack: () => void;
}

const SurveyForm: React.FC<SurveyFormProps> = ({ survey, onSaveResponse, onBack }) => {
    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);

    // Log de diagnóstico para o estado do diálogo
    useEffect(() => {
        console.log('SurveyForm: showConfirmationDialog state changed to:', showConfirmationDialog);
    }, [showConfirmationDialog]);

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

    const resetForm = () => {
        setAnswers({});
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const formattedAnswers: Answer[] = survey.questions.map(q => {
            let valueToSave = answers[q.id];
            if (q.type === QuestionType.CHECKBOX && valueToSave === undefined) {
                valueToSave = [];
            } else if (valueToSave === undefined) {
                valueToSave = null;
            }
            return {
                questionId: q.id,
                value: valueToSave,
            };
        });
        
        try {
            const success = await onSaveResponse(formattedAnswers);
            if (success) {
                setShowConfirmationDialog(true);
            }
        } catch (error: any) {
            console.error('SurveyForm: Ocorreu um erro inesperado ao enviar a resposta:', error);
            showError('Ocorreu um erro inesperado ao enviar a resposta: ' + error.message);
        }
    };

    const renderQuestion = (q: Question) => {
        switch (q.type) {
            case QuestionType.SHORT_TEXT:
                return <input type="text" value={answers[q.id] || ''} onChange={e => handleInputChange(q.id, e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary" />;
            case QuestionType.LONG_TEXT:
                return <textarea value={answers[q.id] || ''} onChange={e => handleInputChange(q.id, e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary" rows={4} />;
            case QuestionType.EMAIL:
                return <input type="email" value={answers[q.id] || ''} onChange={e => handleInputChange(q.id, e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary" />;
            case QuestionType.PHONE:
                return <input type="tel" value={answers[q.id] || ''} onChange={e => handleInputChange(q.id, e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary" />;
            case QuestionType.RATING:
                return (
                    <div className="flex flex-wrap gap-2 mt-2">
                        {Array.from({ length: 10 }, (_, i) => i + 1).map(num => (
                            <label key={num} className="flex items-center space-x-2 cursor-pointer p-2 border rounded-md hover:bg-gray-100">
                                <input type="radio" name={q.id} value={num} checked={answers[q.id] === num} onChange={e => handleInputChange(q.id, Number(e.target.value))} className="form-radio text-primary focus:ring-primary" />
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
                                <input type="radio" name={q.id} value={opt} checked={answers[q.id] === opt} onChange={e => handleInputChange(q.id, e.target.value)} className="form-radio text-primary focus:ring-primary" />
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
                                <input type="checkbox" checked={(answers[q.id] || []).includes(opt)} onChange={e => handleCheckboxChange(q.id, opt, e.target.checked)} className="form-checkbox text-primary focus:ring-primary rounded" />
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

            {showConfirmationDialog && createPortal(
                <ConfirmationDialog
                    title="Resposta Enviada!"
                    message="O que você gostaria de fazer agora?"
                    confirmText="Enviar Nova Resposta"
                    onConfirm={() => {
                        resetForm();
                        setShowConfirmationDialog(false);
                    }}
                    cancelText="Fechar"
                    onCancel={() => {
                        setShowConfirmationDialog(false);
                        onBack();
                    }}
                />,
                document.body // Renderiza o diálogo diretamente no body do documento
            )}
        </div>
    );
};

export default SurveyForm;