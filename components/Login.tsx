import React, { useState, useEffect } from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/src/integrations/supabase/client';
import { LogoIcon } from './icons/LogoIcon';
import LoginErrorAlert from './LoginErrorAlert';
import ForgotPasswordModal from './ForgotPasswordModal';
import SignUpContactModal from '../src/components/SignUpContactModal';

const Login: React.FC = () => {
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [showError, setShowError] = useState<boolean>(false);
    const [showForgotPasswordModal, setShowForgotPasswordModal] = useState<boolean>(false);
    const [showSignUpContactModal, setShowSignUpContactModal] = useState<boolean>(false);

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_IN') {
                setErrorMessage('');
                setShowError(false);
            } else if (event === 'SIGNED_OUT') {
                // Limpar erros quando o usuário faz logout
                setErrorMessage('');
                setShowError(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // Função para mapear erros do Supabase para mensagens amigáveis
    const getErrorMessage = (error: any): string => {
        if (!error?.message) return 'Ocorreu um erro inesperado. Tente novamente.';

        const errorMessage = error.message.toLowerCase();

        if (errorMessage.includes('invalid login credentials') || 
            errorMessage.includes('invalid email or password')) {
            return 'E-mail ou senha incorretos. Verifique suas credenciais e tente novamente.';
        }

        if (errorMessage.includes('email not confirmed')) {
            return 'Sua conta ainda não foi confirmada. Verifique seu e-mail e clique no link de confirmação.';
        }

        if (errorMessage.includes('too many requests')) {
            return 'Muitas tentativas de login. Aguarde alguns minutos antes de tentar novamente.';
        }

        if (errorMessage.includes('user not found')) {
            return 'Usuário não encontrado. Verifique o e-mail digitado ou cadastre-se.';
        }

        if (errorMessage.includes('invalid email')) {
            return 'Formato de e-mail inválido. Digite um e-mail válido.';
        }

        if (errorMessage.includes('password')) {
            return 'Senha incorreta. Verifique sua senha e tente novamente.';
        }

        // Mensagem genérica para outros erros
        return 'Não foi possível realizar o login. Verifique suas credenciais e tente novamente.';
    };

    // Interceptar erros de autenticação
    useEffect(() => {
        const handleAuthError = () => {
            // Interceptar tentativas de login
            const originalSignInWithPassword = supabase.auth.signInWithPassword;
            
            supabase.auth.signInWithPassword = async (credentials) => {
                try {
                    const result = await originalSignInWithPassword.call(supabase.auth, credentials);
                    
                    if (result.error) {
                        const friendlyMessage = getErrorMessage(result.error);
                        setErrorMessage(friendlyMessage);
                        setShowError(true);
                    }
                    
                    return result;
                } catch (error) {
                    const friendlyMessage = getErrorMessage(error);
                    setErrorMessage(friendlyMessage);
                    setShowError(true);
                    throw error;
                }
            };

            // Cleanup function para restaurar o método original
            return () => {
                supabase.auth.signInWithPassword = originalSignInWithPassword;
            };
        };

        const cleanup = handleAuthError();
        return cleanup;
    }, []);

    const handleCloseError = () => {
        setShowError(false);
        setErrorMessage('');
    };

    const handleCloseForgotPasswordModal = () => {
        setShowForgotPasswordModal(false);
    };

    const handleCloseSignUpContactModal = () => {
        setShowSignUpContactModal(false);
    };

    // Interceptar cliques no link "Esqueceu sua senha?"
    useEffect(() => {
        const handleForgotPasswordClick = (event: Event) => {
            const target = event.target as HTMLElement;
            if (target && target.textContent === 'Esqueceu sua senha?') {
                event.preventDefault();
                event.stopPropagation();
                setShowForgotPasswordModal(true);
            }
        };

        // Adicionar listener para cliques em toda a página
        document.addEventListener('click', handleForgotPasswordClick, true);

        return () => {
            document.removeEventListener('click', handleForgotPasswordClick, true);
        };
    }, []);

    // Interceptar cliques no link "Não tem uma conta? Cadastre-se"
    useEffect(() => {
        const handleSignUpClick = (event: Event) => {
            const target = event.target as HTMLElement;
            if (target && target.textContent === 'Não tem uma conta? Cadastre-se') {
                event.preventDefault();
                event.stopPropagation();
                setShowSignUpContactModal(true);
            }
        };

        // Adicionar listener para cliques em toda a página
        document.addEventListener('click', handleSignUpClick, true);

        return () => {
            document.removeEventListener('click', handleSignUpClick, true);
        };
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center">
            <div className="max-w-md w-full mx-auto bg-white p-8 border border-gray-200 rounded-lg shadow-lg">
                <div className="text-center mb-8">
                    <div className="flex justify-center items-center gap-3 mb-4">
                        <LogoIcon className="h-10 w-10 text-primary" />
                        <h1 className="text-3xl font-bold text-gray-800">DataScope</h1>
                    </div>
                    <p className="text-text-light">Sua Solução Completa de Pesquisas</p>
                </div>
                <Auth
                    supabaseClient={supabase}
                    appearance={{ 
                        theme: ThemeSupa,
                        style: {
                            button: {
                                background: '#3B82F6',
                                color: 'white',
                                borderRadius: '0.5rem',
                            },
                            anchor: {
                                color: '#3B82F6',
                            },
                            message: {
                                display: 'none', // Ocultar mensagens padrão do Supabase
                            }
                        }
                    }}
                    providers={[]}
                    localization={{
                        variables: {
                            sign_in: {
                                email_label: 'Endereço de e-mail',
                                password_label: 'Senha',
                                email_input_placeholder: 'Seu e-mail',
                                password_input_placeholder: 'Sua senha',
                                button_label: 'Entrar',
                                link_text: 'Já tem uma conta? Entre',
                            },
                            sign_up: {
                                email_label: 'Endereço de e-mail',
                                password_label: 'Crie uma senha',
                                email_input_placeholder: 'Seu e-email',
                                password_input_placeholder: 'Sua senha',
                                button_label: 'Cadastrar',
                                link_text: 'Não tem uma conta? Cadastre-se',
                                // user_meta: { // Removido conforme solicitado
                                //     full_name: 'Nome Completo',
                                //     company_name: 'Nome da Empresa'
                                // }
                            },
                            forgotten_password: {
                                email_label: 'Endereço de e-mail',
                                email_input_placeholder: 'Seu e-mail',
                                button_label: 'Enviar instruções de recuperação',
                                link_text: 'Esqueceu sua senha?',
                            }
                        }
                    }}
                    view="sign_in"
                    showLinks={true}
                />
            </div>

            {/* Modal de erro personalizado */}
            {showError && (
                <LoginErrorAlert 
                    message={errorMessage}
                    onClose={handleCloseError}
                />
            )}

            {/* Modal de "Esqueceu sua senha?" */}
            <ForgotPasswordModal 
                isOpen={showForgotPasswordModal}
                onClose={handleCloseForgotPasswordModal}
            />

            {/* Modal de contato para cadastro */}
            <SignUpContactModal 
                isOpen={showSignUpContactModal}
                onClose={handleCloseSignUpContactModal}
            />
        </div>
    );
};

export default Login;