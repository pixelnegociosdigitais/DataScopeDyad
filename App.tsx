import React, { useState, useCallback, useEffect } from 'react';
import { User, Company, View, Survey, UserRole, Answer, SurveyResponse } from './types';
import { MOCK_SURVEYS, MOCK_RESPONSES } from './data/mockData';
import Header from './components/Header';
import SurveyList from './components/SurveyList';
import SurveyCreator from './components/SurveyCreator';
import Dashboard from './components/Dashboard';
import Profile from './components/Profile';
import SurveyForm from './components/SurveyForm';
import Login from './components/Login';
import CompanySettings from './components/CompanySettings';
import { supabase } from './src/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';

const App: React.FC = () => {
    const [session, setSession] = useState<Session | null>(null);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
    const [surveys, setSurveys] = useState<Survey[]>([]);
    const [surveyResponses, setSurveyResponses] = useState<SurveyResponse[]>(MOCK_RESPONSES);
    
    const [currentView, setCurrentView] = useState<View>(View.SURVEY_LIST);
    const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);
    const [editingSurvey, setEditingSurvey] = useState<Survey | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);
            if (session) {
                await fetchUserData(session.user.id);
            }
            setLoading(false);
        };

        fetchSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            setSession(session);
            if (session) {
                setLoading(true);
                await fetchUserData(session.user.id);
                setLoading(false);
            } else {
                setCurrentUser(null);
                setCurrentCompany(null);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchUserData = async (userId: string) => {
        const { data: profileData, error: profileError } = await supabase
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
            .eq('id', userId)
            .single();

        if (profileError) {
            console.error('Error fetching profile:', profileError);
            return;
        }

        if (profileData) {
            const user: User = {
                id: profileData.id,
                fullName: profileData.full_name || '',
                role: profileData.role as UserRole,
                email: session?.user.email || '',
                phone: profileData.phone || undefined,
                address: profileData.address || undefined,
                profilePictureUrl: profileData.avatar_url || undefined,
            };
            setCurrentUser(user);

            if (profileData.company) {
                const company: Company = {
                    id: profileData.company.id,
                    name: profileData.company.name,
                };
                setCurrentCompany(company);
                // TODO: Fetch surveys from database for the current company
                setSurveys(MOCK_SURVEYS); 
            }
        }
    };

    const handleSaveSurvey = (surveyData: Survey) => {
        // This logic remains local for now.
        if (editingSurvey) {
            setSurveys(prev => prev.map(s => s.id === editingSurvey.id ? { ...s, ...surveyData } : s));
            alert('Pesquisa atualizada com sucesso! (localmente)');
            setEditingSurvey(null);
        } else {
            const newSurvey: Survey = { ...surveyData, id: `s${Date.now()}`, companyId: currentCompany!.id };
            setSurveys(prev => [newSurvey, ...prev]);
            alert('Pesquisa criada com sucesso! (localmente)');
        }
        setCurrentView(View.SURVEY_LIST);
    };

    const handleUpdateProfile = async (updatedUser: User) => {
        const { error } = await supabase
            .from('profiles')
            .update({
                full_name: updatedUser.fullName,
                phone: updatedUser.phone,
                address: updatedUser.address,
            })
            .eq('id', updatedUser.id);

        if (error) {
            alert('Erro ao atualizar o perfil.');
        } else {
            setCurrentUser(updatedUser);
            alert('Perfil atualizado com sucesso!');
            setCurrentView(View.SURVEY_LIST);
        }
    };

    const handleUpdateCompany = async (updatedCompany: Company) => {
        if (!currentCompany) return;
        const { data, error } = await supabase
            .from('companies')
            .update({ name: updatedCompany.name })
            .eq('id', currentCompany.id)
            .select()
            .single();

        if (error) {
            alert('Erro ao atualizar a empresa.');
        } else if (data) {
            setCurrentCompany(data as Company);
            alert('Empresa atualizada com sucesso!');
            setCurrentView(View.SURVEY_LIST);
        }
    };

    const handleSaveResponse = (answers: Answer[]) => {
        if (!selectedSurvey) return;
        const newResponse: SurveyResponse = { id: `r${Date.now()}`, surveyId: selectedSurvey.id, answers };
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

    const handleEditSurvey = (survey: Survey) => {
        setEditingSurvey(survey);
        setCurrentView(View.EDIT_SURVEY);
    };

    const handleDeleteSurvey = (surveyId: string) => {
        if (window.confirm('Tem certeza que deseja excluir esta pesquisa?')) {
            setSurveys(prev => prev.filter(s => s.id !== surveyId));
            alert('Pesquisa excluída com sucesso! (localmente)');
        }
    };

    const handleBack = () => {
        setCurrentView(View.SURVEY_LIST);
        setSelectedSurvey(null);
        setEditingSurvey(null);
    };

    const renderContent = () => {
        if (!currentUser || !currentCompany) return null;
        const canManage = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.DEVELOPER;

        switch (currentView) {
            case View.SURVEY_LIST:
                return <SurveyList surveys={surveys} onSelectSurvey={handleSelectSurvey} onStartResponse={handleStartResponse} onEditSurvey={handleEditSurvey} onDeleteSurvey={handleDeleteSurvey} canManage={canManage} />;
            case View.CREATE_SURVEY:
                return <SurveyCreator onSave={handleSaveSurvey} onBack={handleBack} />;
            case View.EDIT_SURVEY:
                return <SurveyCreator onSave={handleSaveSurvey} onBack={handleBack} surveyToEdit={editingSurvey} />;
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
            case View.COMPANY_SETTINGS:
                return <CompanySettings company={currentCompany} onUpdate={handleUpdateCompany} onBack={handleBack} />;
            default:
                return <SurveyList surveys={surveys} onSelectSurvey={handleSelectSurvey} onStartResponse={handleStartResponse} onEditSurvey={handleEditSurvey} onDeleteSurvey={handleDeleteSurvey} canManage={canManage} />;
        }
    };

    if (loading) {
        return <div className="h-screen w-screen flex items-center justify-center">Carregando...</div>;
    }

    if (!session) {
        return <Login />;
    }

    if (!currentUser || !currentCompany) {
        return <div className="h-screen w-screen flex items-center justify-center">Carregando dados do usuário...</div>;
    }

    const canManage = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.DEVELOPER;
    const canManageCompany = currentUser.role === UserRole.ADMIN;

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