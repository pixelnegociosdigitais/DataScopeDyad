import React, { useState, useEffect, useCallback } from 'react';
import { User, Company, View, Survey, UserRole, Answer, SurveyResponse } from './types';
import { supabase } from '@/src/integrations/supabase/client';
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
    const [surveyResponses, setSurveyResponses] = useState<SurveyResponse[]>([]);

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

    const fetchSurveys = useCallback(async () => {
        if (currentCompany) {
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
        }
    }, [currentCompany]);

    useEffect(() => {
        if (session?.user) {
            const fetchUserData = async () => {
                const { data: profile, error } = await supabase
                    .from('profiles')
                    .select(`
                        id,
                        full_name,
                        role,
                        phone,
                        address,
                        avatar_url,
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
                        phone: profile.phone,
                        address: profile.address,
                        profilePictureUrl: profile.avatar_url,
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
        fetchSurveys();
    }, [currentCompany, fetchSurveys]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    const handleCreateSurvey = async (newSurvey: Omit<Survey, 'id' | 'companyId' | 'createdBy'>) => {
        if (!currentUser || !currentCompany) return;

        const { data: surveyData, error: surveyError } = await supabase
            .from('surveys')
            .insert({
                title: newSurvey.title,
                company_id: currentCompany.id,
                created_by: currentUser.id,
            })
            .select()
            .single();

        if (surveyError || !surveyData) {
            console.error('Error creating survey:', surveyError);
            return;
        }

        const questionsToInsert = newSurvey.questions.map((q, index) => ({
            survey_id: surveyData.id,
            text: q.text,
            type: q.type,
            options: q.options,
            position: index,
        }));

        const { error: questionsError } = await supabase.from('questions').insert(questionsToInsert);

        if (questionsError) {
            console.error('Error creating questions:', questionsError);
            return;
        }

        await fetchSurveys();
        setCurrentView(View.SURVEY_LIST);
    };

    const handleUpdateProfile = async (updatedUser: User) => {
        const { error } = await supabase
            .from('profiles')
            .update({
                full_name: updatedUser.fullName,
                phone: updatedUser.phone,
                address: updatedUser.address,
                avatar_url: updatedUser.profilePictureUrl,
            })
            .eq('id', updatedUser.id);

        if (error) {
            console.error('Error updating profile:', error);
        } else {
            setCurrentUser(prev => ({ ...prev!, ...updatedUser }));
            setCurrentView(View.SURVEY_LIST);
        }
    };

    const handleSaveResponse = async (answers: Answer[]) => {
        if (!selectedSurvey) return;

        const { data: responseData, error: responseError } = await supabase
            .from('survey_responses')
            .insert({
                survey_id: selectedSurvey.id,
                respondent_id: session?.user.id,
            })
            .select()
            .single();

        if (responseError || !responseData) {
            console.error('Error creating response:', responseError);
            return;
        }

        const answersToInsert = answers.map(answer => ({
            response_id: responseData.id,
            question_id: answer.questionId,
            value: answer.value,
        }));

        const { error: answersError } = await supabase.from('answers').insert(answersToInsert);

        if (answersError) {
            console.error('Error saving answers:', answersError);
            return;
        }
        
        alert('Resposta enviada com sucesso!');
        setCurrentView(View.SURVEY_LIST);
    };

    const handleSelectSurvey = useCallback(async (survey: Survey) => {
        setSelectedSurvey(survey);
        
        const { data, error } = await supabase
            .from('survey_responses')
            .select('*, answers(*)')
            .eq('survey_id', survey.id);

        if (error) {
            console.error('Error fetching responses:', error);
            setSurveyResponses([]);
        } else {
            const formattedResponses = data.map((r: any) => ({
                ...r,
                surveyId: r.survey_id,
            })) as SurveyResponse[];
            setSurveyResponses(formattedResponses);
        }

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