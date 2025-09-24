import React from 'react';
import { User, Company, View } from '../types';
import { LogoutIcon } from './icons/LogoutIcon';
import { BuildingIcon } from './icons/BuildingIcon';
import { UserIcon } from './icons/UserIcon';

interface HeaderProps {
    user: User;
    company: Company;
    onLogout: () => void;
    setView: (view: View) => void; // Mantido para o botão de perfil
    currentView: View; // Mantido para o botão de perfil
    canCreate: boolean; // Não usado diretamente no Header, mas mantido para compatibilidade se necessário
}

const Header: React.FC<HeaderProps> = ({ user, company, onLogout, setView, currentView, canCreate }) => {
    return (
        <header className="bg-white shadow-sm p-4 flex justify-end items-center"> {/* Alinhado à direita */}
            <div className="flex items-center gap-6">
                 <div className="flex items-center gap-2 text-sm text-text-light">
                    <BuildingIcon className="h-5 w-5" />
                    <span>{company.name}</span>
                </div>
                <button 
                    onClick={() => setView(View.PROFILE)}
                    className="flex items-center gap-3 text-sm text-text-light hover:bg-gray-100 p-2 rounded-lg transition-colors"
                    aria-label="Abrir perfil do usuário"
                >
                    {user.profilePictureUrl ? (
                         <img src={user.profilePictureUrl} alt="Foto do perfil" className="h-8 w-8 rounded-full object-cover" />
                    ) : (
                        <UserIcon className="h-8 w-8 p-1 bg-gray-200 rounded-full text-gray-500" />
                    )}
                   
                    <div className="text-left">
                        <span className="font-semibold text-text-main block">{user.fullName}</span>
                        <span className="text-xs">{user.role}</span>
                    </div>
                </button>
                <button
                    onClick={onLogout}
                    className="flex items-center gap-2 text-sm text-text-light hover:text-primary transition-colors"
                    aria-label="Sair da aplicação"
                >
                    <LogoutIcon className="h-5 w-5" />
                    <span>Sair</span>
                </button>
            </div>
        </header>
    );
};

export default Header;