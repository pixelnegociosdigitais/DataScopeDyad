import React, { useState, FormEvent } from 'react';
import { Company } from '../types';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';
import ConfirmationDialog from '../src/components/ConfirmationDialog';
import { showSuccess, showError } from '../src/utils/toast';

interface CompanySettingsProps {
    company: Company;
    onUpdate: (company: Company) => void;
    onBack: () => void;
}

const CompanySettings: React.FC<CompanySettingsProps> = ({ company, onUpdate, onBack }) => {
    const [formData, setFormData] = useState<Company>(company);
    const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (formData.name.trim()) {
            onUpdate(formData);
            showSuccess('Configurações da empresa atualizadas com sucesso!');
            setShowConfirmationDialog(true);
        } else {
            showError('O nome da empresa não pode estar vazio.');
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
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nome da Empresa</label>
                    <input
                        type="text"
                        name="name"
                        id="name"
                        value={formData.name}
                        onChange={handleChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-gray-700"
                        required
                    />
                </div>
                <div>
                    <label htmlFor="cnpj" className="block text-sm font-medium text-gray-700">CNPJ</label>
                    <input
                        type="text"
                        name="cnpj"
                        id="cnpj"
                        value={formData.cnpj || ''}
                        onChange={handleChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-gray-700"
                    />
                </div>
                <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Telefone</label>
                    <input
                        type="tel"
                        name="phone"
                        id="phone"
                        value={formData.phone || ''}
                        onChange={handleChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-gray-700"
                    />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="address_street" className="block text-sm font-medium text-gray-700">Rua</label>
                        <input
                            type="text"
                            name="address_street"
                            id="address_street"
                            value={formData.address_street || ''}
                            onChange={handleChange}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-gray-700"
                        />
                    </div>
                    <div>
                        <label htmlFor="address_neighborhood" className="block text-sm font-medium text-gray-700">Bairro</label>
                        <input
                            type="text"
                            name="address_neighborhood"
                            id="address_neighborhood"
                            value={formData.address_neighborhood || ''}
                            onChange={handleChange}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-gray-700"
                        />
                    </div>
                </div>
                <div>
                    <label htmlFor="address_complement" className="block text-sm font-medium text-gray-700">Complemento</label>
                    <input
                        type="text"
                        name="address_complement"
                        id="address_complement"
                        value={formData.address_complement || ''}
                        onChange={handleChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-gray-700"
                    />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="address_city" className="block text-sm font-medium text-gray-700">Cidade</label>
                        <input
                            type="text"
                            name="address_city"
                            id="address_city"
                            value={formData.address_city || ''}
                            onChange={handleChange}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-gray-700"
                        />
                    </div>
                    <div>
                        <label htmlFor="address_state" className="block text-sm font-medium text-gray-700">Estado</label>
                        <input
                            type="text"
                            name="address_state"
                            id="address_state"
                            value={formData.address_state || ''}
                            onChange={handleChange}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-gray-700"
                        />
                    </div>
                </div>
                
                <div className="pt-2 flex justify-end">
                    <button type="submit" className="px-6 py-2 font-semibold text-white bg-primary rounded-md hover:bg-primary-dark shadow-sm">
                        Salvar Alterações
                    </button>
                </div>
            </form>

            {showConfirmationDialog && (
                <ConfirmationDialog
                    title="Empresa Atualizada!"
                    message="As configurações da sua empresa foram salvas com sucesso. O que você gostaria de fazer agora?"
                    confirmText="Voltar para Início"
                    onConfirm={() => {
                        setShowConfirmationDialog(false);
                        onBack();
                    }}
                    cancelText="Continuar Editando"
                    onCancel={() => setShowConfirmationDialog(false)}
                />
            )}
        </div>
    );
};

export default CompanySettings;