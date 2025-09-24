import React from 'react';
import { User, Company, View } from '../types';
import { LogoutIcon } from './icons/LogoutIcon';
import { BuildingIcon } from './icons/BuildingIcon';
import { UserIcon } from './icons/UserIcon';
import { SurveyIcon } from './icons/SurveyIcon'; // Novo import
import { CreateIcon } from './icons/CreateIcon'; // Novo import
import { LogoIcon } from './icons/LogoIcon'; // Novo import para o logo

interface HeaderProps {
    user: User;
    company: Company;
    onLogout: () => void;
    setView: (view: View) => void;
    currentView: View; // Adicionado
    canCreate: boolean; // Adicionado
}

const Header: React.FC<HeaderProps> = ({ user, company, onLogout, setView, currentView, canCreate }) => {
    return (
        <header className="bg-white shadow-sm p-4 flex justify-between items-center">
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                    <LogoIcon className="h-8 w-8 text-primary" />
                    <h1 className="text-xl font-bold text-text-main">DataScope</h1>
                </div>
                
                {/* Botões de Navegação */}
                <nav className="ml-8 flex gap-4">
                    <button
                        onClick={() => setView(View.SURVEY_LIST)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors 
                                    ${currentView === View.SURVEY_LIST || currentView === View.DASHBOARD 
                                        ? 'bg-primary text-white' 
                                        : 'text-text-light hover:bg-gray-100'}`}
                        aria-label="Ver Pesquisas"
                    >
                        <SurveyIcon className="h-5 w-5" />
                        <span>Pesquisas</span>
                    </button>
                    {canCreate && (
                        <button
                            onClick={() => setView(View.CREATE_SURVEY)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors 
                                        ${currentView === View.CREATE_SURVEY 
                                            ? 'bg-primary text-white' 
                                            : 'text-text-light hover:bg-gray-100'}`}
                            aria-label="Criar Nova Pesquisa"
                        >
                            <CreateIcon className="h-5 w-5" />
                            <span>Criar Pesquisa</span>
                        </button>
                    )}
                </nav>
            </div>

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