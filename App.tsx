import React, { useState, useCallback, useEffect, useRef } from 'react';
import { UserRole, View, Survey, ModuleName, Notice } from './types';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import SurveyTableList from './src/components/SurveyTableList';
import SurveyCreator from './components/SurveyCreator';
import Dashboard from './components/Dashboard';
import Profile from './components/Profile';
import SurveyForm from './components/SurveyForm';
import Login from './components/Login';
import CompanySettings from './components/CompanySettings';
import CompanyCreationForm from './components/CompanyCreationForm';
import Giveaways from './components/Giveaways';
import SettingsPanel from './components/SettingsPanel';
import ModulePermissionsManager from './components/ModulePermissionsManager';
import DeveloperCompanyUserManager from './components/DeveloperCompanyUserManager';
import AdministratorUserManager from './src/components/AdministratorUserManager';
import LogsAndAuditPanel from './components/LogsAndAuditPanel';
import JoinCompanyPrompt from './components/JoinCompanyPrompt';
import NoticeCreator from './src/components/NoticeCreator';
import ChatLayout from './src/components/chat/ChatLayout';
import SurveyTemplateManager from './src/components/SurveyTemplateManager';
import { ChatIcon } from './components/icons/ChatIcon';
import { ArrowLeftIcon } from './components/icons/ArrowLeftIcon';
import { supabase } from './src/integrations/supabase/client';
import { useAuthSession } from './src/context/AuthSessionContext';
import { useAuth } from './src/hooks/useAuth';
import { useSurveys } from './src/hooks/useSurveys';
import { showError, showSuccess } from './src/utils/toast';
import ConfirmationDialog from './src/components/ConfirmationDialog';
import { generatePdfReport } from './src/utils/pdfGenerator';

const App: React.FC = () => {
    const { session, loadingSession } = useAuthSession();
    const [currentView, setCurrentView] = useState<View>(View.SURVEY_LIST);
    const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);
    const [editingSurvey, setEditingSurvey] = useState<Survey | null>(null);
    const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
    const [activeNotice, setActiveNotice] = useState<Notice | null>(null);
    const [showDeleteSurveyConfirm, setShowDeleteSurveyConfirm] = useState(false);
    const [surveyToDelete, setSurveyToDelete] = useState<Survey | null>(null);

    const dashboardRef = useRef<HTMLDivElement | null>(null);

    const {
        currentUser,
        currentCompany,
        loadingAuth,
        handleCreateCompany,
        handleUpdateProfile,
        handleUpdateCompany,
        modulePermissions,
    } = useAuth(setCurrentView);

    const {
        surveys,
        surveyResponses,
        templates,
        loadingSurveys,
        fetchSurveyResponses,
        handleSaveSurvey,
        handleDeleteSurvey,
        handleSaveResponse,
        fetchSurveys,
        handleSaveTemplate,
        handleDeleteTemplate,
    } = useSurveys(currentCompany, currentUser);

    useEffect(() => {
        if (loadingSession || loadingAuth || loadingSurveys) {
            console.log('App: Global loading state active. loadingSession:', loadingSession, 'loadingAuth:', loadingAuth, 'loadingSurveys:', loadingSurveys);
        } else {
            console.log('App: Global loading state inactive.');
        }
    }, [loadingSession, loadingAuth, loadingSurveys]);

    useEffect(() => {
        console.log('App: useEffect - loadingSession:', loadingSession, 'loadingAuth:', loadingAuth, 'session:', session, 'currentUser:', currentUser);
        if (!loadingAuth && !loadingSession && session && currentUser) {
            console.log('App: Current User:', currentUser);
            console.log('App: Current Company:', currentCompany);
            console.log('App: Module Permissions:', modulePermissions);
            console.log('App: Surveys state:', surveys);
            
            // Ensure surveys are fetched when currentUser and currentCompany are ready
            // This handles initial load and changes to currentCompany/currentUser
            if (currentUser.role === UserRole.DEVELOPER) {
                fetchSurveys(undefined); // Developers fetch all surveys
            } else if (currentCompany?.id) {
                fetchSurveys(currentCompany.id);
            } else {
                // If not a developer and no company, clear surveys
                setSurveys([]);
            }

            if (currentView === View.COMPANY_SETTINGS) {
                if (currentCompany && !modulePermissions[ModuleName.MANAGE_COMPANY_SETTINGS]) {
                    showError('Você não tem permissão para configurar a empresa.');
                    setCurrentView(View.SURVEY_LIST);
                }
            }
        } else if (!loadingAuth && !loadingSession && !session) {
            // User is not logged in, clear surveys
            setSurveys([]);
        }
    }, [currentView, currentCompany, modulePermissions, loadingAuth, loadingSession, session, currentUser, setCurrentView, surveys, fetchSurveys]);

    const handleSelectSurveyForDashboard = useCallback(async (survey: Survey) => {
        if (!modulePermissions[ModuleName.VIEW_DASHBOARD]) {
            showError('Você não tem permissão para visualizar o painel desta pesquisa.');
            return;
        }
        try {
            setSelectedSurvey(survey);
            await fetchSurveyResponses(survey.id);
            setCurrentView(View.DASHBOARD);
        } catch (error) {
            console.error("Erro ao selecionar pesquisa ou buscar respostas:", error);
            showError("Ocorreu um erro ao carregar o painel da pesquisa. Por favor, tente novamente.");
            setCurrentView(View.SURVEY_LIST);
        }
    }, [fetchSurveyResponses, modulePermissions]);

    const handleCreateSurvey = useCallback(() => {
        if (!modulePermissions[ModuleName.CREATE_SURVEY]) {
            showError('Você não tem permissão para criar pesquisas.');
            return;
        }
        setEditingSurvey(null);
        setCurrentView(View.CREATE_SURVEY);
    }, [modulePermissions]);

    const handleEditSurvey = useCallback((survey: Survey) => {
        if (!modulePermissions[ModuleName.MANAGE_SURVEYS]) {
            showError('Você não tem permissão para editar pesquisas.');
            return;
        }
        setEditingSurvey(survey);
        setCurrentView(View.EDIT_SURVEY);
    }, [modulePermissions]);

    const handleDeleteSurveyWrapper = useCallback(async (survey: Survey) => {
        if (!modulePermissions[ModuleName.MANAGE_SURVEYS]) {
            showError('Você não tem permissão para excluir pesquisas.');
            return;
        }
        setSurveyToDelete(survey);
        setShowDeleteSurveyConfirm(true);
    }, [modulePermissions]);

    const confirmDeleteSurvey = useCallback(async () => {
        if (surveyToDelete) {
            const success = await handleDeleteSurvey(surveyToDelete.id);
            if (success) {
                if (selectedSurvey?.id === surveyToDelete.id) {
                    setSelectedSurvey(null);
                }
                if (editingSurvey?.id === surveyToDelete.id) {
                    setEditingSurvey(null);
                }
            }
        }
        setShowDeleteSurveyConfirm(false);
        setSurveyToDelete(null);
    }, [surveyToDelete, handleDeleteSurvey, selectedSurvey, editingSurvey]);

    const handleSaveSurveyWrapper = useCallback(async (surveyData: Survey, isEditing: boolean) => {
        console.log('App: handleSaveSurveyWrapper called. currentUser:', currentUser, 'currentCompany:', currentCompany);
        if (!currentCompany && currentUser?.role !== UserRole.DEVELOPER) { // Allow developers to save without a company_id
            showError('Você precisa ter uma empresa associada para criar ou editar pesquisas.');
            return;
        }
        if (!modulePermissions[ModuleName.CREATE_SURVEY] && !isEditing) {
            showError('Você não tem permissão para criar pesquisas.');
            return;
        }
        if (!modulePermissions[ModuleName.MANAGE_SURVEYS] && isEditing) {
            showError('Você não tem permissão para editar pesquisas.');
            return;
        }
        await handleSaveSurvey(surveyData, isEditing ? surveyData.id : undefined);
        setEditingSurvey(null);
        setCurrentView(View.SURVEY_LIST);
        // Re-fetch surveys based on current user's context
        if (currentUser?.role === UserRole.DEVELOPER) {
            console.log('App: Calling fetchSurveys after save for DEVELOPER.');
            fetchSurveys(undefined); // Developers fetch all surveys
        } else if (currentCompany?.id) {
            console.log('App: Calling fetchSurveys after save for companyId:', currentCompany.id);
            fetchSurveys(currentCompany.id);
        } else {
            console.warn('App: currentCompany.id is null and not a developer, not refetching surveys after save.');
        }
    }, [handleSaveSurvey, modulePermissions, currentCompany, fetchSurveys, currentUser]);

    const handleSaveResponseWrapper = useCallback(async (answers: any[]) => {
        console.log('App: handleSaveResponseWrapper called with answers:', answers);
        if (selectedSurvey && currentUser) {
            console.log('App: Calling handleSaveResponse with selectedSurvey and currentUser.');
            const success = await handleSaveResponse(answers, selectedSurvey, currentUser);
            if (!success) {
                console.error('App: handleSaveResponse returned false, indicating an error occurred during Supabase operation.');
            }
            return success;
        } else {
            showError('Não foi possível enviar a resposta. Dados da pesquisa ou do usuário ausentes.');
            console.error('App: handleSaveResponseWrapper: selectedSurvey or currentUser is missing.', { selectedSurvey, currentUser });
            return false;
        }
    }, [handleSaveResponse, selectedSurvey, currentUser]);

    const handleManageQuestions = useCallback((survey: Survey) => {
        setSelectedSurvey(survey);
        setCurrentView(View.SURVEY_QUESTIONS);
    }, []);

    const handleManageGiveaway = useCallback((survey: Survey) => {
        setSelectedSurvey(survey);
        setCurrentView(View.GIVEAWAYS);
    }, []);

    const handleShareSurvey = useCallback((surveyId: string) => {
        const surveyLink = `${window.location.origin}/responder-pesquisa/${surveyId}`;
        navigator.clipboard.writeText(surveyLink);
        showSuccess('Link da pesquisa copiado para a área de transferência!');
    }, []);

    const handleDownloadReport = useCallback(async (survey: Survey) => {
        if (!dashboardRef.current) {
            showError('Não foi possível encontrar o conteúdo do dashboard para exportar.');
            return;
        }
        try {
            await generatePdfReport(survey, dashboardRef.current);
            showSuccess('Relatório PDF gerado com sucesso!');
        } catch (error: any) {
            console.error('Erro ao gerar relatório PDF:', error.message);
            showError('Não foi possível gerar o relatório PDF.');
        }
    }, []);

    const handleManageTemplates = useCallback(() => {
        setCurrentView(View.SURVEY_TEMPLATES);
    }, []);

    const handleBack = useCallback(() => {
        setCurrentView(View.SURVEY_LIST);
        setSelectedSurvey(null);
        setEditingSurvey(null);
        setActiveNotice(null);
    }, []);

    const toggleSidebar = useCallback(() => {
        setIsSidebarExpanded(prev => !prev);
    }, []);

    const handleNoticeClick = useCallback((notice: Notice) => {
        setActiveNotice(notice);
    }, []);

    const loading = loadingSession || loadingAuth || loadingSurveys;

    if (loading) {
        return <div className="h-screen w-screen flex items-center justify-center">Carregando...</div>;
    }

    if (!session) {
        return <Login />;
    }

    if (!currentUser) {
        return <div className="h-screen w-screen flex items-center justify-center">Carregando dados do usuário...</div>;
    }

    const canManageSurveys = modulePermissions[ModuleName.MANAGE_SURVEYS];

    const renderContent = () => {
        if (activeNotice) {
            return (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full relative">
                        <h3 className="text-xl font-bold text-text-main mb-4">Aviso Importante</h3>
                        <p className="text-text-light mb-4">{activeNotice.message}</p>
                        <p className="text-sm text-gray-500">De: {activeNotice.sender_email}</p>
                        <p className="text-xs text-gray-500">Enviado em: {new Date(activeNotice.created_at).toLocaleString('pt-BR')}</p>
                        <button
                            onClick={() => setActiveNotice(null)}
                            className="mt-6 px-4 py-2 font-semibold text-white bg-primary rounded-md hover:bg-primary-dark"
                        >
                            Fechar
                        </button>
                    </div>
                </div>
            );
        }

        if (!currentCompany && currentUser.role !== UserRole.DEVELOPER) {
            return <JoinCompanyPrompt user={currentUser} onLogout={() => supabase.auth.signOut()} />;
        }

        switch (currentView) {
            case View.SURVEY_LIST:
                return (
                    <SurveyTableList
                        surveys={surveys}
                        loading={loadingSurveys}
                        currentUser={currentUser}
                        currentCompany={currentCompany}
                        canManageSurveys={canManageSurveys}
                        onCreateSurvey={handleCreateSurvey}
                        onEditSurvey={handleEditSurvey}
                        onDeleteSurvey={handleDeleteSurveyWrapper}
                        onViewResponses={handleSelectSurveyForDashboard}
                        onManageGiveaway={handleManageGiveaway}
                        onManageQuestions={handleManageQuestions}
                        onShareSurvey={handleShareSurvey}
                        onDownloadReport={handleDownloadReport}
                        onManageTemplates={handleManageTemplates}
                    />
                );
            case View.CREATE_SURVEY:
                return <SurveyCreator onSave={(surveyData) => handleSaveSurveyWrapper(surveyData, false)} onBack={handleBack} templates={templates} />;
            case View.EDIT_SURVEY:
                if (editingSurvey) {
                    return <SurveyCreator onSave={(surveyData) => handleSaveSurveyWrapper(surveyData, true)} onBack={handleBack} surveyToEdit={editingSurvey} templates={templates} />;
                }
                return null;
            case View.DASHBOARD:
                if (selectedSurvey) {
                    return <Dashboard survey={selectedSurvey} responses={surveyResponses} onBack={handleBack} dashboardRef={dashboardRef} />;
                }
                return null;
            case View.PROFILE:
                return <Profile user={currentUser} onUpdate={handleUpdateProfile} onBack={handleBack} />;
            case View.RESPOND_SURVEY:
                if (selectedSurvey) {
                    return <SurveyForm survey={selectedSurvey} onSaveResponse={handleSaveResponseWrapper} onBack={handleBack} />;
                }
                return null;
            case View.COMPANY_SETTINGS:
                if (!currentCompany) {
                    return <CompanyCreationForm user={currentUser} onCreateCompany={handleCreateCompany} onBack={handleBack} />;
                }
                return <CompanySettings company={currentCompany} onUpdate={handleUpdateCompany} onBack={handleBack} />;
            case View.GIVEAWAYS:
                return <Giveaways currentUser={currentUser} currentCompany={currentCompany} />;
            case View.SETTINGS_PANEL:
                return <SettingsPanel onBack={() => setCurrentView(View.SURVEY_LIST)} setView={setCurrentView} />;
            case View.MODULE_PERMISSIONS_MANAGER:
                return <ModulePermissionsManager onBack={() => setCurrentView(View.SETTINGS_PANEL)} />;
            case View.DEVELOPER_COMPANY_USER_MANAGER:
                return <DeveloperCompanyUserManager onBack={handleBack} setCurrentView={setCurrentView} />;
            case View.ADMIN_USER_MANAGER:
                return <AdministratorUserManager onBack={handleBack} currentUser={currentUser} currentCompany={currentCompany} setCurrentView={setCurrentView} />;
            case View.LOGS_AND_AUDIT:
                return <LogsAndAuditPanel onBack={() => setCurrentView(View.SETTINGS_PANEL)} />;
            case View.MANAGE_NOTICES:
                return <NoticeCreator onBack={handleBack} />;
            case View.CHAT:
                if (!currentCompany?.id) {
                    return (
                        <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-md text-center">
                            <ChatIcon className="h-12 w-12 text-primary mx-auto mb-4" />
                            <h2 className="text-2xl font-bold text-text-main mb-4">Chat da Empresa</h2>
                            <p className="text-text-light mb-6">
                                Você precisa ter uma empresa associada para usar o chat.
                            </p>
                        </div>
                    );
                }
                return <ChatLayout currentUser={currentUser} currentCompanyId={currentCompany.id} />;
            case View.SURVEY_QUESTIONS:
                if (selectedSurvey) {
                    return (
                        <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-md">
                            <div className="flex items-center gap-4 mb-6">
                                <button onClick={handleBack} className="p-2 rounded-full hover:bg-gray-200 transition-colors" aria-label="Voltar">
                                    <ArrowLeftIcon className="h-6 w-6 text-gray-600" />
                                </button>
                                <h2 className="text-2xl font-bold text-text-main">Gerenciar Perguntas da Pesquisa: {selectedSurvey.title}</h2>
                            </div>
                            <p className="text-text-light">Conteúdo para gerenciar perguntas...</p>
                        </div>
                    );
                }
                return null;
            case View.SURVEY_TEMPLATES:
                return (
                    <SurveyTemplateManager
                        onBack={handleBack}
                        templates={templates}
                        currentUser={currentUser}
                        modulePermissions={modulePermissions}
                        onSaveTemplate={handleSaveTemplate}
                        onDeleteTemplate={handleDeleteTemplate}
                    />
                );
            default:
                return (
                    <SurveyTableList
                        surveys={surveys}
                        loading={loadingSurveys}
                        currentUser={currentUser}
                        currentCompany={currentCompany}
                        canManageSurveys={canManageSurveys}
                        onCreateSurvey={handleCreateSurvey}
                        onEditSurvey={handleEditSurvey}
                        onDeleteSurvey={handleDeleteSurveyWrapper}
                        onViewResponses={handleSelectSurveyForDashboard}
                        onManageGiveaway={handleManageGiveaway}
                        onManageQuestions={handleManageQuestions}
                        onShareSurvey={handleShareSurvey}
                        onDownloadReport={handleDownloadReport}
                        onManageTemplates={handleManageTemplates}
                    />
                );
        }
    };

    return (
        <div className="flex h-screen bg-background text-text-main">
            <Sidebar
                currentView={currentView}
                setView={setCurrentView}
                modulePermissions={modulePermissions}
                currentUserRole={currentUser.role}
                isExpanded={isSidebarExpanded}
                onToggle={toggleSidebar}
            />
            <div className={`flex-1 flex flex-col ${isSidebarExpanded ? 'ml-64' : 'ml-20'} transition-all duration-300 ease-in-out`}>
                <Header
                    user={currentUser}
                    company={currentCompany}
                    onLogout={() => supabase.auth.signOut()}
                    setView={setCurrentView}
                    modulePermissions={modulePermissions}
                    onNoticeClick={handleNoticeClick}
                />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background p-8">
                    {renderContent()}
                </main>
            </div>

            {showDeleteSurveyConfirm && surveyToDelete && (
                <ConfirmationDialog
                    title="Confirmar Exclusão de Pesquisa"
                    message={`Tem certeza que deseja excluir a pesquisa "${surveyToDelete.title}"? Todas as perguntas e respostas associadas também serão excluídas. Esta ação é irreversível.`}
                    confirmText="Excluir"
                    onConfirm={confirmDeleteSurvey}
                    cancelText="Cancelar"
                    onCancel={() => {
                        setShowDeleteSurveyConfirm(false);
                        setSurveyToDelete(null);
                    }}
                />
            )}
        </div>
    );
};

export default App;