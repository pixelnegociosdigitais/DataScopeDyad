import React, { useState, useEffect } from 'react';
import { Question, QuestionType, Survey } from '../types';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';
import { ArrowUpIcon } from './icons/ArrowUpIcon';
import { ArrowDownIcon } from './icons/ArrowDownIcon';
import { TrashIcon } from './icons/TrashIcon'; // Adicionado para remover perguntas

interface SurveyCreatorProps {
    onSave: (survey: Survey) => void;
    onBack: () => void;
    surveyToEdit?: Survey | null;
    templates: Survey[]; // Novo prop para templates
}

const SurveyCreator: React.FC<SurveyCreatorProps> = ({ onSave, onBack, surveyToEdit, templates }) => {
    const isEditing = !!surveyToEdit;
    const [title, setTitle] = useState(surveyToEdit?.title || '');
    const [questions, setQuestions] = useState<Question[]>(surveyToEdit?.questions || []);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

    useEffect(() => {
        if (surveyToEdit) {
            setTitle(surveyToEdit.title);
            setQuestions(surveyToEdit.questions);
            setSelectedTemplateId(''); // Limpa a seleção de template ao editar
        } else {
            setTitle('');
            setQuestions([]);
            setSelectedTemplateId('');
        }
    }, [surveyToEdit]);

    const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const templateId = e.target.value;
        setSelectedTemplateId(templateId);
        if (templateId) {
            const selectedTemplate = templates.find(t => t.id === templateId);
            if (selectedTemplate) {
                setTitle(selectedTemplate.title);
                // Clonar as perguntas do template para que não haja referência direta
                setQuestions(selectedTemplate.questions.map(q => ({ ...q, id: `q${Date.now()}-${Math.random().toString(36).substring(7)}` })));
            }
        } else {
            setTitle('');
            setQuestions([]);
        }
    };

    const addQuestion = (type: QuestionType) => {
        const newQuestion: Question = {
            id: `q${Date.now()}-${Math.random().toString(36).substring(7)}`, // ID único para cada pergunta
            text: '',
            type: type,
            ...((type === QuestionType.MULTIPLE_CHOICE || type === QuestionType.CHECKBOX) && { options: [''] })
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

    const moveQuestion = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === questions.length - 1) return;

        const newQuestions = [...questions];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        
        [newQuestions[index], newQuestions[targetIndex]] = [newQuestions[targetIndex], newQuestions[index]];
        
        setQuestions(newQuestions);
    };

    const handleSave = () => {
        if (!title.trim() || questions.length === 0 || questions.some(q => !q.text.trim())) {
            alert('Por favor, forneça um título e garanta que todas as perguntas tenham texto.');
            return;
        }
        onSave({ 
            id: surveyToEdit?.id || '', // ID será gerado em App.tsx se for nova pesquisa
            title, 
            companyId: surveyToEdit?.companyId || '', // companyId será definido em App.tsx
            questions 
        });
    };

    const renderQuestionInput = (q: Question, qIndex: number) => {
        switch (q.type) {
            case QuestionType.LONG_TEXT:
                return (
                    <textarea
                        value={q.text}
                        onChange={(e) => updateQuestionText(qIndex, e.target.value)}
                        placeholder="Digite o texto da sua pergunta"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-gray-700 placeholder-gray-400"
                        rows={3}
                    />
                );
            default:
                return (
                    <input
                        type="text"
                        value={q.text}
                        onChange={(e) => updateQuestionText(qIndex, e.target.value)}
                        placeholder="Digite o texto da sua pergunta"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-gray-700 placeholder-gray-400"
                    />
                );
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-200 transition-colors" aria-label="Voltar">
                    <ArrowLeftIcon className="h-6 w-6 text-gray-600" />
                </button>
                <h2 className="text-2xl font-bold text-text-main">{isEditing ? 'Editar Pesquisa' : 'Criar Nova Pesquisa'}</h2>
            </div>
            
            {!isEditing && templates.length > 0 && (
                <div className="bg-white p-8 rounded-lg shadow-md mb-6">
                    <label htmlFor="template-select" className="block text-sm font-medium text-gray-700 mb-2">
                        Começar com um Template:
                    </label>
                    <select
                        id="template-select"
                        value={selectedTemplateId}
                        onChange={handleTemplateChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-gray-700"
                    >
                        <option value="">-- Selecione um template --</option>
                        {templates.map(template => (
                            <option key={template.id} value={template.id}>{template.title}</option>
                        ))}
                    </select>
                </div>
            )}

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
                <div key={q.id} className="bg-white p-6 rounded-lg shadow-md mb-4 flex gap-4">
                    <div className="flex flex-col items-center justify-center">
                        <button onClick={() => moveQuestion(qIndex, 'up')} disabled={qIndex === 0} className="p-1 rounded-full text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed">
                            <ArrowUpIcon />
                        </button>
                        <span className="font-bold text-lg text-primary">{qIndex + 1}</span>
                        <button onClick={() => moveQuestion(qIndex, 'down')} disabled={qIndex === questions.length - 1} className="p-1 rounded-full text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed">
                            <ArrowDownIcon />
                        </button>
                    </div>
                    <div className="flex-1">
                        <div className="flex justify-between items-start">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Pergunta <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{q.type}</span>
                            </label>
                            <button onClick={() => removeQuestion(qIndex)} className="p-1 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-500/10 transition-colors" aria-label="Excluir pergunta">
                                <TrashIcon className="h-5 w-5" />
                            </button>
                        </div>
                        {renderQuestionInput(q, qIndex)}
                        {(q.type === QuestionType.MULTIPLE_CHOICE || q.type === QuestionType.CHECKBOX) && (
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
                                        <button onClick={() => removeOption(qIndex, oIndex)} className="ml-2 p-1 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-500/10 transition-colors" disabled={q.options?.length === 1} aria-label="Remover opção">
                                            <TrashIcon className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                                <button onClick={() => addOption(qIndex)} className="text-sm text-primary hover:text-primary-dark mt-1">+ Adicionar Opção</button>
                            </div>
                        )}
                    </div>
                </div>
            ))}

            <div className="bg-white p-4 rounded-lg shadow-md">
                <span className="text-sm font-medium text-gray-600 mr-4">Adicionar Pergunta:</span>
                <div className="flex flex-wrap gap-2 mt-2">
                    <button onClick={() => addQuestion(QuestionType.SHORT_TEXT)} className="px-3 py-1.5 text-sm font-medium text-white bg-secondary rounded-md hover:bg-green-600">Texto Curto</button>
                    <button onClick={() => addQuestion(QuestionType.LONG_TEXT)} className="px-3 py-1.5 text-sm font-medium text-white bg-secondary rounded-md hover:bg-green-600">Texto Longo</button>
                    <button onClick={() => addQuestion(QuestionType.EMAIL)} className="px-3 py-1.5 text-sm font-medium text-white bg-secondary rounded-md hover:bg-green-600">Email</button>
                    <button onClick={() => addQuestion(QuestionType.PHONE)} className="px-3 py-1.5 text-sm font-medium text-white bg-secondary rounded-md hover:bg-green-600">Telefone</button>
                    <button onClick={() => addQuestion(QuestionType.MULTIPLE_CHOICE)} className="px-3 py-1.5 text-sm font-medium text-white bg-secondary rounded-md hover:bg-green-600">Múltipla Escolha</button>
                    <button onClick={() => addQuestion(QuestionType.CHECKBOX)} className="px-3 py-1.5 text-sm font-medium text-white bg-secondary rounded-md hover:bg-green-600">Caixas de Seleção</button>
                    <button onClick={() => addQuestion(QuestionType.RATING)} className="px-3 py-1.5 text-sm font-medium text-white bg-secondary rounded-md hover:bg-green-600">Avaliação (1-10)</button>
                </div>
            </div>

            <div className="mt-8 flex justify-end">
                <button onClick={handleSave} className="px-6 py-2 font-semibold text-white bg-primary rounded-md hover:bg-primary-dark shadow-sm">
                    {isEditing ? 'Salvar Alterações' : 'Salvar Pesquisa'}
                </button>
            </div>
        </div>
    );
};

export default SurveyCreator;