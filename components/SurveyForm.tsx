import React, { useState } from 'react';
import { Survey, Question, QuestionType, Answer } from '../types';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';
import { showSuccess } from '../src/utils/toast'; // Importar showSuccess

interface SurveyFormProps {
    survey: Survey;
    onSaveResponse: (answers: Answer[]) => Promise<boolean>; // Atualizado para Promise<boolean>
    onBack: () => void;
}

const SurveyForm: React.FC<SurveyFormProps> = ({ survey, onSaveResponse, onBack }) => {
    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [showConfirmationDialog, setShowConfirmationDialog] = useState(false); // Novo estado para o diálogo

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
        // Se houver outros estados de formulário que precisam ser limpos, adicione-os aqui
    };

    const handleSubmit = async (e: React.FormEvent) => { // Tornar a função assíncrona
        e.preventDefault();
        const formattedAnswers: Answer[] = Object.entries(answers).map(([questionId, value]) => ({
            questionId,
            value,
        }));
        
        const success = await onSaveResponse(formattedAnswers); // Aguardar o resultado do salvamento
        // console.log('Survey response save success:', success); // Removido o log de depuração
        if (success) {
            showSuccess('Resposta enviada com sucesso!'); // Agora o toast é disparado aqui
            setShowConfirmationDialog(true);
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

            {showConfirmationDialog && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-8 rounded-lg shadow-xl text-center max-w-sm mx-auto">
                        <h3 className="text-xl font-bold text-text-main mb-4">Resposta Enviada!</h3>
                        <p className="text-text-light mb-6">O que você gostaria de fazer agora?</p>
                        <div className="flex justify-center gap-4">
                            <button
                                onClick={() => {
                                    resetForm();
                                    setShowConfirmationDialog(false);
                                }}
                                className="px-6 py-2 font-semibold text-white bg-primary rounded-md hover:bg-primary-dark shadow-sm"
                            >
                                Enviar Nova Resposta
                            </button>
                            <button
                                onClick={() => {
                                    setShowConfirmationDialog(false);
                                    onBack(); // Navega de volta para a lista de pesquisas
                                }}
                                className="px-6 py-2 font-semibold text-primary border border-primary rounded-md hover:bg-primary/10 shadow-sm"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SurveyForm;