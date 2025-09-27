import React, { useState, ChangeEvent, FormEvent } from 'react';
import { User } from '../types';
import { UserIcon } from './icons/UserIcon';
import { UploadIcon } from './icons/UploadIcon';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';
import ConfirmationDialog from './ConfirmationDialog'; // Importar o novo componente
import { showSuccess, showError } from '../src/utils/toast'; // Importar toasts

interface ProfileProps {
    user: User;
    onUpdate: (user: User) => void;
    onBack: () => void;
}

const Profile: React.FC<ProfileProps> = ({ user, onUpdate, onBack }) => {
    const [formData, setFormData] = useState<User>(user);
    const [showConfirmationDialog, setShowConfirmationDialog] = useState(false); // Estado para o diálogo

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
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

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        // Aqui você chamaria a lógica de atualização real, que no seu caso é `onUpdate`
        onUpdate(formData); // Assumimos que onUpdate lida com o sucesso/erro
        showSuccess('Perfil atualizado com sucesso!'); // Exibir toast de sucesso
        setShowConfirmationDialog(true); // Mostrar o diálogo de confirmação
    };

    return (
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-200 transition-colors" aria-label="Voltar">
                    <ArrowLeftIcon className="h-6 w-6 text-gray-600" />
                </button>
                <h2 className="text-2xl font-bold text-text-main">Meu Perfil</h2>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex items-center space-x-6">
                    {formData.profilePictureUrl ? (
                        <img src={formData.profilePictureUrl} alt="Foto do perfil" className="h-24 w-24 rounded-full object-cover" />
                    ) : (
                        <UserIcon className="h-24 w-24 p-4 bg-gray-200 rounded-full text-gray-500" />
                    )}
                    <div className="flex-1">
                        <label htmlFor="profile-picture-upload" className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                            <UploadIcon className="h-5 w-5 mr-2" />
                            <span>Alterar Foto</span>
                        </label>
                        <input id="profile-picture-upload" name="profile-picture" type="file" className="sr-only" onChange={handleFileChange} accept="image/*" />
                        <p className="text-xs text-gray-500 mt-2">PNG, JPG, GIF até 10MB.</p>
                    </div>
                </div>

                <div>
                    <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">Nome Completo</label>
                    <input type="text" name="fullName" id="fullName" value={formData.fullName} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-gray-700" />
                </div>
                
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                    <input type="email" name="email" id="email" value={formData.email} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-gray-700" />
                </div>

                <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Telefone</label>
                    <input type="tel" name="phone" id="phone" value={formData.phone || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-gray-700" />
                </div>
                
                <div>
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700">Endereço</label>
                    <input type="text" name="address" id="address" value={formData.address || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-gray-700" />
                </div>
                
                <div className="pt-2 flex justify-end">
                    <button type="submit" className="px-6 py-2 font-semibold text-white bg-primary rounded-md hover:bg-primary-dark shadow-sm">
                        Salvar Alterações
                    </button>
                </div>
            </form>

            {showConfirmationDialog && (
                <ConfirmationDialog
                    title="Perfil Atualizado!"
                    message="Seu perfil foi salvo com sucesso. O que você gostaria de fazer agora?"
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

export default Profile;