import React, { useState, useEffect } from 'react';
import { ArrowLeftIcon } from '@/components/icons/ArrowLeftIcon';
import { TemplateIcon } from '@/components/icons/TemplateIcon';
import { CreateIcon } from '@/components/icons/CreateIcon';
import { PencilIcon } from '@/components/icons/PencilIcon';
import { TrashIcon } from '@/components/icons/TrashIcon';
import { Survey, Question, QuestionType, ModuleName } from '../../types';
import { showError } from '../utils/toast';
import ConfirmationDialog from './ConfirmationDialog';
import { useAuth } from '../hooks/useAuth'; // Import useAuth

interface SurveyTemplateManagerProps {
    onBack: () => void;
    templates: Survey[];
    onSaveTemplate: (templateData: Survey, editingTemplateId?: string) => Promise<void>;
    onDeleteTemplate: (templateId: string) => Promise<boolean>;
}

const ALL_QUESTION_TYPES = [
    { type: QuestionType.SHORT_TEXT, label: 'Texto Curto' },
    { type: QuestionType.LONG_TEXT, label: 'Texto Longo' },
    { type: QuestionType.EMAIL, label: 'Email' },
    { type: QuestionType.PHONE, label: 'Telefone' },
    { type: QuestionType.MULTIPLE_CHOICE, label: 'Múltipla Escolha' },
    { type: QuestionType.CHECKBOX, label: 'Caixas de Seleção' },
    { type: QuestionType.RATING, label: 'Avaliação (1-10)' },
];

const SurveyTemplateManager: React.FC<SurveyTemplateManagerProps> = ({
    onBack,
    templates,
    onSaveTemplate,
    onDeleteTemplate,
}) => {
    const { modulePermissions: authModulePermissions } = useAuth(() => {});
    const canManageTemplates = authModulePermissions[ModuleName.MANAGE_SURVEY_TEMPLATES];

    const [showTemplateForm, setShowTemplateForm] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<Survey | null>(null);
    const [templateFormTitle, setTemplateFormTitle] = useState('');
    const [templateFormQuestions, setTemplateFormQuestions] = useState<Question[]>([]);
    const [showDeleteTemplateDialog, setShowDeleteTemplateDialog] = useState(false);
    const [templateToDelete, setTemplateToDelete] = useState<Survey | null>(null);

    const handleOpenTemplateForm = useCallback((template: Survey | null = null) => {
        if (!canManageTemplates) {
            showError('Você não tem permissão para criar ou editar modelos de pesquisa.');
            return;
        }
        setEditingTemplate(template);
        setTemplateFormTitle(template?.title || '');
        setTemplateFormQuestions(template?.questions || []);
        setShowTemplateForm(true);
    }, [canManageTemplates]);

    const handleCloseTemplateForm = useCallback(() => {
        setShowTemplateForm(false);
        setEditingTemplate(null);
        setTemplateFormTitle('');
        setTemplateFormQuestions([]);
    }, []);

    const handleSaveTemplateForm = useCallback(async () => {
        if (!templateFormTitle.trim() || templateFormQuestions.length === 0 || templateFormQuestions.some(q => !q.text.trim())) {
            showError('Por favor, forneça um título e garanta que todas as perguntas tenham texto.');
            return;
        }

        const templateData: Survey = {
            id: editingTemplate?.id || '',
            title: templateFormTitle,
            questions: templateFormQuestions,
            companyId: '',
        };

        await onSaveTemplate(templateData, editingTemplate?.id);
        handleCloseTemplateForm();
    }, [templateFormTitle, templateFormQuestions, editingTemplate, onSaveTemplate, handleCloseTemplateForm]);

    const confirmDeleteTemplate = useCallback((template: Survey) => {
        if (!canManageTemplates) {
            showError('Você não tem permissão para excluir modelos de pesquisa.');
            return;
        }
        setTemplateToDelete(template);
        setShowDeleteTemplateDialog(true);
    }, [canManageTemplates]);

    const handleDeleteTemplateConfirmed = useCallback(async () => {
        if (templateToDelete) {
            await onDeleteTemplate(templateToDelete.id);
        }
        setShowDeleteTemplateDialog(false);
        setTemplateToDelete(null);
    }, [templateToDelete, onDeleteTemplate]);

    const addQuestion = useCallback((type: QuestionType, initialText: string = '') => {
        const newQuestion: Question = {
            id: `q${Date.now()}-${Math.random().toString(36).substring(7)}`,
            text: initialText,
            type: type,
            position: templateFormQuestions.length,
            ...((type === QuestionType.MULTIPLE_CHOICE || type === QuestionType.CHECKBOX) && { options: [''] })
        };
        setTemplateFormQuestions(prev => [...prev, newQuestion]);
    }, [templateFormQuestions]);

    const updateQuestionText = useCallback((index: number, text: string) => {
        setTemplateFormQuestions(prev => prev.map((q, i) => i === index ? { ...q, text } : q));
    }, []);

    const updateOptionText = useCallback((qIndex: number, oIndex: number, text: string) => {
        setTemplateFormQuestions(prev => prev.map((q, i) => {
            if (i === qIndex && q.options) {
                const newOptions = [...q.options];
                newOptions[oIndex] = text;
                return { ...q, options: newOptions };
            }
            return q;
        }));
    }, []);

    const addOption = useCallback((qIndex: number) => {
        setTemplateFormQuestions(prev => prev.map((q, i) => {
            if (i === qIndex && q.options) {
                return { ...q, options: [...q.options, ''] };
            }
            return q;
        }));
    }, []);

    const removeOption = useCallback((qIndex: number, oIndex: number) => {
        setTemplateFormQuestions(prev => prev.map((q, i) => {
            if (i === qIndex && q.options && q.options.length > 1) {
                const newOptions = [...q.options];
                newOptions.splice(oIndex, 1);
                return { ...q, options: newOptions };
            }
            return q;
        }));
    }, []);

    const removeQuestion = useCallback((index: number) => {
        setTemplateFormQuestions(prev => prev.filter((_, i) => i !== index));
    }, []);

    const moveQuestion = useCallback((index: number, direction: 'up' | 'down') => {
        setTemplateFormQuestions(prev => {
            if ((direction === 'up' && index === 0) || (direction === 'down' && index === prev.length - 1)) {
                return prev;
            }

            const newQuestions = [...prev];
            const targetIndex = direction === 'up' ? index - 1 : index + 1;
            
            [newQuestions[index], newQuestions[targetIndex]] = [newQuestions[targetIndex], newQuestions[index]];
            
            return newQuestions;
        });
    }, []);

    const renderQuestionInput = useCallback((q: Question, qIndex: number) => {
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
    }, [updateQuestionText]);

    if (!canManageTemplates) {
        return (
            <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-md text-center">
                <TemplateIcon className="h-12 w-12 text-primary mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-text-main mb-4">Gerenciar Modelos de Pesquisa</h2>
                <p className="text-text-light mb-6">Você não tem permissão para gerenciar modelos de pesquisa.</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-200 transition-colors" aria-label="Voltar">
                    <ArrowLeftIcon className="h-6 w-6 text-gray-600" />
                </button>
                <TemplateIcon className="h-8 w-8 text-primary" />
                <h2 className="text-2xl font-bold text-text-main">Gerenciar Modelos de Pesquisa</h2>
            </div>
            <p className="text-text-light mb-6">
                Crie e edite modelos de pesquisa que estarão disponíveis para os administradores ao criar novas pesquisas.
            </p>

            <div className="mb-6 flex justify-end">
                <button
                    onClick={() => handleOpenTemplateForm()}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark"
                >
                    <CreateIcon className="h-4 w-4" /> Novo Modelo
                </button>
            </div>

            {templates.length === 0 ? (
                <div className="text-center py-8 bg-white rounded-lg shadow-md">
                    <p className="text-text-light">Nenhum modelo encontrado. Crie seu primeiro modelo!</p>
                </div>
            ) : (
                <>
                    {/* Desktop Table View */}
                    <div className="hidden md:block bg-white shadow-md rounded-lg overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Título do Modelo
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Perguntas
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Ações
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {templates.map((template) => (
                                    <tr key={template.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-main">
                                            {template.title}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-text-light">
                                            {(template.questions || []).length} perguntas
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end space-x-2">
                                                <button
                                                    onClick={() => handleOpenTemplateForm(template)}
                                                    className="text-primary hover:text-primary-dark p-2 rounded-full hover:bg-primary/10"
                                                    title="Editar Modelo"
                                                >
                                                    <PencilIcon className="h-5 w-5" />
                                                </button>
                                                <button
                                                    onClick={() => confirmDeleteTemplate(template)}
                                                    className="text-red-600 hover:text-red-900 p-2 rounded-full hover:bg-red-50"
                                                    title="Excluir Modelo"
                                                >
                                                    <TrashIcon className="h-5 w-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-4">
                        {templates.map((template) => (
                            <div key={template.id} className="bg-white rounded-lg shadow-md p-4">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-sm font-medium text-text-main truncate">
                                            {template.title}
                                        </h3>
                                        <p className="text-xs text-text-light mt-1">
                                            {(template.questions || []).length} perguntas
                                        </p>
                                    </div>
                                    <div className="flex space-x-2 ml-3">
                                        <button
                                            onClick={() => handleOpenTemplateForm(template)}
                                            className="text-primary hover:text-primary-dark p-2 rounded-full hover:bg-primary/10"
                                            title="Editar Modelo"
                                        >
                                            <PencilIcon className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => confirmDeleteTemplate(template)}
                                            className="text-red-600 hover:text-red-900 p-2 rounded-full hover:bg-red-50"
                                            title="Excluir Modelo"
                                        >
                                            <TrashIcon className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {showTemplateForm && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white p-4 sm:p-8 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg sm:text-xl font-bold text-text-main mb-4">{editingTemplate ? 'Editar Modelo' : 'Criar Novo Modelo'}</h3>
                        <div className="space-y-6">
                            <div>
                                <label htmlFor="template-title" className="block text-sm font-medium text-gray-700">Título do Modelo</label>
                                <input
                                    type="text"
                                    id="template-title"
                                    value={templateFormTitle}
                                    onChange={(e) => setTemplateFormTitle(e.target.value)}
                                    placeholder="ex: Modelo de Pesquisa de Satisfação"
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-gray-700 placeholder-gray-400"
                                    required
                                />
                            </div>

                            {templateFormQuestions.map((q, qIndex) => (
                                <div key={q.id} className="bg-gray-50 p-4 rounded-lg shadow-sm flex flex-col sm:flex-row gap-4">
                                    <div className="flex flex-col items-center justify-center">
                                        <button onClick={() => moveQuestion(qIndex, 'up')} disabled={qIndex === 0} className="p-1 rounded-full text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed">
                                            <ArrowLeftIcon className="h-4 w-4 rotate-90" />
                                        </button>
                                        <span className="font-bold text-lg text-primary">{qIndex + 1}</span>
                                        <button onClick={() => moveQuestion(qIndex, 'down')} disabled={qIndex === templateFormQuestions.length - 1} className="p-1 rounded-full text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed">
                                            <ArrowLeftIcon className="h-4 w-4 -rotate-90" />
                                        </button>
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex flex-col sm:flex-row sm:justify-between items-start gap-3">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Pergunta <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{q.type}</span>
                                            </label>
                                            {renderQuestionInput(q, qIndex)}
                                            {(q.type === QuestionType.MULTIPLE_CHOICE || q.type === QuestionType.CHECKBOX) && (
                                                <div className="mt-4 sm:mt-0 w-full sm:w-96 sm:ml-4 border-t-2 sm:border-t-0 sm:border-l-2 border-primary/20 pt-4 sm:pt-0 sm:pl-4">
                                                    <h4 className="text-xs font-semibold text-gray-600 mb-2">OPÇÕES</h4>
                                                    {q.options?.map((opt, oIndex) => (
                                                        <div key={oIndex} className="flex items-center gap-2 mb-2">
                                                            <input
                                                                type="text"
                                                                value={opt}
                                                                onChange={(e) => updateOptionText(qIndex, oIndex, e.target.value)}
                                                                placeholder={`Opção ${oIndex + 1}`}
                                                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm text-base sm:text-sm focus:outline-none focus:ring-primary focus:border-primary text-gray-700 placeholder-gray-400"
                                                            />
                                                            <button onClick={() => removeOption(qIndex, oIndex)} className="flex-shrink-0 p-2 sm:p-1 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-500/10 transition-colors" disabled={q.options?.length === 1} aria-label="Remover opção">
                                                                <TrashIcon className="h-5 w-5 sm:h-4 sm:w-4" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                    <button onClick={() => addOption(qIndex)} className="text-base sm:text-sm text-primary hover:text-primary-dark mt-1">+ ADICIONAR OPÇÃO</button>
                                                </div>
                                            )}
                                        </div>
                                        <button onClick={() => removeQuestion(qIndex)} className="p-1 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-500/10 transition-colors" aria-label="Excluir pergunta">
                                            <TrashIcon className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>
                            ))}

                            <div className="bg-white p-4 rounded-lg shadow-md">
                                <span className="text-sm font-medium text-gray-700 mb-2">ADICIONAR PERGUNTA RÁPIDA:</span>
                                <div className="flex flex-wrap gap-2 mt-2 mb-4 border-b pb-4">
                                    <button type="button" onClick={() => addQuestion(QuestionType.SHORT_TEXT, 'Nome Completo')} className="px-3 py-1.5 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark">Nome</button>
                                    <button type="button" onClick={() => addQuestion(QuestionType.PHONE, 'Telefone')} className="px-3 py-1.5 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark">Telefone</button>
                                    <button type="button" onClick={() => addQuestion(QuestionType.LONG_TEXT, 'Endereço Completo')} className="px-3 py-1.5 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark">Endereço</button>
                                    <button type="button" onClick={() => addQuestion(QuestionType.EMAIL, 'E-mail')} className="px-3 py-1.5 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark">E-mail</button>
                                </div>

                                <span className="text-sm font-medium text-gray-700 mr-4">ADICIONAR OUTRO TIPO DE PERGUNTA:</span>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {ALL_QUESTION_TYPES.map(qType => (
                                        <button key={qType.type} type="button" onClick={() => addQuestion(qType.type)} className="px-3 py-1.5 text-sm font-medium text-white bg-secondary rounded-md hover:bg-green-600">
                                            {qType.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <button onClick={handleCloseTemplateForm} className="px-4 py-2 font-semibold text-gray-700 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors">Cancelar</button>
                            <button onClick={handleSaveTemplateForm} className="px-4 py-2 font-semibold text-white bg-primary rounded-md hover:bg-primary-dark transition-colors">{editingTemplate ? 'Salvar Alterações' : 'Criar Modelo'}</button>
                        </div>
                    </div>
                </div>
            )}

            {showDeleteTemplateDialog && templateToDelete && (
                <ConfirmationDialog
                    title="Confirmar Exclusão de Modelo"
                    message={`Tem certeza que deseja excluir o modelo "${templateToDelete.title}"? Esta ação não pode ser desfeita.`}
                    confirmText="Excluir"
                    onConfirm={handleDeleteTemplateConfirmed}
                    cancelText="Cancelar"
                    onCancel={() => setShowDeleteTemplateDialog(false)}
                />
            )}
        </div>
    );
};

export default SurveyTemplateManager;