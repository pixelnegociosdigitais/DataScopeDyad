import React, { useState, useCallback, useEffect } from 'react';
import { User, Company, View, Survey, UserRole, Answer, SurveyResponse, Question } from './types';
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
import { supabase } from './src/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';

const App: React.FC = () => {
    const [session, setSession] = useState<Session | null>(null);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
    const [surveys, setSurveys] = useState<Survey[]>([]);
    const [surveyResponses, setSurveyResponses] = useState<SurveyResponse[]>([]);
    const [templates, setTemplates] = useState<Survey[]>([]);
    
    const [currentView, setCurrentView] = useState<View>(View.SURVEY_LIST);
    const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);
    const [editingSurvey, setEditingSurvey] = useState<Survey | null>(null);
    const [loading, setLoading] = useState(true);

    // Helper para buscar pesquisas da empresa atual
    const fetchSurveys = useCallback(async (companyId: string) => {
        const { data, error } = await supabase
            .from('surveys')
            .select(`
                id,
                title,
                company_id,
                created_by,
                created_at,
                questions (
                    id,
                    text,
                    type,
                    options,
                    position
                )
            `)
            .eq('company_id', companyId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Erro ao buscar pesquisas:', error);
            return [];
        }

        if (data) {
            const fetchedSurveys: Survey[] = data.map(s => ({
                id: s.id,
                title: s.title,
                companyId: s.company_id,
                questions: s.questions.map((q: any) => ({
                    id: q.id,
                    text: q.text,
                    type: q.type,
                    options: q.options || undefined,
                })).sort((a, b) => (a.position || 0) - (b.position || 0)),
            }));
            setSurveys(fetchedSurveys);
            return fetchedSurveys;
        }
        return [];
    }, []);

    // Helper para buscar respostas de uma pesquisa específica
    const fetchSurveyResponses = useCallback(async (surveyId: string) => {
        const { data, error } = await supabase
            .from('survey_responses')
            .select(`
                id,
                survey_id,
                respondent_id,
                created_at,
                answers (
                    question_id,
                    value
                )
            `)
            .eq('survey_id', surveyId);

        if (error) {
            console.error('Erro ao buscar respostas da pesquisa:', error);
            return [];
        }

        if (data) {
            const fetchedResponses: SurveyResponse[] = data.map(r => ({
                id: r.id,
                surveyId: r.survey_id,
                answers: r.answers.map((a: any) => ({
                    questionId: a.question_id,
                    value: a.value,
                })),
            }));
            return fetchedResponses;
        }
        return [];
    }, []);


    useEffect(() => {
        const fetchInitialData = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);
            if (session) {
                await fetchUserData(session.user.id, session.user.email || '');
            }
            await fetchTemplates();
            setLoading(false);
        };

        fetchInitialData();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            setSession(session);
            if (session) {
                setLoading(true);
                await fetchUserData(session.user.id, session.user.email || '');
                await fetchTemplates();
                setLoading(false);
            } else {
                setCurrentUser(null);
                setCurrentCompany(null);
                setSurveys([]);
                setSurveyResponses([]);
                setTemplates([]);
            }
        });

        return () => subscription.unsubscribe();
    }, [fetchSurveys]);

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
            console.error('Erro ao buscar perfil:', profileError);
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
                await fetchSurveys(company.id);
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
            console.error('Erro ao buscar templates de pesquisa:', error);
            return;
        }

        if (data) {
            const fetchedTemplates: Survey[] = data.map(template => ({
                id: template.id,
                title: template.title,
                companyId: '',
                questions: template.questions as Question[],
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
        await fetchSurveys(newCompanyData.id);
    };

    const handleSaveSurvey = async (surveyData: Survey) => {
        if (!currentUser || !currentCompany) {
            alert('Usuário ou empresa não identificados.');
            return;
        }

        if (editingSurvey) {
            // Atualizar pesquisa existente
            const { error: surveyUpdateError } = await supabase
                .from('surveys')
                .update({ title: surveyData.title })
                .eq('id', editingSurvey.id);

            if (surveyUpdateError) {
                alert('Erro ao atualizar a pesquisa: ' + surveyUpdateError.message);
                console.error('Erro ao atualizar pesquisa:', surveyUpdateError);
                return;
            }

            // Excluir perguntas existentes
            const { error: deleteQuestionsError } = await supabase
                .from('questions')
                .delete()
                .eq('survey_id', editingSurvey.id);

            if (deleteQuestionsError) {
                alert('Erro ao remover perguntas antigas: ' + deleteQuestionsError.message);
                console.error('Erro ao remover perguntas antigas:', deleteQuestionsError);
                return;
            }

            // Inserir novas/atualizadas perguntas
            const questionsToInsert = surveyData.questions.map((q, index) => ({
                survey_id: editingSurvey.id,
                text: q.text,
                type: q.type,
                options: q.options || null,
                position: index,
            }));

            const { error: insertQuestionsError } = await supabase
                .from('questions')
                .insert(questionsToInsert);

            if (insertQuestionsError) {
                alert('Erro ao inserir novas perguntas: ' + insertQuestionsError.message);
                console.error('Erro ao inserir novas perguntas:', insertQuestionsError);
                return;
            }

            alert('Pesquisa atualizada com sucesso!');
            setEditingSurvey(null);

        } else {
            // Criar nova pesquisa
            const { data: newSurvey, error: surveyInsertError } = await supabase
                .from('surveys')
                .insert({
                    title: surveyData.title,
                    company_id: currentCompany.id,
                    created_by: currentUser.id,
                })
                .select()
                .single();

            if (surveyInsertError) {
                alert('Erro ao criar a pesquisa: ' + surveyInsertError.message);
                console.error('Erro ao criar pesquisa:', surveyInsertError);
                return;
            }

            if (newSurvey) {
                const questionsToInsert = surveyData.questions.map((q, index) => ({
                    survey_id: newSurvey.id,
                    text: q.text,
                    type: q.type,
                    options: q.options || null,
                    position: index,
                }));

                const { error: questionsInsertError } = await supabase
                    .from('questions')
                    .insert(questionsToInsert);

                if (questionsInsertError) {
                    alert('Erro ao inserir perguntas da pesquisa: ' + questionsInsertError.message);
                    console.error('Erro ao inserir perguntas:', questionsInsertError);
                    return;
                }
                alert('Pesquisa criada com sucesso!');
            }
        }
        await fetchSurveys(currentCompany.id);
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
            alert('Erro ao atualizar o perfil: ' + error.message);
            console.error('Erro ao atualizar perfil:', error);
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
            alert('Erro ao atualizar a empresa: ' + error.message);
            console.error('Erro ao atualizar empresa:', error);
        } else if (data) {
            setCurrentCompany(data as Company);
            alert('Empresa atualizada com sucesso!');
            setCurrentView(View.SURVEY_LIST);
        }
    };

    const handleSaveResponse = async (answers: Answer[]) => {
        if (!selectedSurvey || !currentUser) return;

        const { data: newResponse, error: responseError } = await supabase
            .from('survey_responses')
            .insert({
                survey_id: selectedSurvey.id,
                respondent_id: currentUser.id,
            })
            .select()
            .single();

        if (responseError) {
            alert('Erro ao enviar a resposta: ' + responseError.message);
            console.error('Erro ao enviar resposta:', responseError);
            return;
        }

        if (newResponse) {
            const answersToInsert = answers.map(a => ({
                response_id: newResponse.id,
                question_id: a.questionId,
                value: a.value,
            }));

            const { error: answersError } = await supabase
                .from('answers')
                .insert(answersToInsert);

            if (answersError) {
                alert('Erro ao salvar as respostas detalhadas: ' + answersError.message);
                console.error('Erro ao salvar respostas detalhadas:', answersError);
                return;
            }
            alert('Resposta enviada com sucesso!');
            setCurrentView(View.SURVEY_LIST);
        }
    };

    const handleSelectSurvey = useCallback(async (survey: Survey) => {
        setSelectedSurvey(survey);
        const responses = await fetchSurveyResponses(survey.id);
        setSurveyResponses(responses);
        setCurrentView(View.DASHBOARD);
    }, [fetchSurveyResponses]);

    const handleStartResponse = useCallback((survey: Survey) => {
        setSelectedSurvey(survey);
        setCurrentView(View.RESPOND_SURVEY);
    }, []);

    const handleEditSurvey = (survey: Survey) => {
        setEditingSurvey(survey);
        setCurrentView(View.EDIT_SURVEY);
    };

    const handleDeleteSurvey = async (surveyId: string) => {
        if (window.confirm('Tem certeza que deseja excluir esta pesquisa? Todas as perguntas e respostas associadas também serão excluídas.')) {
            const { error } = await supabase
                .from('surveys')
                .delete()
                .eq('id', surveyId);

            if (error) {
                alert('Erro ao excluir a pesquisa: ' + error.message);
                console.error('Erro ao excluir pesquisa:', error);
            } else {
                alert('Pesquisa excluída com sucesso!');
                if (currentCompany) {
                    await fetchSurveys(currentCompany.id);
                }
                if (selectedSurvey?.id === surveyId) {
                    setSelectedSurvey(null);
                }
                if (editingSurvey?.id === surveyId) {
                    setEditingSurvey(null);
                }
            }
        }
    };

    const handleBack = () => {
        setCurrentView(View.SURVEY_LIST);
        setSelectedSurvey(null);
        setEditingSurvey(null);
        setSurveyResponses([]);
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
                    return <Dashboard survey={selectedSurvey} responses={surveyResponses} onBack={handleBack} />;
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
            case View.GIVEAWAYS:
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