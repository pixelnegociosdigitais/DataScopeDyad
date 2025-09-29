import React from 'react';
import { User } from '../types';
import { LogoIcon } from './icons/LogoIcon';

interface JoinCompanyPromptProps {
    user: User;
    onLogout: () => void; // Adicionar prop para a função de logout
}

const JoinCompanyPrompt: React.FC<JoinCompanyPromptProps> = ({ user, onLogout }) => {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
            <div className="max-w-md w-full mx-auto bg-white p-8 border border-gray-200 rounded-lg shadow-lg text-center">
                <div className="flex justify-center items-center gap-3 mb-4">
                    <LogoIcon className="h-10 w-10 text-primary" />
                    <h1 className="text-3xl font-bold text-gray-800">DataScope</h1>
                </div>
                <p className="text-text-light mb-6">Bem-vindo(a), {user.fullName}!</p>
                <h2 className="text-xl font-semibold text-text-main mb-4">Aguardando Vinculação à Empresa</h2>
                <p className="text-text-light mb-6">
                    Parece que seu perfil ({user.role}) ainda não está vinculado a uma empresa.
                    Por favor, entre em contato com o administrador da sua empresa para ser adicionado.
                </p>
                <p className="text-sm text-gray-500 mb-6">
                    Se você acredita que isso é um erro, por favor, contate o suporte.
                </p>
                <button
                    onClick={onLogout}
                    className="w-full px-6 py-2 font-semibold text-white bg-red-500 rounded-md hover:bg-red-600 shadow-sm transition-colors"
                >
                    Sair
                </button>
            </div>
        </div>
    );
};

export default JoinCompanyPrompt;