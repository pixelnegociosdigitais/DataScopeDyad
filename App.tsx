import React, { useState, useCallback } from 'react';
import { UserRole, View, Survey, ModuleName } from './types';
import Header from './components/Header';
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
import ModulePermissionsManager from './components/ModulePermissionsManager'; // Importar o novo componente
import { supabase } from './src/integrations/supabase/client';
import { useAuthSession } from './src/context/AuthSessionContext';
import { useAuth } from './src/hooks/useAuth';
import { useSurveys } from './src/hooks/useSurveys';

const App: React.FC = () => {
    const { session, loadingSession } = useAuthSession();
    const [currentView, setCurrentView] = useState<View>(View.SURVEY_LIST);
    const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);
    const [editingSurvey, setEditingSurvey] = useState<Survey | null>(null);

    const {
        currentUser,
        currentCompany,
        loadingAuth,
        handleCreateCompany,
        handleUpdateProfile,
        handleUpdateCompany,
        needsCompanySetup,
        modulePermissions, // Obter as permissões de módulo
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

    const handleSelectSurvey = useCallback(async (survey: Survey) => {
        if (!modulePermissions[ModuleName.VIEW_DASHBOARD]) {
            alert('Você não tem permissão para visualizar o painel desta pesquisa.');
            return;
        }
        try {
            setSelectedSurvey(survey);
            await fetchSurveyResponses(survey.id);
            setCurrentView(View.DASHBOARD);
        } catch (error) {
            console.error("Erro ao selecionar pesquisa ou buscar respostas:", error);
            alert("Ocorreu um erro ao carregar o painel da pesquisa. Por favor, tente novamente.");
            setCurrentView(View.SURVEY_LIST); // Volta para a lista em caso de erro
        }
    }, [fetchSurveyResponses, modulePermissions]);

    const handleStartResponse = useCallback((survey: Survey) => {
        setSelectedSurvey(survey);
        setCurrentView(View.RESPOND_SURVEY);
    }, []);

    const handleEditSurvey = (survey: Survey) => {
        if (!modulePermissions[ModuleName.MANAGE_SURVEYS]) {
            alert('Você não tem permissão para editar pesquisas.');
            return;
        }
        setEditingSurvey(survey);
        setCurrentView(View.EDIT_SURVEY);
    };

    const handleDeleteSurveyWrapper = useCallback(async (surveyId: string) => {
        if (!modulePermissions[ModuleName.MANAGE_SURVEYS]) {
            alert('Você não tem permissão para excluir pesquisas.');
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
        if (!modulePermissions[ModuleName.CREATE_SURVEY] && !editingSurvey) { // Check for create permission
            alert('Você não tem permissão para criar pesquisas.');
            return;
        }
        if (!modulePermissions[ModuleName.MANAGE_SURVEYS] && editingSurvey) { // Check for manage permission if editing
            alert('Você não tem permissão para editar pesquisas.');
            return;
        }
        await handleSaveSurvey(surveyData, editingSurvey?.id);
        setEditingSurvey(null);
        setCurrentView(View.SURVEY_LIST);
    }, [handleSaveSurvey, editingSurvey, modulePermissions]);

    const handleSaveResponseWrapper = useCallback(async (answers: any[]) => {
        if (selectedSurvey && currentUser) {
            await handleSaveResponse(answers, selectedSurvey, currentUser);
            setCurrentView(View.SURVEY_LIST);
        }
    }, [handleSaveResponse, selectedSurvey, currentUser]);

    const handleBack = useCallback(() => {
        setCurrentView(View.SURVEY_LIST);
        setSelectedSurvey(null);
        setEditingSurvey(null);
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

    if (needsCompanySetup) {
        return <CompanySetup user={currentUser} onCreateCompany={handleCreateCompany} />;
    }

    if (!currentCompany) {
        // This case should ideally be caught by needsCompanySetup, but as a fallback
        return <div className="h-screen w-screen flex items-center justify-center">Carregando dados da empresa...</div>;
    }

    // Permissions based on modulePermissions
    const canCreateSurvey = modulePermissions[ModuleName.CREATE_SURVEY];
    const canManageSurveys = modulePermissions[ModuleName.MANAGE_SURVEYS];
    const canAccessGiveaways = modulePermissions[ModuleName.ACCESS_GIVEAWAYS];
    const canManageCompanySettings = modulePermissions[ModuleName.MANAGE_COMPANY_SETTINGS];
    const canAccessSettingsPanel = currentUser.role === UserRole.DEVELOPER; // Settings panel itself is developer-only

    const renderContent = () => {
        switch (currentView) {
            case View.SURVEY_LIST:
                return <SurveyList surveys={surveys} onSelectSurvey={handleSelectSurvey} onStartResponse={handleStartResponse} onEditSurvey={handleEditSurvey} onDeleteSurvey={handleDeleteSurveyWrapper} canManage={canManageSurveys} />;
            case View.CREATE_SURVEY:
                if (!canCreateSurvey) return <div className="text-center py-12 text-red-600">Você não tem permissão para criar pesquisas.</div>;
                return <SurveyCreator onSave={handleSaveSurveyWrapper} onBack={handleBack} templates={templates} />;
            case View.EDIT_SURVEY:
                if (!canManageSurveys) return <div className="text-center py-12 text-red-600">Você não tem permissão para editar pesquisas.</div>;
                return <SurveyCreator onSave={handleSaveSurveyWrapper} onBack={handleBack} surveyToEdit={editingSurvey} templates={templates} />;
            case View.DASHBOARD:
                if (!modulePermissions[ModuleName.VIEW_DASHBOARD]) return <div className="text-center py-12 text-red-600">Você não tem permissão para visualizar painéis.</div>;
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
                if (!canManageCompanySettings) return <div className="text-center py-12 text-red-600">Você não tem permissão para gerenciar as configurações da empresa.</div>;
                return <CompanySettings company={currentCompany} onUpdate={handleUpdateCompany} onBack={handleBack} />;
            case View.GIVEAWAYS:
                if (!canAccessGiveaways) return <div className="text-center py-12 text-red-600">Você não tem permissão para acessar sorteios.</div>;
                return <Giveaways currentUser={currentUser} currentCompany={currentCompany} />;
            case View.SETTINGS_PANEL:
                if (!canAccessSettingsPanel) return <div className="text-center py-12 text-red-600">Você não tem permissão para acessar o painel de configurações.</div>;
                return <SettingsPanel onBack={handleBack} setView={setCurrentView} />;
            case View.MODULE_PERMISSIONS_MANAGER:
                if (!canAccessSettingsPanel) return <div className="text-center py-12 text-red-600">Você não tem permissão para gerenciar permissões de módulos.</div>;
                return <ModulePermissionsManager onBack={() => setCurrentView(View.SETTINGS_PANEL)} />;
            default:
                return <SurveyList surveys={surveys} onSelectSurvey={handleSelectSurvey} onStartResponse={handleStartResponse} onEditSurvey={handleEditSurvey} onDeleteSurvey={handleDeleteSurveyWrapper} canManage={canManageSurveys} />;
        }
    };

    return (
        <div className="flex flex-col h-screen bg-background text-text-main">
            <Header 
                user={currentUser} 
                company={currentCompany}
                onLogout={() => supabase.auth.signOut()} 
                setView={setCurrentView} 
                currentView={currentView} 
                modulePermissions={modulePermissions} // Passando modulePermissions
            />
            <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background p-8">
                {renderContent()}
            </main>
        </div>
    );
};

export default App;