import React, { useState, useEffect } from 'react';
import { Survey, Question, QuestionType } from '../../types';
import { supabase } from '../integrations/supabase/client';
import { showError } from '../utils/toast';

interface SurveyApplyModalProps {
    survey: Survey;
    onClose: () => void;
}

const SurveyApplyModal: React.FC<SurveyApplyModalProps> = ({ survey, onClose }) => {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchQuestions = async () => {
            try {
                setLoading(true);
                const { data, error } = await supabase
                    .from('questions')
                    .select('*')
                    .eq('survey_id', survey.id)
                    .order('order_index', { ascending: true });

                if (error) {
                    console.error('Erro ao buscar perguntas:', error);
                    showError('Erro ao carregar as perguntas da pesquisa.');
                    return;
                }

                setQuestions(data || []);
            } catch (error) {
                console.error('Erro ao buscar perguntas:', error);
                showError('Erro ao carregar as perguntas da pesquisa.');
            } finally {
                setLoading(false);
            }
        };

        fetchQuestions();
    }, [survey.id]);

    const getQuestionTypeLabel = (type: QuestionType): string => {
        switch (type) {
            case QuestionType.SHORT_TEXT:
                return 'Texto Curto';
            case QuestionType.LONG_TEXT:
                return 'Texto Longo';
            case QuestionType.MULTIPLE_CHOICE:
                return 'Múltipla Escolha';
            case QuestionType.SINGLE_CHOICE:
                return 'Escolha Única';
            case QuestionType.RATING:
                return 'Avaliação';
            case QuestionType.EMAIL:
                return 'E-mail';
            case QuestionType.PHONE:
                return 'Telefone';
            case QuestionType.DATE:
                return 'Data';
            case QuestionType.NUMBER:
                return 'Número';
            default:
                return 'Desconhecido';
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-bold text-gray-900">
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
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 font-medium"
                        >
                            Fechar
                        </button>
                        {questions.length > 0 && (
                            <button
                                onClick={() => {
                                    // Aqui você pode implementar a lógica para realmente aplicar a pesquisa
                                    // Por exemplo, redirecionar para o formulário de resposta
                                    window.open(`/responder-pesquisa/${survey.id}`, '_blank');
                                }}
                                className="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary-dark font-medium"
                            >
                                Aplicar Pesquisa
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SurveyApplyModal;