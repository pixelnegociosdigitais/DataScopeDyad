import React, { useState, useCallback, useEffect } from 'react';
import { UserRole, View, Survey, ModuleName, Notice } from './types';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import SurveyList from './components/SurveyList';
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
import AdministratorUserManager from './components/AdministratorUserManager';
import LogsAndAuditPanel from './components/LogsAndAuditPanel';
import JoinCompanyPrompt from './components/JoinCompanyPrompt';
import NoticeCreator from './src/components/NoticeCreator'; // Importar NoticeCreator
// import NoticeDisplay from './src/components/NoticeDisplay'; // REMOVIDO
import { supabase } from './src/integrations/supabase/client';
import { useAuthSession } from './src/context/AuthSessionContext';
import { useAuth } from './src/hooks/useAuth';
import { useSurveys } from './src/hooks/useSurveys';
import { showError } from './src/utils/toast';

const App: React.FC = () => {
    const { session, loadingSession } = useAuthSession();
    const [currentView, setCurrentView] = useState<View>(View.SURVEY_LIST);
    const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);
    const [editingSurvey, setEditingSurvey] = useState<Survey | null>(null);
    const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
    const [companySettingsAccessDenied, setCompanySettingsAccessDenied] = useState(false);
    const [activeNotice, setActiveNotice] = useState<Notice | null>(null); // Estado para o aviso ativo

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
    } = useSurveys(currentCompany, currentUser);

    // Log de diagnóstico para o estado de carregamento global
    useEffect(() => {
        if (loadingSession || loadingAuth || loadingSurveys) {
            console.log('App: Global loading state active. loadingSession:', loadingSession, 'loadingAuth:', loadingAuth, 'loadingSurveys:', loadingSurveys);
        } else {
            console.log('App: Global loading state inactive.');
        }
    }, [loadingSession, loadingAuth, loadingSurveys]);

    // Efeito para lidar com a lógica de acesso às configurações da empresa
    useEffect(() => {
        // Só executa se a autenticação e o carregamento de dados estiverem completos
        if (!loadingAuth && !loadingSession && session && currentUser) {
            if (currentView === View.COMPANY_SETTINGS) {
                // Verifica se o usuário tem uma empresa E não tem permissão para gerenciá-la
                if (currentCompany && !modulePermissions[ModuleName.MANAGE_COMPANY_SETTINGS]) {
                    setCompanySettingsAccessDenied(true);
                    showError('Você não tem permissão para configurar a empresa.');
                    setCurrentView(View.SURVEY_LIST); // Redireciona imediatamente
                } else {
                    setCompanySettingsAccessDenied(false); // Limpa o estado se as condições forem atendidas
                }
            } else {
                // Se navegarmos para fora de COMPANY_SETTINGS, limpa qualquer estado de negação de acesso anterior
                setCompanySettingsAccessDenied(false);
            }
        }
    }, [currentView, currentCompany, modulePermissions, loadingAuth, loadingSession, session, currentUser, setCurrentView]);

    const handleSelectSurvey = useCallback(async (survey: Survey) => {
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

    const handleStartResponse = useCallback((survey: Survey) => {
        setSelectedSurvey(survey);
        setCurrentView(View.RESPOND_SURVEY);
    }, []);

    const handleEditSurvey = (survey: Survey) => {
        if (!modulePermissions[ModuleName.MANAGE_SURVEYS]) {
            showError('Você não tem permissão para editar pesquisas.');
            return;
        }
        setEditingSurvey(survey);
        setCurrentView(View.EDIT_SURVEY);
    };

    const handleDeleteSurveyWrapper = useCallback(async (surveyId: string) => {
        if (!modulePermissions[ModuleName.MANAGE_SURVEYS]) {
            showError('Você não tem permissão para excluir pesquisas.');
            return;
        }
        await handleDeleteSurvey(surveyId);
        if (selectedSurvey?.id === surveyId) {
            setSelectedSurvey(null);
        }
        if (editingSurvey?.id === surveyId) {
            setEditingSurvey(null);
        }
        setCurrentView(View.SURVEY_LIST);
    }, [handleDeleteSurvey, selectedSurvey, editingSurvey, modulePermissions]);

    const handleSaveSurveyWrapper = useCallback(async (surveyData: Survey) => {
        if (!currentCompany) {
            showError('Você precisa ter uma empresa associada para criar ou editar pesquisas.');
            return;
        }
        if (!modulePermissions[ModuleName.CREATE_SURVEY] && !editingSurvey) {
            showError('Você não tem permissão para criar pesquisas.');
            return;
        }
        if (!modulePermissions[ModuleName.MANAGE_SURVEYS] && editingSurvey) {
            showError('Você não tem permissão para editar pesquisas.');
            return;
        }
        await handleSaveSurvey(surveyData, editingSurvey?.id);
        setEditingSurvey(null);
        setCurrentView(View.SURVEY_LIST);
    }, [handleSaveSurvey, editingSurvey, modulePermissions, currentCompany]);

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

    const handleBack = useCallback(() => {
        setCurrentView(View.SURVEY_LIST);
        setSelectedSurvey(null);
        setEditingSurvey(null);
        setActiveNotice(null); // Limpa o aviso ativo ao voltar
    }, []);

    const toggleSidebar = useCallback(() => {
        setIsSidebarExpanded(prev => !prev);
    }, []);

    const handleNoticeClick = useCallback((notice: Notice) => {
        setActiveNotice(notice); // Define o aviso clicado como ativo
        // Poderíamos mudar para uma view específica de aviso aqui, se necessário
        // Por enquanto, apenas o define como ativo para ser exibido em um modal ou similar
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
            // Renderiza um modal ou um painel para o aviso ativo
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

        switch (currentView) {
            case View.SURVEY_LIST:
                return <SurveyList surveys={surveys} onSelectSurvey={handleSelectSurvey} onStartResponse={handleStartResponse} onEditSurvey={handleEditSurvey} onDeleteSurvey={handleDeleteSurveyWrapper} canManage={canManageSurveys} currentCompany={currentCompany} />;
            case View.CREATE_SURVEY:
                return <SurveyCreator onSave={handleSaveSurveyWrapper} onBack={handleBack} templates={templates} />;
            case View.EDIT_SURVEY:
                return <SurveyCreator onSave={handleSaveSurveyWrapper} onBack={handleBack} surveyToEdit={editingSurvey} templates={templates} />;
            case View.DASHBOARD:
                if (selectedSurvey) {
                    return <Dashboard survey={selectedSurvey} responses={surveyResponses} onBack={handleBack} />;
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
                return <SettingsPanel onBack={handleBack} setView={setCurrentView} />;
            case View.MODULE_PERMISSIONS_MANAGER:
                return <ModulePermissionsManager onBack={() => setCurrentView(View.SETTINGS_PANEL)} />;
            case View.DEVELOPER_COMPANY_USER_MANAGER:
                return <DeveloperCompanyUserManager onBack={handleBack} setCurrentView={setCurrentView} />;
            case View.ADMIN_USER_MANAGER:
                return <AdministratorUserManager onBack={handleBack} currentUser={currentUser} currentCompany={currentCompany} setCurrentView={setCurrentView} />;
            case View.LOGS_AND_AUDIT:
                return <LogsAndAuditPanel onBack={() => setCurrentView(View.SETTINGS_PANEL)} />;
            case View.MANAGE_NOTICES: // Novo caso para o criador de avisos
                return <NoticeCreator onBack={handleBack} />;
            default:
                return <SurveyList surveys={surveys} onSelectSurvey={handleSelectSurvey} onStartResponse={handleStartResponse} onEditSurvey={handleEditSurvey} onDeleteSurvey={handleDeleteSurveyWrapper} canManage={canManageSurveys} currentCompany={currentCompany} />;
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
                    onNoticeClick={handleNoticeClick} // Passar a função para o Header
                />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background p-8">
                    {renderContent()}
                </main>
            </div>
        </div>
    );
};

export default App;