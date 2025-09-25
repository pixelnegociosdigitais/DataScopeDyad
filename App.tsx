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
import CompanySetup from './components/CompanySetup'; // Importar o novo componente
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
                await fetchUserData(session.user.id, session.user.email || '');
            }
            setLoading(false);
        };

        fetchSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            setSession(session);
            if (session) {
                setLoading(true);
                await fetchUserData(session.user.id, session.user.email || '');
                setLoading(false);
            } else {
                setCurrentUser(null);
                setCurrentCompany(null);
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
            // Se o perfil não for encontrado, pode ser um novo usuário sem perfil ainda
            // Ou um problema de RLS. Por enquanto, vamos apenas retornar.
            return;
        }

        if (profileData) {
            const user: User = {
                id: profileData.id,
                fullName: profileData.full_name || '',
                role: profileData.role as UserRole,
                email: userEmail, // Usar o email da sessão
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
                setSurveys(MOCK_SURVEYS); 
            } else {
                // Se o usuário tem perfil mas não tem empresa, direciona para a configuração
                setCurrentView(View.COMPANY_SETUP);
            }
        }
    };

    const handleCreateCompany = async (companyName: string) => {
        if (!currentUser) return;

        // 1. Inserir a nova empresa
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

        // 2. Atualizar o perfil do usuário com a nova company_id e role de Administrador
        const { error: profileUpdateError } = await supabase
            .from('profiles')
            .update({ company_id: newCompanyData.id, role: UserRole.ADMIN })
            .eq('id', currentUser.id);

        if (profileUpdateError) {
            alert('Erro ao vincular a empresa ao seu perfil: ' + profileUpdateError.message);
            console.error('Erro ao vincular empresa ao perfil:', profileUpdateError);
            // Se falhar aqui, talvez seja bom tentar reverter a criação da empresa ou lidar com isso
            return;
        }

        // 3. Atualizar o estado local
        setCurrentCompany(newCompanyData);
        setCurrentUser(prev => prev ? { ...prev, role: UserRole.ADMIN } : null); // Atualiza a role localmente
        alert('Empresa criada e vinculada com sucesso!');
        setCurrentView(View.SURVEY_LIST); // Volta para a lista de pesquisas
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
        if (!currentUser) return null; // currentUser deve existir aqui

        // Se o usuário está logado mas não tem empresa, mostra a tela de setup
        if (!currentCompany && currentView !== View.COMPANY_SETUP) {
            setCurrentView(View.COMPANY_SETUP); // Garante que a view correta seja definida
            return null; // Retorna null para que o próximo renderContent use a view atualizada
        }
        
        if (currentView === View.COMPANY_SETUP) {
            return <CompanySetup user={currentUser} onCreateCompany={handleCreateCompany} />;
        }

        // A partir daqui, currentUser e currentCompany devem existir
        const canManage = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.DEVELOPER;
        const canManageCompany = currentUser.role === UserRole.ADMIN;

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
                return <CompanySettings company={currentCompany!} onUpdate={handleUpdateCompany} onBack={handleBack} />;
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

    // Se o usuário está logado mas ainda não tem um perfil ou empresa carregados
    if (!currentUser || (!currentCompany && currentView !== View.COMPANY_SETUP)) {
        return <div className="h-screen w-screen flex items-center justify-center">Carregando dados do usuário...</div>;
    }

    // Se o usuário está logado e tem um perfil, mas não tem empresa, mostra a tela de setup
    if (currentUser && !currentCompany && currentView === View.COMPANY_SETUP) {
        return <CompanySetup user={currentUser} onCreateCompany={handleCreateCompany} />;
    }

    // A partir daqui, currentUser e currentCompany devem existir (ou a view é COMPANY_SETUP)
    const canManage = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.DEVELOPER;
    const canManageCompany = currentUser.role === UserRole.ADMIN;

    return (
        <div className="flex flex-col h-screen bg-background text-text-main">
            <Header 
                user={currentUser} 
                company={currentCompany!} // currentCompany é garantido aqui ou a view é COMPANY_SETUP
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