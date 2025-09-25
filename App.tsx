import React, { useState, useCallback } from 'react';
import { User, Company, View, Survey, UserRole, Answer, SurveyResponse } from './types';
import { MOCK_USERS, MOCK_COMPANIES, MOCK_SURVEYS, MOCK_RESPONSES } from './data/mockData';
import Header from './components/Header';
import SurveyList from './components/SurveyList';
import SurveyCreator from './components/SurveyCreator';
import Dashboard from './components/Dashboard';
import Profile from './components/Profile';
import SurveyForm from './components/SurveyForm';

const App: React.FC = () => {
    // Usando o primeiro usuário e empresa dos dados de demonstração como o usuário "logado"
    const [currentUser, setCurrentUser] = useState<User | null>(MOCK_USERS[0]);
    const [currentCompany, setCurrentCompany] = useState<Company | null>(MOCK_COMPANIES[0]);
    
    // Filtrando as pesquisas e respostas para a empresa do usuário atual
    const [surveys, setSurveys] = useState<Survey[]>(MOCK_SURVEYS.filter(s => s.companyId === currentCompany?.id));
    const [surveyResponses, setSurveyResponses] = useState<SurveyResponse[]>(MOCK_RESPONSES);
    
    const [currentView, setCurrentView] = useState<View>(View.SURVEY_LIST);
    const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);

    const handleLogout = () => {
        // Simula um logout. Em uma aplicação real, isso limparia a sessão.
        alert("Funcionalidade de logout desativada no modo de demonstração.");
    };

    const handleCreateSurvey = (newSurveyData: Omit<Survey, 'id' | 'companyId'>) => {
        if (!currentUser || !currentCompany) return;
        const newSurvey: Survey = {
            ...newSurveyData,
            id: `s${Date.now()}`, // Cria um ID único
            companyId: currentCompany.id,
        };
        setSurveys(prev => [newSurvey, ...prev]);
        alert('Pesquisa criada com sucesso! (localmente)');
        setCurrentView(View.SURVEY_LIST);
    };

    const handleUpdateProfile = (updatedUser: User) => {
        setCurrentUser(updatedUser);
        alert('Perfil atualizado com sucesso! (localmente)');
        setCurrentView(View.SURVEY_LIST);
    };

    const handleSaveResponse = (answers: Answer[]) => {
        if (!selectedSurvey) return;
        const newResponse: SurveyResponse = {
            id: `r${Date.now()}`,
            surveyId: selectedSurvey.id,
            answers,
        };
        setSurveyResponses(prev => [...prev, newResponse]);
        alert('Resposta enviada com sucesso! (localmente)');
        setCurrentView(View.SURVEY_LIST);
    };

    const handleSelectSurvey = useCallback((survey: Survey) => {
        setSelectedSurvey(survey);
        setCurrentView(View.DASHBOARD);
    }, []);

    const handleStartResponse = useCallback((survey: Survey) => {
        setSelectedSurvey(survey);
        setCurrentView(View.RESPOND_SURVEY);
    }, []);

    const handleBack = () => {
        setCurrentView(View.SURVEY_LIST);
        setSelectedSurvey(null);
    };

    const renderContent = () => {
        if (!currentUser || !currentCompany) return null;

        switch (currentView) {
            case View.SURVEY_LIST:
                return <SurveyList surveys={surveys} onSelectSurvey={handleSelectSurvey} onStartResponse={handleStartResponse} />;
            case View.CREATE_SURVEY:
                return <SurveyCreator onSave={handleCreateSurvey} onBack={handleBack} />;
            case View.DASHBOARD:
                if (selectedSurvey) {
                    const responsesForSurvey = surveyResponses.filter(r => r.surveyId === selectedSurvey.id);
                    return <Dashboard survey={selectedSurvey} responses={responsesForSurvey} onBack={handleBack} />;
                }
                return null;
            case View.PROFILE:
                return <Profile user={currentUser} onUpdate={handleUpdateProfile} onBack={handleBack} />;
            case View.RESPOND_SURVEY:
                if (selectedSurvey) {
                    return <SurveyForm survey={selectedSurvey} onSaveResponse={handleSaveResponse} onBack={handleBack} />;
                }
                return null;
            default:
                return <SurveyList surveys={surveys} onSelectSurvey={handleSelectSurvey} onStartResponse={handleStartResponse} />;
        }
    };

    if (!currentUser || !currentCompany) {
        return <div className="h-screen w-screen flex items-center justify-center">Carregando dados de demonstração...</div>;
    }

    const canCreate = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.DEVELOPER;

    return (
        <div className="flex flex-col h-screen bg-background text-text-main">
            <Header 
                user={currentUser} 
                company={currentCompany} 
                onLogout={handleLogout} 
                setView={setCurrentView} 
                currentView={currentView} 
                canCreate={canCreate} 
            />
            <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background p-8">
                {renderContent()}
            </main>
        </div>
    );
};

export default App;