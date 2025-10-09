import React, { useState, FormEvent, useEffect } from 'react';
import { User } from '../../types';
import { showError } from '../utils/toast';
import { UserIcon } from '../../components/icons/UserIcon'; // Importar UserIcon
import { UploadIcon } from '../../components/icons/UploadIcon'; // Importar UploadIcon

interface UserEditModalProps {
    user: User;
    onClose: () => void;
    onUpdateSuccess: (updatedUser: User) => void;
    onAdminUpdateUserProfile: (userId: string, updatedFields: Partial<User>) => Promise<void>;
}

const UserEditModal: React.FC<UserEditModalProps> = ({ user, onClose, onUpdateSuccess, onAdminUpdateUserProfile }) => {
    const [formData, setFormData] = useState<Partial<User>>(user);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setFormData(user);
    }, [user]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    setFormData(prev => ({ ...prev, profilePictureUrl: event.target!.result as string }));
                }
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!formData.fullName?.trim()) {
            showError('O nome completo do usuário não pode estar vazio.');
            return;
        }

        setSaving(true);
        try {
            // Chamar a função do hook useAuth para atualizar o perfil
            await onAdminUpdateUserProfile(user.id, {
                fullName: formData.fullName, // Será mapeado para 'full_name' no useAuth
                phone: formData.phone,
                address: formData.address,
                profilePictureUrl: formData.profilePictureUrl,
                status: formData.status,
            });

            // Se a atualização for bem-sucedida, notificar o componente pai
            onUpdateSuccess({ ...user, ...formData } as User);
            onClose();
        } catch (err: any) {
            // Erro já é tratado dentro de onAdminUpdateUserProfile
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-8 rounded-lg shadow-xl max-w-2xl w-full">
                <h3 className="text-xl font-bold text-text-main mb-6">Editar Usuário: {user.fullName}</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="flex items-center space-x-6">
                        {formData.profilePictureUrl ? (
                            <img src={formData.profilePictureUrl} alt="Foto do perfil" className="h-24 w-24 rounded-full object-cover" />
                        ) : (
                            <UserIcon className="h-24 w-24 p-4 bg-gray-200 rounded-full text-gray-500" />
                        )}
                        <div className="flex-1">
                            <label htmlFor="profile-picture-upload" className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                                <UploadIcon className="h-5 w-5 mr-2" />
                                <span className="text-sm text-gray-600">ALTERAR FOTO</span>
                            </label>
                            <input id="profile-picture-upload" name="profile-picture" type="file" className="sr-only" onChange={handleFileChange} accept="image/*" />
                            <p className="text-xs text-gray-500 mt-2">PNG, JPG, GIF até 10MB.</p>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">Nome Completo</label>
                        <input
                            type="text"
                            name="fullName"
                            id="fullName"
                            value={formData.fullName || ''}
                            onChange={handleChange}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-gray-700"
                            required
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
                    <div>
                        <label htmlFor="address" className="block text-sm font-medium text-gray-700">Endereço</label>
                        <input
                            type="text"
                            name="address"
                            id="address"
                            value={formData.address || ''}
                            onChange={handleChange}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-gray-700"
                        />
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

export default UserEditModal;