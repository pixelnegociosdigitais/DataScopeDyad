import React, { useState, FormEvent } from 'react';
import { User } from '../types';
import { LogoIcon } from './icons/LogoIcon';
import { showError } from '../src/utils/toast'; // Importar showError

interface CompanySetupProps {
    user: User;
    onCreateCompany: (companyName: string) => void;
}

const CompanySetup: React.FC<CompanySetupProps> = ({ user, onCreateCompany }) => {
    const [companyName, setCompanyName] = useState('');

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (companyName.trim()) {
            onCreateCompany(companyName);
        } else {
            showError('Por favor, insira o nome da sua empresa.');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
            <div className="max-w-md w-full mx-auto bg-white p-8 border border-gray-200 rounded-lg shadow-lg text-center">
                <div className="flex justify-center items-center gap-3 mb-4">
                    <LogoIcon className="h-10 w-10 text-primary" />
                    <h1 className="text-3xl font-bold text-gray-800">DataScope</h1>
                </div>
                <p className="text-text-light mb-6">Bem-vindo(a), {user.fullName}!</p>
                <h2 className="text-xl font-semibold text-text-main mb-4">Configure sua Empresa</h2>
                <p className="text-text-light mb-6">Parece que você ainda não tem uma empresa associada. Por favor, crie uma para começar a usar o DataScope.</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="companyName" className="sr-only">Nome da Empresa</label>
                        <input
                            type="text"
                            name="companyName"
                            id="companyName"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            placeholder="Nome da sua empresa"
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-gray-700"
                            required
                        />
                    </div>
                    <button type="submit" className="w-full px-6 py-2 font-semibold text-white bg-primary rounded-md hover:bg-primary-dark shadow-sm">
                        Criar Empresa
                    </button>
                </form>
            </div>
        </div>
    );
};

export default CompanySetup;