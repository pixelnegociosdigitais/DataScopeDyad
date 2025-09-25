import React, { useState, useMemo, useCallback } from 'react';
import { User, Company, View, Survey, UserRole, Answer, SurveyResponse } from './types';
import { MOCK_USERS, MOCK_COMPANIES, MOCK_SURVEYS, MOCK_RESPONSES } from './data/mockData';
import Login from './components/Login';
import Header from './components/Header';
import SurveyList from './components/SurveyList';
import SurveyCreator from './components/SurveyCreator';
import Dashboard from './components/Dashboard';
import Profile from './components/Profile';
import SurveyForm from './components/SurveyForm';

const App: React.FC = () => {
    const [users, setUsers] = useState<User[]>(MOCK_USERS);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
    const [currentView, setCurrentView] = useState<View>(View.SURVEY_LIST);
    const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);
    const [surveys, setSurveys] = useState<Survey[]>(MOCK_SURVEYS);
    const [responses, setResponses] = useState<SurveyResponse[]>(MOCK_RESPONSES);

    const handleLogin = (userId: string, companyId: string) => {
        const user = users.find(u => u.id === userId);
        const company = MOCK_COMPANIES.find(c => c.id === companyId);
        if (user && company) {
            setCurrentUser(user);
            setCurrentCompany(company);
            setCurrentView(View.SURVEY_LIST);
        }
    };

    const handleLogout = () => {
        setCurrentUser(null);
        setCurrentCompany(null);
    };

    const handleCreateSurvey = (newSurvey: Survey) => {
        setSurveys(prev => [...prev, { ...newSurvey, id: `s${prev.length + 1}`, companyId: currentCompany!.id }]);
        setCurrentView(View.SURVEY_LIST);
    };

    const handleUpdateProfile = (updatedUser: User) => {
        setUsers(prevUsers => prevUsers.map(u => (u.id === updatedUser.id ? updatedUser : u)));
        setCurrentUser(updatedUser);
        alert('Perfil atualizado com sucesso!');
        setCurrentView(View.SURVEY_LIST);
    };

    const handleSaveResponse = (answers: Answer[]) => {
        if (!selectedSurvey) return;
        const newResponse: SurveyResponse = {
            id: `r${responses.length + 1}`,
            surveyId: selectedSurvey.id,
            answers,
        };
        setResponses(prev => [...prev, newResponse]);
        alert('Respostas salvas com sucesso!');
        setCurrentView(View.SURVEY_LIST);
        setSelectedSurvey(null);
    };

    const companySurveys = useMemo(() => {
        return surveys.filter(s => s.companyId === currentCompany?.id);
    }, [surveys, currentCompany]);

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
                return <SurveyList surveys={companySurveys} onSelectSurvey={handleSelectSurvey} onStartResponse={handleStartResponse} />;
            case View.CREATE_SURVEY:
                return <SurveyCreator onSave={handleCreateSurvey} onBack={handleBack} />;
            case View.DASHBOARD:
                if (selectedSurvey) {
                    const surveyResponses = responses.filter(r => r.surveyId === selectedSurvey.id);
                    return <Dashboard survey={selectedSurvey} responses={surveyResponses} onBack={handleBack} />;
                }
                return <SurveyList surveys={companySurveys} onSelectSurvey={handleSelectSurvey} onStartResponse={handleStartResponse} />;
            case View.PROFILE:
                return <Profile user={currentUser} onUpdate={handleUpdateProfile} onBack={handleBack} />;
            case View.RESPOND_SURVEY:
                if (selectedSurvey) {
                    return <SurveyForm survey={selectedSurvey} onSaveResponse={handleSaveResponse} onBack={handleBack} />;
                }
                return <SurveyList surveys={companySurveys} onSelectSurvey={handleSelectSurvey} onStartResponse={handleStartResponse} />;
            default:
                return <SurveyList surveys={companySurveys} onSelectSurvey={handleSelectSurvey} onStartResponse={handleStartResponse} />;
        }
    };

    if (!currentUser || !currentCompany) {
        return <Login onLogin={handleLogin} users={users} companies={MOCK_COMPANIES} />;
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