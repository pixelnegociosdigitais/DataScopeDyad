import React, { useState } from 'react';
import { User, Company } from '../types';
import { LogoIcon } from './icons/LogoIcon';

interface LoginProps {
    onLogin: (userId: string, companyId: string) => void;
    users: User[];
    companies: Company[];
}

const Login: React.FC<LoginProps> = ({ onLogin, users, companies }) => {
    const [selectedUserId, setSelectedUserId] = useState(users[0]?.id || '');
    const [selectedCompanyId, setSelectedCompanyId] = useState(companies[0]?.id || '');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUserId || !selectedCompanyId) {
            setError('Por favor, selecione um usuário e uma empresa.');
            return;
        }
        setError('');
        onLogin(selectedUserId, selectedCompanyId);
    };

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
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="company" className="text-sm font-medium text-gray-700 block mb-2">
                            Selecione a Empresa
                        </label>
                        <select
                            id="company"
                            value={selectedCompanyId}
                            onChange={(e) => setSelectedCompanyId(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary bg-white text-gray-700"
                        >
                            {companies.map(company => (
                                <option key={company.id} value={company.id}>{company.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="user" className="text-sm font-medium text-gray-700 block mb-2">
                            Selecione o Perfil (Demonstração)
                        </label>
                        <select
                            id="user"
                            value={selectedUserId}
                            onChange={(e) => setSelectedUserId(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary bg-white text-gray-700"
                        >
                            {users.map(user => (
                                <option key={user.id} value={user.id}>{`${user.fullName} (${user.role})`}</option>
                            ))}
                        </select>
                    </div>
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    <button type="submit" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
                        Entrar
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;