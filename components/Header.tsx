import React from 'react';
import { User, Company, View, ModuleName } from '../types';
import { LogoutIcon } from './icons/LogoutIcon';
import { BuildingIcon } from './icons/BuildingIcon';
import { UserIcon } from './icons/UserIcon';
import { MenuIcon } from './icons/MenuIcon';
import { BellIcon } from './icons/BellIcon';

interface HeaderProps {
    user: User;
    company: Company | null;
    onLogout: () => void;
    setView: (view: View) => void;
    modulePermissions: Record<ModuleName, boolean>;
    onToggleSidebar: () => void;
    isSidebarExpanded: boolean;
    unreadNoticesCount: number;
}

const Header: React.FC<HeaderProps> = ({ user, company, onLogout, setView, modulePermissions, onToggleSidebar, isSidebarExpanded, unreadNoticesCount }) => {
    const canManageCompany = modulePermissions[ModuleName.MANAGE_COMPANY_SETTINGS] && company !== null;

    const handleCompanyClick = () => {
        setView(View.COMPANY_SETTINGS);
    };

    return (
        <header className="bg-white shadow-sm border-b border-gray-200 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <button
                    onClick={onToggleSidebar}
                    className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors md:hidden"
                    aria-label="Abrir menu"
                >
                    <MenuIcon className="h-6 w-6" />
                </button>
                
                {/* Desktop: Show notices button with text, Mobile: Show only icon */}
                <button
                    onClick={() => setView(View.NOTICES)}
                    className="flex items-center gap-2 text-sm text-text-light hover:bg-gray-100 p-2 rounded-lg transition-colors relative"
                    aria-label="Ver avisos"
                >
                    <BellIcon className="h-5 w-5" />
                    <span className="hidden sm:inline">Avisos</span>
                    {unreadNoticesCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                            {unreadNoticesCount > 9 ? '9+' : unreadNoticesCount}
                        </span>
                    )}
                </button>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
                {!company ? (
                    <button
                        onClick={handleCompanyClick}
                        className="flex items-center gap-2 text-sm text-text-light hover:bg-gray-100 p-2 rounded-lg transition-colors"
                        aria-label="Configurar empresa"
                    >
                        <BuildingIcon className="h-5 w-5" />
                        <span className="hidden lg:inline">Nenhuma Empresa</span>
                    </button>
                ) : canManageCompany ? (
                    <button
                        onClick={handleCompanyClick}
                        className="flex items-center gap-2 text-sm text-text-light hover:bg-gray-100 p-2 rounded-lg transition-colors"
                        aria-label="Configurações da empresa"
                    >
                        <BuildingIcon className="h-5 w-5" />
                        <span className="hidden lg:inline">{company.name}</span>
                    </button>
                ) : (
                    <div className="flex items-center gap-2 text-sm text-text-light">
                        <BuildingIcon className="h-5 w-5" />
                        <span className="hidden lg:inline">{company.name}</span>
                    </div>
                )}
                
                <button
                    onClick={() => setView(View.PROFILE)}
                    className="flex items-center gap-2 sm:gap-3 text-sm text-text-light hover:bg-gray-100 p-2 rounded-lg transition-colors"
                    aria-label="Abrir perfil do usuário"
                >
                    {user.profilePictureUrl ? (
                         <img src={user.profilePictureUrl} alt="Foto do perfil" className="h-8 w-8 rounded-full object-cover flex-shrink-0" />
                    ) : (
                        <UserIcon className="h-8 w-8 p-1 bg-gray-200 rounded-full text-gray-500 flex-shrink-0" />
                    )}
                   
                    <div className="text-left hidden sm:block">
                        <span className="font-semibold text-text-main block text-sm sm:text-base">{user.fullName}</span>
                        <span className="text-xs text-gray-500">{user.role}</span>
                    </div>
                </button>
                
                <button
                    onClick={onLogout}
                    className="flex items-center gap-2 text-sm text-text-light hover:text-primary transition-colors p-2 rounded-lg hover:bg-gray-100"
                    aria-label="Sair da aplicação"
                >
                    <LogoutIcon className="h-5 w-5" />
                    <span className="hidden sm:inline">Sair</span>
                </button>
            </div>
        </header>
    );
};

export default Header;