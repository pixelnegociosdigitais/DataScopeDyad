import React, { useState, useEffect, useCallback } from 'react';
import { User, Company, View, Survey, UserRole, Answer, SurveyResponse } from './types';
import { supabase } from './integrations/supabase/client';
import { Session } from '@supabase/supabase-js';
import Login from './components/Login';
import Header from './components/Header';
import SurveyList from './components/SurveyList';
import SurveyCreator from './components/SurveyCreator';
import Dashboard from './components/Dashboard';
import Profile from './components/Profile';
import SurveyForm from './components/SurveyForm';

const App: React.FC = () => {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
    const [currentView, setCurrentView] = useState<View>(View.SURVEY_LIST);
    const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);
    const [surveys, setSurveys] = useState<Survey[]>([]);
    
    useEffect(() => {
        const getSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);
            setLoading(false);
        };
        getSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        if (session?.user) {
            const fetchUserData = async () => {
                const { data: profile, error } = await supabase
                    .from('profiles')
                    .select(`
                        id,
                        full_name,
                        role,
                        company:companies (id, name)
                    `)
                    .eq('id', session.user.id)
                    .single();

                if (error) {
                    console.error('Error fetching profile:', error);
                } else if (profile) {
                    const user: User = {
                        id: profile.id,
                        fullName: profile.full_name,
                        role: profile.role as UserRole,
                        email: session.user.email!,
                    };
                    setCurrentUser(user);
                    setCurrentCompany(profile.company as Company);
                }
            };
            fetchUserData();
        } else {
            setCurrentUser(null);
            setCurrentCompany(null);
        }
    }, [session]);

    useEffect(() => {
        if (currentCompany) {
            const fetchSurveys = async () => {
                const { data, error } = await supabase
                    .from('surveys')
                    .select(`*, questions (*)`)
                    .eq('company_id', currentCompany.id)
                    .order('created_at', { ascending: false });

                if (error) {
                    console.error('Error fetching surveys:', error);
                } else {
                    const fetchedSurveys = data.map((s: any) => ({
                        ...s,
                        companyId: s.company_id,
                    })) as Survey[];
                    setSurveys(fetchedSurveys);
                }
            };
            fetchSurveys();
        }
    }, [currentCompany]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    // TODO: Refatorar estas funções para usar o Supabase na próxima etapa
    const handleCreateSurvey = (newSurvey: Survey) => {
        console.log('Creating survey:', newSurvey);
        setCurrentView(View.SURVEY_LIST);
    };
    const handleUpdateProfile = (updatedUser: User) => {
        console.log('Updating profile:', updatedUser);
        setCurrentView(View.SURVEY_LIST);
    };
    const handleSaveResponse = (answers: Answer[]) => {
        console.log('Saving response:', answers);
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
                    // TODO: Fetch responses for this survey
                    const surveyResponses: SurveyResponse[] = [];
                    return <Dashboard survey={selectedSurvey} responses={surveyResponses} onBack={handleBack} />;
                }
                return <SurveyList surveys={surveys} onSelectSurvey={handleSelectSurvey} onStartResponse={handleStartResponse} />;
            case View.PROFILE:
                return <Profile user={currentUser} onUpdate={handleUpdateProfile} onBack={handleBack} />;
            case View.RESPOND_SURVEY:
                if (selectedSurvey) {
                    return <SurveyForm survey={selectedSurvey} onSaveResponse={handleSaveResponse} onBack={handleBack} />;
                }
                return <SurveyList surveys={surveys} onSelectSurvey={handleSelectSurvey} onStartResponse={handleStartResponse} />;
            default:
                return <SurveyList surveys={surveys} onSelectSurvey={handleSelectSurvey} onStartResponse={handleStartResponse} />;
        }
    };

    if (loading) {
        return <div className="h-screen w-screen flex items-center justify-center">Carregando...</div>;
    }

    if (!session) {
        return <Login />;
    }

    if (!currentUser || !currentCompany) {
        return <div className="h-screen w-screen flex items-center justify-center">Carregando perfil...</div>;
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