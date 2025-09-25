import React from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/src/integrations/supabase/client';
import { LogoIcon } from './icons/LogoIcon';

const Login: React.FC = () => {
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
                    appearance={{ theme: ThemeSupa }}
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
                                email_input_placeholder: 'Seu e-mail',
                                password_input_placeholder: 'Sua senha',
                                button_label: 'Cadastrar',
                                link_text: 'Não tem uma conta? Cadastre-se',
                                user_meta: {
                                    full_name: 'Nome Completo',
                                    company_name: 'Nome da Empresa'
                                }
                            },
                            forgotten_password: {
                                email_label: 'Endereço de e-mail',
                                email_input_placeholder: 'Seu e-mail',
                                button_label: 'Enviar instruções de recuperação',
                                link_text: 'Esqueceu sua senha?',
                            }
                        },
                    }}
                    view="sign_in"
                    showLinks={true}
                />
            </div>
        </div>
    );
};

export default Login;