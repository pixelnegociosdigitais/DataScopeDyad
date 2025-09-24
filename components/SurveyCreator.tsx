import React, { useState } from 'react';
import { Question, QuestionType, Survey } from '../types';

interface SurveyCreatorProps {
    onSave: (survey: Survey) => void;
}

const SurveyCreator: React.FC<SurveyCreatorProps> = ({ onSave }) => {
    const [title, setTitle] = useState('');
    const [questions, setQuestions] = useState<Question[]>([]);

    const addQuestion = (type: QuestionType) => {
        const newQuestion: Question = {
            id: `q${Date.now()}`,
            text: '',
            type: type,
            ...(type === QuestionType.MULTIPLE_CHOICE && { options: [''] })
        };
        setQuestions([...questions, newQuestion]);
    };

    const updateQuestionText = (index: number, text: string) => {
        const newQuestions = [...questions];
        newQuestions[index].text = text;
        setQuestions(newQuestions);
    };

    const updateOptionText = (qIndex: number, oIndex: number, text: string) => {
        const newQuestions = [...questions];
        if (newQuestions[qIndex].options) {
            newQuestions[qIndex].options![oIndex] = text;
            setQuestions(newQuestions);
        }
    };

    const addOption = (qIndex: number) => {
        const newQuestions = [...questions];
        if (newQuestions[qIndex].options) {
            newQuestions[qIndex].options!.push('');
            setQuestions(newQuestions);
        }
    };

    const removeOption = (qIndex: number, oIndex: number) => {
        const newQuestions = [...questions];
        if (newQuestions[qIndex].options && newQuestions[qIndex].options!.length > 1) {
            newQuestions[qIndex].options!.splice(oIndex, 1);
            setQuestions(newQuestions);
        }
    };

    const removeQuestion = (index: number) => {
        const newQuestions = [...questions];
        newQuestions.splice(index, 1);
        setQuestions(newQuestions);
    };

    const handleSave = () => {
        // Validação básica
        if (!title.trim() || questions.length === 0 || questions.some(q => !q.text.trim())) {
            alert('Por favor, forneça um título e garanta que todas as perguntas tenham texto.');
            return;
        }
        onSave({ id: '', title, companyId: '', questions });
    };

    return (
        <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-text-main">Criar Nova Pesquisa</h2>
            <div className="bg-white p-8 rounded-lg shadow-md mb-6">
                <label htmlFor="survey-title" className="block text-sm font-medium text-gray-700">Título da Pesquisa</label>
                <input
                    type="text"
                    id="survey-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="ex: Pesquisa de Satisfação do Cliente"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-gray-700 placeholder-gray-400"
                />
            </div>

            {questions.map((q, qIndex) => (
                <div key={q.id} className="bg-white p-6 rounded-lg shadow-md mb-4 relative">
                    <button onClick={() => removeQuestion(qIndex)} className="absolute top-4 right-4 text-gray-400 hover:text-red-500">
                        &times;
                    </button>
                    <label className="block text-sm font-medium text-gray-700">Pergunta {qIndex + 1} ({q.type})</label>
                    <input
                        type="text"
                        value={q.text}
                        onChange={(e) => updateQuestionText(qIndex, e.target.value)}
                        placeholder="Digite o texto da sua pergunta"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-gray-700 placeholder-gray-400"
                    />
                    {q.type === QuestionType.MULTIPLE_CHOICE && (
                        <div className="mt-4 pl-4 border-l-2 border-primary/20">
                            <h4 className="text-xs font-semibold text-gray-600 mb-2">Opções</h4>
                            {q.options?.map((opt, oIndex) => (
                                <div key={oIndex} className="flex items-center mb-2">
                                    <input
                                        type="text"
                                        value={opt}
                                        onChange={(e) => updateOptionText(qIndex, oIndex, e.target.value)}
                                        placeholder={`Opção ${oIndex + 1}`}
                                        className="block w-full sm:w-1/2 px-3 py-1.5 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-primary focus:border-primary text-gray-700 placeholder-gray-400"
                                    />
                                    <button onClick={() => removeOption(qIndex, oIndex)} className="ml-2 text-gray-400 hover:text-red-500" disabled={q.options?.length === 1}>
                                        &minus;
                                    </button>
                                </div>
                            ))}
                            <button onClick={() => addOption(qIndex)} className="text-sm text-primary hover:text-primary-dark mt-1">
                                + Adicionar Opção
                            </button>
                        </div>
                    )}
                </div>
            ))}

            <div className="bg-white p-4 rounded-lg shadow-md flex items-center justify-center gap-4">
                <span className="text-sm font-medium text-gray-600">Adicionar Pergunta:</span>
                <button onClick={() => addQuestion(QuestionType.TEXT)} className="px-4 py-2 text-sm font-medium text-white bg-secondary rounded-md hover:bg-green-600">Texto</button>
                <button onClick={() => addQuestion(QuestionType.MULTIPLE_CHOICE)} className="px-4 py-2 text-sm font-medium text-white bg-secondary rounded-md hover:bg-green-600">Múltipla Escolha</button>
                <button onClick={() => addQuestion(QuestionType.RATING)} className="px-4 py-2 text-sm font-medium text-white bg-secondary rounded-md hover:bg-green-600">Avaliação (1-5)</button>
            </div>

            <div className="mt-8 flex justify-end">
                <button onClick={handleSave} className="px-6 py-2 font-semibold text-white bg-primary rounded-md hover:bg-primary-dark shadow-sm">
                    Salvar Pesquisa
                </button>
            </div>
        </div>
    );
};

export default SurveyCreator;