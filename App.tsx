import React, { useState, useCallback, useEffect } from 'react';
import { User, Company, View, Survey, UserRole, Answer, SurveyResponse } from './types';
import { MOCK_RESPONSES } from './data/mockData'; // MOCK_SURVEYS será removido
import Header from './components/Header';
import SurveyList from './components/SurveyList';
import SurveyCreator from './components/SurveyCreator';
import Dashboard from './components/Dashboard';
import Profile from './components/Profile';
import SurveyForm from './components/SurveyForm';
import Login from './components/Login';
import CompanySettings from './components/CompanySettings';
import CompanySetup from './components/CompanySetup';
import Giveaways from './components/Giveaways'; // Importar o novo componente Giveaways
import { supabase } from './src/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';

const App: React.FC = () => {
    const [session, setSession] = useState<Session | null>(null);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
    const [surveys, setSurveys] = useState<Survey[]>([]);
    const [surveyResponses, setSurveyResponses] = useState<SurveyResponse[]>(MOCK_RESPONSES);
    const [templates, setTemplates] = useState<Survey[]>([]); // Novo estado para templates
    
    const [currentView, setCurrentView] = useState<View>(View.SURVEY_LIST);
    const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);
    const [editingSurvey, setEditingSurvey] = useState<Survey | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchInitialData = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);
            if (session) {
                await fetchUserData(session.user.id, session.user.email || '');
            }
            await fetchTemplates(); // Buscar templates
            setLoading(false);
        };

        fetchInitialData();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            setSession(session);
            if (session) {
                setLoading(true);
                await fetchUserData(session.user.id, session.user.email || '');
                await fetchTemplates(); // Buscar templates novamente
                setLoading(false);
            } else {
                setCurrentUser(null);
                setCurrentCompany(null);
                setTemplates([]);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchUserData = async (userId: string, userEmail: string) => {
        const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select(`
                id,
                full_name,
                role,
                phone,
                address,
                avatar_url,
                company:companies (
                    id, 
                    name,
                    cnpj,
                    phone,
                    address_street,
                    address_neighborhood,
                    address_complement,
                    address_city,
                    address_state
                )
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
                email: userEmail,
                phone: profileData.phone || undefined,
                address: profileData.address || undefined,
                profilePictureUrl: profileData.avatar_url || undefined,
            };
            setCurrentUser(user);

            if (profileData.company) {
                const company: Company = {
                    id: profileData.company.id,
                    name: profileData.company.name,
                    cnpj: profileData.company.cnpj || undefined,
                    phone: profileData.company.phone || undefined,
                    address_street: profileData.company.address_street || undefined,
                    address_neighborhood: profileData.company.address_neighborhood || undefined,
                    address_complement: profileData.company.address_complement || undefined,
                    address_city: profileData.company.address_city || undefined,
                    address_state: profileData.company.address_state || undefined,
                };
                setCurrentCompany(company);
                // TODO: Fetch surveys from database for the current company
                // setSurveys(MOCK_SURVEYS); // Remover esta linha quando as pesquisas forem do DB
            } else {
                setCurrentView(View.COMPANY_SETUP);
            }
        }
    };

    const fetchTemplates = async () => {
        const { data, error } = await supabase
            .from('survey_templates')
            .select('id, title, questions');

        if (error) {
            console.error('Error fetching survey templates:', error);
            return;
        }

        if (data) {
            // Mapear os dados do banco para o tipo Survey
            const fetchedTemplates: Survey[] = data.map(template => ({
                id: template.id,
                title: template.title,
                companyId: '', // Templates não têm companyId, será definido ao criar a pesquisa
                questions: template.questions,
            }));
            setTemplates(fetchedTemplates);
        }
    };

    const handleCreateCompany = async (companyName: string) => {
        if (!currentUser) return;

        const { data: newCompanyData, error: companyError } = await supabase
            .from('companies')
            .insert({ name: companyName })
            .select()
            .single();

        if (companyError) {
            alert('Erro ao criar a empresa: ' + companyError.message);
            console.error('Erro ao criar a empresa:', companyError);
            return;
        }

        const { error: profileUpdateError } = await supabase
            .from('profiles')
            .update({ company_id: newCompanyData.id, role: UserRole.ADMIN })
            .eq('id', currentUser.id);

        if (profileUpdateError) {
            alert('Erro ao vincular a empresa ao seu perfil: ' + profileUpdateError.message);
            console.error('Erro ao vincular empresa ao perfil:', profileUpdateError);
            return;
        }

        setCurrentCompany(newCompanyData);
        setCurrentUser(prev => prev ? { ...prev, role: UserRole.ADMIN } : null);
        alert('Empresa criada e vinculada com sucesso!');
        setCurrentView(View.SURVEY_LIST);
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
            .update({ 
                name: updatedCompany.name,
                cnpj: updatedCompany.cnpj,
                phone: updatedCompany.phone,
                address_street: updatedCompany.address_street,
                address_neighborhood: updatedCompany.address_neighborhood,
                address_complement: updatedCompany.address_complement,
                address_city: updatedCompany.address_city,
                address_state: updatedCompany.address_state,
            })
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
        if (!currentUser) return null;

        if (!currentCompany && currentView !== View.COMPANY_SETUP) {
            setCurrentView(View.COMPANY_SETUP);
            return null;
        }
        
        if (currentView === View.COMPANY_SETUP) {
            return <CompanySetup user={currentUser} onCreateCompany={handleCreateCompany} />;
        }

        const canManage = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.DEVELOPER;
        const canManageCompany = currentUser.role === UserRole.ADMIN;

        switch (currentView) {
            case View.SURVEY_LIST:
                return <SurveyList surveys={surveys} onSelectSurvey={handleSelectSurvey} onStartResponse={handleStartResponse} onEditSurvey={handleEditSurvey} onDeleteSurvey={handleDeleteSurvey} canManage={canManage} />;
            case View.CREATE_SURVEY:
                return <SurveyCreator onSave={handleSaveSurvey} onBack={handleBack} templates={templates} />;
            case View.EDIT_SURVEY:
                return <SurveyCreator onSave={handleSaveSurvey} onBack={handleBack} surveyToEdit={editingSurvey} templates={templates} />;
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
                return <CompanySettings company={currentCompany!} onUpdate={handleUpdateCompany} onBack={handleBack} />;
            case View.GIVEAWAYS: // Nova case para a view de sorteios
                return <Giveaways currentUser={currentUser} currentCompany={currentCompany!} />;
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

    if (!currentUser || (!currentCompany && currentView !== View.COMPANY_SETUP)) {
        return <div className="h-screen w-screen flex items-center justify-center">Carregando dados do usuário...</div>;
    }

    if (currentUser && !currentCompany && currentView === View.COMPANY_SETUP) {
        return <CompanySetup user={currentUser} onCreateCompany={handleCreateCompany} />;
    }

    const canManage = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.DEVELOPER;
    const canManageCompany = currentUser.role === UserRole.ADMIN;

    return (
        <div className="flex flex-col h-screen bg-background text-text-main">
            <Header 
                user={currentUser} 
                company={currentCompany!}
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