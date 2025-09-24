import React, { useState, ChangeEvent, FormEvent } from 'react';
import { User } from '../types';
import { UserIcon } from './icons/UserIcon';
import { UploadIcon } from './icons/UploadIcon';

interface ProfileProps {
    user: User;
    onUpdate: (user: User) => void;
}

const Profile: React.FC<ProfileProps> = ({ user, onUpdate }) => {
    const [formData, setFormData] = useState<User>(user);

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    // A mock handler for file change, as we don't have a backend to upload to.
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
        onUpdate(formData);
    };

    return (
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-6 text-text-main">Meu Perfil</h2>
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
        </div>
    );
};

export default Profile;