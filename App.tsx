import React, { useState, useCallback, useEffect } from 'react';
import { UserRole, View, Survey, ModuleName } from './types';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import SurveyList from './components/SurveyList';
import SurveyCreator from './components/SurveyCreator';
import Dashboard from './components/Dashboard';
import Profile from './components/Profile';
import SurveyForm from './components/SurveyForm';
import Login from './components/Login';
import CompanySettings from './components/CompanySettings';
import CompanySetup from './components/CompanySetup';
import Giveaways from './components/Giveaways';
import SettingsPanel from './components/SettingsPanel';
import ModulePermissionsManager from './components/ModulePermissionsManager';
import JoinCompanyPrompt from './components/JoinCompanyPrompt'; // Importar o novo componente
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

    const {
        currentUser,
        currentCompany,
        loadingAuth,
        handleCreateCompany,
        handleUpdateProfile,
        handleUpdateCompany,
        needsCompanySetup,
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
    }, [handleSaveSurvey, editingSurvey, modulePermissions]);

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
    }, []);

    const toggleSidebar = useCallback(() => {
        setIsSidebarExpanded(prev => !prev);
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

    // Lidar com a configuração da empresa com base no papel do usuário
    if (needsCompanySetup) {
        if (currentUser.role === UserRole.ADMIN) {
            return <CompanySetup user={currentUser} onCreateCompany={handleCreateCompany} />;
        } else {
            // Para papéis de DESENVOLVEDOR ou USUÁRIO sem uma empresa, mostrar um prompt para se juntar
            return <JoinCompanyPrompt user={currentUser} />;
        }
    }

    if (!currentCompany) {
        // Este caso idealmente não deve ser alcançado se needsCompanySetup for tratado acima,
        // mas como um fallback, indica uma inconsistência de dados ou problema de carregamento.
        return <div className="h-screen w-screen flex items-center justify-center">Carregando dados da empresa...</div>;
    }

    const canManageSurveys = modulePermissions[ModuleName.MANAGE_SURVEYS];

    const renderContent = () => {
        switch (currentView) {
            case View.SURVEY_LIST:
                return <SurveyList surveys={surveys} onSelectSurvey={handleSelectSurvey} onStartResponse={handleStartResponse} onEditSurvey={handleEditSurvey} onDeleteSurvey={handleDeleteSurveyWrapper} canManage={canManageSurveys} />;
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
                return <CompanySettings company={currentCompany} onUpdate={handleUpdateCompany} onBack={handleBack} />;
            case View.GIVEAWAYS:
                return <Giveaways currentUser={currentUser} currentCompany={currentCompany} />;
            case View.SETTINGS_PANEL:
                return <SettingsPanel onBack={handleBack} setView={setCurrentView} />;
            case View.MODULE_PERMISSIONS_MANAGER:
                return <ModulePermissionsManager onBack={() => setCurrentView(View.SETTINGS_PANEL)} />;
            default:
                return <SurveyList surveys={surveys} onSelectSurvey={handleSelectSurvey} onStartResponse={handleStartResponse} onEditSurvey={handleEditSurvey} onDeleteSurvey={handleDeleteSurveyWrapper} canManage={canManageSurveys} />;
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
                    currentView={currentView}
                    modulePermissions={modulePermissions}
                />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background p-8">
                    {renderContent()}
                </main>
            </div>
        </div>
    );
};

export default App;