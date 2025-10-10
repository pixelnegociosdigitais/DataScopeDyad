import React, { useState, useEffect } from 'react';
import { Survey, Question, QuestionType } from '../../types';
import { supabase } from '../integrations/supabase/client';
import { showError, showSuccess } from '../utils/toast';

interface SurveyApplyModalProps {
    survey: Survey;
    onClose: () => void;
}

interface FormAnswer {
    questionId: string;
    answer: string | string[];
}

const SurveyApplyModal: React.FC<SurveyApplyModalProps> = ({ survey, onClose }) => {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(true);
    const [answers, setAnswers] = useState<FormAnswer[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);

    useEffect(() => {
        fetchQuestions();
    }, [survey.id]);

    const fetchQuestions = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('questions')
                .select('*')
                .eq('survey_id', survey.id)
                .order('position', { ascending: true });

            if (error) throw error;
            setQuestions(data || []);
            
            // Initialize answers array
            const initialAnswers: FormAnswer[] = (data || []).map(question => ({
                questionId: question.id,
                answer: question.type === QuestionType.CHECKBOX ? [] : ''
            }));
            setAnswers(initialAnswers);
        } catch (error) {
            console.error('Erro ao buscar perguntas:', error);
            showError('Erro ao carregar perguntas da pesquisa');
        } finally {
            setLoading(false);
        }
    };



    const getQuestionTypeLabel = (type: QuestionType): string => {
        const labels = {
            [QuestionType.SHORT_TEXT]: 'Texto Curto',
            [QuestionType.LONG_TEXT]: 'Texto Longo',
            [QuestionType.PHONE]: 'Telefone',
            [QuestionType.EMAIL]: 'E-mail',
            [QuestionType.MULTIPLE_CHOICE]: 'Múltipla Escolha',
            [QuestionType.CHECKBOX]: 'Caixas de Seleção',
            [QuestionType.RATING]: 'Avaliação'
        };
        return labels[type] || type;
    };

    const handleAnswerChange = (questionId: string, value: string | string[]) => {
        setAnswers(prev => prev.map(answer => 
            answer.questionId === questionId 
                ? { ...answer, answer: value }
                : answer
        ));
    };

    const handleCheckboxChange = (questionId: string, option: string, checked: boolean) => {
        setAnswers(prev => prev.map(answer => {
            if (answer.questionId === questionId) {
                const currentAnswers = Array.isArray(answer.answer) ? answer.answer : [];
                if (checked) {
                    return { ...answer, answer: [...currentAnswers, option] };
                } else {
                    return { ...answer, answer: currentAnswers.filter(a => a !== option) };
                }
            }
            return answer;
        }));
    };

    const validateForm = (): boolean => {
        for (const question of questions) {
            if (question.required) {
                const answer = answers.find(a => a.questionId === question.id);
                if (!answer || 
                    (Array.isArray(answer.answer) && answer.answer.length === 0) ||
                    (!Array.isArray(answer.answer) && !answer.answer.trim())) {
                    showError(`A pergunta "${question.text}" é obrigatória`);
                    return false;
                }
            }
        }
        return true;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        try {
            setSubmitting(true);
            
            // Create survey response
            const { data: responseData, error: responseError } = await supabase
                .from('survey_responses')
                .insert({
                    survey_id: survey.id
                })
                .select()
                .single();

            if (responseError) throw responseError;

            // Create individual answers
            const answerInserts = answers
                .filter(answer => 
                    (Array.isArray(answer.answer) && answer.answer.length > 0) ||
                    (!Array.isArray(answer.answer) && answer.answer.trim())
                )
                .map(answer => ({
                    response_id: responseData.id,
                    question_id: answer.questionId,
                    value: Array.isArray(answer.answer)
                        ? answer.answer.join(', ')
                        : answer.answer
                }));

            if (answerInserts.length > 0) {
                const { error: answersError } = await supabase
                    .from('answers')
                    .insert(answerInserts);

                if (answersError) throw answersError;
            }

            showSuccess('Respostas enviadas com sucesso!');
            setShowConfirmation(true);
            setShowForm(false);
        } catch (error) {
            console.error('Erro ao enviar respostas:', error);
            showError('Erro ao enviar respostas. Tente novamente.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleNewResponse = () => {
        // Reset form state
        setShowConfirmation(false);
        setShowForm(true);
        
        // Reset answers
        const initialAnswers: FormAnswer[] = questions.map(question => ({
            questionId: question.id,
            answer: question.type === QuestionType.CHECKBOX ? [] : ''
        }));
        setAnswers(initialAnswers);
    };

    const handleCloseForm = () => {
        onClose();
    };

    const renderQuestionInput = (question: Question) => {
        const answer = answers.find(a => a.questionId === question.id);
        const currentAnswer = answer?.answer || '';

        switch (question.type) {
            case QuestionType.SHORT_TEXT:
                return (
                    <input
                        type="text"
                        value={Array.isArray(currentAnswer) ? '' : currentAnswer}
                        onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="Digite sua resposta..."
                        required={question.required}
                    />
                );

            case QuestionType.LONG_TEXT:
                return (
                    <textarea
                        value={Array.isArray(currentAnswer) ? '' : currentAnswer}
                        onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                        rows={4}
                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent resize-vertical"
                        placeholder="Digite sua resposta..."
                        required={question.required}
                    />
                );

            case QuestionType.PHONE:
                return (
                    <input
                        type="tel"
                        value={Array.isArray(currentAnswer) ? '' : currentAnswer}
                        onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="(00) 00000-0000"
                        required={question.required}
                    />
                );

            case QuestionType.EMAIL:
                return (
                    <input
                        type="email"
                        value={Array.isArray(currentAnswer) ? '' : currentAnswer}
                        onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="seu@email.com"
                        required={question.required}
                    />
                );

            case QuestionType.MULTIPLE_CHOICE:
                return (
                    <div className="space-y-2">
                        {question.options?.map((option, index) => (
                            <label key={index} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                                <input
                                    type="radio"
                                    name={`question-${question.id}`}
                                    value={option}
                                    checked={currentAnswer === option}
                                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                                    className="w-4 h-4 text-primary focus:ring-primary"
                                    required={question.required}
                                />
                                <span className="text-gray-700">{option}</span>
                            </label>
                        ))}
                    </div>
                );

            case QuestionType.CHECKBOX:
                return (
                    <div className="space-y-2">
                        {question.options?.map((option, index) => (
                            <label key={index} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={Array.isArray(currentAnswer) && currentAnswer.includes(option)}
                                    onChange={(e) => handleCheckboxChange(question.id, option, e.target.checked)}
                                    className="w-4 h-4 text-primary focus:ring-primary rounded"
                                />
                                <span className="text-gray-700">{option}</span>
                            </label>
                        ))}
                    </div>
                );

            case QuestionType.RATING:
                return (
                    <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((rating) => (
                            <button
                                key={rating}
                                type="button"
                                onClick={() => handleAnswerChange(question.id, rating.toString())}
                                className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-medium transition-colors ${
                                    currentAnswer === rating.toString()
                                        ? 'bg-primary text-white border-primary'
                                        : 'border-gray-300 text-gray-600 hover:border-primary hover:text-primary'
                                }`}
                            >
                                {rating}
                            </button>
                        ))}
                    </div>
                );

            default:
                return (
                    <input
                        type="text"
                        value={Array.isArray(currentAnswer) ? '' : currentAnswer}
                        onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="Digite sua resposta..."
                        required={question.required}
                    />
                );
        }
    };

    // Priorizar tela de confirmação sobre tela de visualização
    if (!showForm && !showConfirmation) {

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
                    <div className="p-6 border-b border-gray-200">
                        <div className="flex justify-between items-start">
                            <h2 className="text-xl font-bold text-gray-900">
                                Aplicar Pesquisa: {survey.title}
                            </h2>
                            <button
                                onClick={onClose}
                                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                            >
                                ×
                            </button>
                        </div>
                        <p className="text-gray-600 mt-2">
                            Visualize as perguntas desta pesquisa antes de aplicá-la
                        </p>
                    </div>

                    <div className="p-6 overflow-y-auto max-h-[60vh]">
                        {loading ? (
                            <div className="flex justify-center items-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                <span className="ml-2 text-gray-600">Carregando perguntas...</span>
                            </div>
                        ) : questions.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-gray-500 text-lg">
                                    Esta pesquisa ainda não possui perguntas.
                                </p>
                                <p className="text-gray-400 text-sm mt-2">
                                    Adicione perguntas antes de aplicar a pesquisa.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="mb-4">
                                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                                        Perguntas da Pesquisa ({questions.length})
                                    </h3>
                                </div>
                                
                                {questions.map((question, index) => (
                                    <div key={question.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="bg-primary text-white text-sm px-2 py-1 rounded-full font-medium">
                                                        {index + 1}
                                                    </span>
                                                    <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full">
                                                        {getQuestionTypeLabel(question.type)}
                                                    </span>
                                                    {question.required && (
                                                        <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
                                                            Obrigatória
                                                        </span>
                                                    )}
                                                </div>
                                                <h4 className="text-base font-medium text-gray-900 mb-2">
                                                    {question.text}
                                                </h4>
                                            </div>
                                        </div>

                                        {question.options && question.options.length > 0 && (
                                            <div className="mt-3">
                                                <p className="text-sm font-medium text-gray-700 mb-2">Opções:</p>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                    {question.options.map((option, optionIndex) => (
                                                        <div key={optionIndex} className="flex items-center gap-2 text-sm text-gray-600 bg-white p-2 rounded border">
                                                            <span className="w-4 h-4 border border-gray-300 rounded-sm flex-shrink-0"></span>
                                                            {option}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {question.type === QuestionType.RATING && (
                                            <div className="mt-3">
                                                <p className="text-sm font-medium text-gray-700 mb-2">Escala de Avaliação:</p>
                                                <div className="flex gap-2">
                                                    {[1, 2, 3, 4, 5].map((rating) => (
                                                        <div key={rating} className="w-8 h-8 border border-gray-300 rounded-full flex items-center justify-center text-sm text-gray-600">
                                                            {rating}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="p-6 border-t border-gray-200 bg-gray-50">
                        <div className="flex flex-col sm:flex-row gap-4 justify-end">
                            <button
                                onClick={onClose}
                                className="btn-outline-mobile order-2 sm:order-1"
                            >
                                Fechar
                            </button>
                            {questions.length > 0 && (
                                <button
                                    onClick={() => setShowForm(true)}
                                    className="btn-danger-mobile order-1 sm:order-2"
                                >
                                    Aplicar
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
                {showConfirmation ? (
                    // Confirmation screen
                    <>
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex justify-between items-start">
                                <h2 className="text-xl font-bold text-gray-900">
                                    Respostas Enviadas com Sucesso!
                                </h2>
                                <button
                                    onClick={handleCloseForm}
                                    className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                                >
                                    ×
                                </button>
                            </div>
                        </div>

                        <div className="p-8 flex-1 flex flex-col items-center justify-center text-center">
                            <div className="mb-6">
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                    Obrigado pela sua participação!
                                </h3>
                                <p className="text-gray-600">
                                    Suas respostas foram registradas com sucesso. O que você gostaria de fazer agora?
                                </p>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4">
                                <button
                                    onClick={handleNewResponse}
                                    className="btn-primary-mobile flex-1 sm:flex-none"
                                >
                                    Enviar Nova Resposta
                                </button>
                                <button
                                    onClick={handleCloseForm}
                                    className="btn-outline-mobile flex-1 sm:flex-none"
                                >
                                    Fechar Formulário
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    // Form screen
                    <>
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex justify-between items-start">
                                <h2 className="text-xl font-bold text-gray-900">
                                    Responder Pesquisa: {survey.title}
                                </h2>
                                <button
                                    onClick={onClose}
                                    className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                                >
                                    ×
                                </button>
                            </div>
                            <p className="text-gray-600 mt-2">
                                Preencha as respostas para cada pergunta abaixo
                            </p>
                        </div>

                        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="flex-1 flex flex-col">
                            <div className="p-6 overflow-y-auto max-h-[60vh] flex-1">
                                <div className="space-y-6">
                                    {questions.map((question, index) => (
                                        <div key={question.id} className="border border-gray-200 rounded-lg p-6 bg-white">
                                            <div className="mb-4">
                                                <div className="flex items-center gap-3 mb-4">
                                                    <span className="bg-primary text-white text-sm px-2 py-1 rounded-full font-medium">
                                                        {index + 1}
                                                    </span>
                                                    <h4 className="text-lg font-medium text-gray-900 flex-1">
                                                        {question.text}
                                                        {question.required && <span className="text-red-500 ml-1">*</span>}
                                                    </h4>
                                                    {question.required && (
                                                        <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
                                                            Obrigatória
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            <div className="mt-4">
                                                {renderQuestionInput(question)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="p-6 border-t border-gray-200 bg-gray-50">
                                <div className="flex flex-col sm:flex-row justify-between gap-4">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="btn-outline-mobile order-2 sm:order-1"
                                    >
                                        ← Voltar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className={`btn-secondary-mobile order-1 sm:order-2 flex items-center justify-center gap-2 ${submitting ? 'btn-disabled-mobile' : ''}`}
                                    >
                                        {submitting ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                Enviando...
                                            </>
                                        ) : (
                                            'Enviar Respostas'
                                        )}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
};

export default SurveyApplyModal;