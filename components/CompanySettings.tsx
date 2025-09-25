import React, { useState, FormEvent } from 'react';
import { Company } from '../types';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';

interface CompanySettingsProps {
    company: Company;
    onUpdate: (company: Company) => void;
    onBack: () => void;
}

const CompanySettings: React.FC<CompanySettingsProps> = ({ company, onUpdate, onBack }) => {
    const [companyName, setCompanyName] = useState(company.name);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (companyName.trim()) {
            onUpdate({ ...company, name: companyName });
        }
    };

    return (
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-200 transition-colors" aria-label="Voltar">
                    <ArrowLeftIcon className="h-6 w-6 text-gray-600" />
                </button>
                <h2 className="text-2xl font-bold text-text-main">Configurações da Empresa</h2>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">Nome da Empresa</label>
                    <input
                        type="text"
                        name="companyName"
                        id="companyName"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-gray-700"
                    />
                </div>
                <div className="pt-2 flex justify-end">
                    <button type="submit" className="px-6 py-2 font-semibold text-white bg-primary rounded-md hover:bg-primary-dark shadow-sm">
                        Salvar Alterações
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CompanySettings;