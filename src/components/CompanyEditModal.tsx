import React, { useState, FormEvent, useEffect } from 'react';
import { Company } from '../../types';
import { showError, showSuccess } from '../utils/toast';
import { supabase } from '../integrations/supabase/client';

interface CompanyEditModalProps {
    company: Company;
    onClose: () => void;
    onUpdateSuccess: (updatedCompany: Company) => void;
}

const CompanyEditModal: React.FC<CompanyEditModalProps> = ({ company, onClose, onUpdateSuccess }) => {
    const [formData, setFormData] = useState<Company>(company);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setFormData(company);
    }, [company]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            showError('O nome da empresa não pode estar vazio.');
            return;
        }

        setSaving(true);
        try {
            const { data, error } = await supabase
                .from('companies')
                .update({
                    name: formData.name,
                    cnpj: formData.cnpj,
                    phone: formData.phone,
                    address_street: formData.address_street,
                    address_neighborhood: formData.address_neighborhood,
                    address_complement: formData.address_complement,
                    address_city: formData.address_city,
                    address_state: formData.address_state,
                })
                .eq('id', formData.id)
                .select()
                .single();

            if (error) throw error;

            if (data) {
                showSuccess('Empresa atualizada com sucesso!');
                onUpdateSuccess(data as Company);
                onClose();
            }
        } catch (err: any) {
            console.error('Erro ao atualizar a empresa:', err.message);
            showError('Erro ao atualizar a empresa: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-8 rounded-lg shadow-xl max-w-2xl w-full">
                <h3 className="text-xl font-bold text-text-main mb-6">Editar Empresa: {company.name}</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
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
                    
                    <div className="pt-4 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2 font-semibold text-gray-700 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
                            disabled={saving}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2 font-semibold text-white bg-primary rounded-md hover:bg-primary-dark shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={saving}
                        >
                            {saving ? 'Salvando...' : 'Salvar Alterações'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CompanyEditModal;