import React, { useState, FormEvent } from 'react';
import { User } from '../types';
import { LogoIcon } from './icons/LogoIcon';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';
import { showError, showSuccess } from '../src/utils/toast';
import ConfirmationDialog from '../src/components/ConfirmationDialog';

interface CompanyCreationFormProps {
    user: User;
    onCreateCompany: (companyData: { name: string }) => void;
    onBack: () => void;
}

const CompanyCreationForm: React.FC<CompanyCreationFormProps> = ({ user, onCreateCompany, onBack }) => {
    const [companyName, setCompanyName] = useState('');
    const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (companyName.trim()) {
            onCreateCompany({ name: companyName });
            showSuccess('Empresa criada e vinculada com sucesso!');
            setShowConfirmationDialog(true);
        } else {
            showError('Por favor, insira o nome da sua empresa.');
        }
    };

    return (
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-200 transition-colors" aria-label="Voltar">
                    <ArrowLeftIcon className="h-6 w-6 text-gray-600" />
                </button>
                <div className="flex items-center gap-3">
                    <LogoIcon className="h-8 w-8 text-primary" />
                    <h2 className="text-2xl font-bold text-text-main">Criar Nova Empresa</h2>
                </div>
            </div>
            <p className="text-text-light mb-6">
                Bem-vindo(a), {user.fullName}! Parece que você ainda não tem uma empresa associada.
                Por favor, crie uma para começar a usar o DataScope.
            </p>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">Nome da Empresa</label>
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
                <div className="pt-2 flex justify-end">
                    <button type="submit" className="px-6 py-2 font-semibold text-white bg-primary rounded-md hover:bg-primary-dark shadow-sm">
                        Criar Empresa
                    </button>
                </div>
            </form>

            {showConfirmationDialog && (
                <ConfirmationDialog
                    title="Empresa Criada!"
                    message="Sua empresa foi criada e vinculada com sucesso. Você já pode começar a usar o DataScope!"
                    confirmText="Ir para Início"
                    onConfirm={() => {
                        setShowConfirmationDialog(false);
                        onBack(); // Volta para a lista de pesquisas, que é a view padrão após a criação
                    }}
                    showCancelButton={false}
                />
            )}
        </div>
    );
};

export default CompanyCreationForm;