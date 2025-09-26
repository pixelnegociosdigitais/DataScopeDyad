import React, { useState, useCallback } from 'react';
import { UserRole, View, Survey } from './types';
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
import SettingsPanel from './components/SettingsPanel'; // Importar o novo componente
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
        try {
            setSelectedSurvey(survey);
            await fetchSurveyResponses(survey.id);
            setCurrentView(View.DASHBOARD);
        } catch (error) {
            console.error("Erro ao selecionar pesquisa ou buscar respostas:", error);
            alert("Ocorreu um erro ao carregar o painel da pesquisa. Por favor, tente novamente.");
            setCurrentView(View.SURVEY_LIST); // Volta para a lista em caso de erro
        }
    }, [fetchSurveyResponses]);

    const handleStartResponse = useCallback((survey: Survey) => {
        setSelectedSurvey(survey);
        setCurrentView(View.RESPOND_SURVEY);
    }, []);

    const handleEditSurvey = (survey: Survey) => {
        setEditingSurvey(survey);
        setCurrentView(View.EDIT_SURVEY);
    };

    const handleDeleteSurveyWrapper = useCallback(async (surveyId: string) => {
        await handleDeleteSurvey(surveyId);
        if (selectedSurvey?.id === surveyId) {
            setSelectedSurvey(null);
        }
        if (editingSurvey?.id === surveyId) {
            setEditingSurvey(null);
        }
        setCurrentView(View.SURVEY_LIST);
    }, [handleDeleteSurvey, selectedSurvey, editingSurvey]);

    const handleSaveSurveyWrapper = useCallback(async (surveyData: Survey) => {
        await handleSaveSurvey(surveyData, editingSurvey?.id);
        setEditingSurvey(null);
        setCurrentView(View.SURVEY_LIST);
    }, [handleSaveSurvey, editingSurvey]);

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

    const canManage = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.DEVELOPER;
    const canManageCompany = currentUser.role === UserRole.ADMIN;

    const renderContent = () => {
        switch (currentView) {
            case View.SURVEY_LIST:
                return <SurveyList surveys={surveys} onSelectSurvey={handleSelectSurvey} onStartResponse={handleStartResponse} onEditSurvey={handleEditSurvey} onDeleteSurvey={handleDeleteSurveyWrapper} canManage={canManage} />;
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
            case View.SETTINGS_PANEL: // Novo caso para o painel de configurações
                return <SettingsPanel onBack={handleBack} />;
            default:
                return <SurveyList surveys={surveys} onSelectSurvey={handleSelectSurvey} onStartResponse={handleStartResponse} onEditSurvey={handleEditSurvey} onDeleteSurvey={handleDeleteSurveyWrapper} canManage={canManage} />;
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
                canCreate={canManage}
                canManageCompany={canManageCompany}
            />
            <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background p-8">
                {renderContent()}
            </main>
        </div>
    );
};

export default App;