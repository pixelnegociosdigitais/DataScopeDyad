import React from 'react';
import { User, Company, View, ModuleName, Notice } from '../types';
import { LogoutIcon } from './icons/LogoutIcon';
import { BuildingIcon } from './icons/BuildingIcon';
import { UserIcon } from './icons/UserIcon';
import { MenuIcon } from './icons/MenuIcon'; // Importar MenuIcon
import NotificationBell from '../src/components/NotificationBell';

interface HeaderProps {
    user: User;
    company: Company | null;
    onLogout: () => void;
    setView: (view: View) => void;
    modulePermissions: Record<ModuleName, boolean>;
    onNoticeClick: (notice: Notice) => void;
    onToggleSidebar: () => void; // Nova prop para alternar a barra lateral
    isSidebarExpanded: boolean; // Nova prop para o estado da barra lateral
}

const Header: React.FC<HeaderProps> = ({ user, company, onLogout, setView, modulePermissions, onNoticeClick, onToggleSidebar, isSidebarExpanded }) => {
    const canManageCompany = modulePermissions[ModuleName.MANAGE_COMPANY_SETTINGS] && company !== null;

    const handleCompanyClick = () => {
        setView(View.COMPANY_SETTINGS);
    };

    return (
        <header className="bg-white shadow-sm p-4 flex justify-between items-center w-full">
            <div className="flex items-center">
                {/* Botão de alternância da barra lateral, visível apenas em telas pequenas */}
                <button
                    onClick={onToggleSidebar}
                    className="p-2 rounded-full hover:bg-gray-100 transition-colors md:hidden"
                    aria-label={isSidebarExpanded ? "Recolher menu" : "Expandir menu"}
                >
                    <MenuIcon className="h-6 w-6 text-gray-600" />
                </button>
                {/* Título ou logo para telas pequenas, se necessário */}
                <h1 className="text-xl font-bold text-gray-800 ml-4 md:hidden">DataScope</h1>
            </div>

            <div className="flex items-center gap-4 md:gap-6 flex-wrap justify-end"> {/* Ajustar gap e adicionar flex-wrap para mobile */}
                <NotificationBell onNoticeClick={onNoticeClick} />
                {company === null ? (
                    <button
                        onClick={handleCompanyClick}
                        className="flex items-center gap-2 text-sm text-text-light hover:bg-gray-100 p-2 rounded-lg transition-colors"
                        aria-label="Configurar empresa"
                    >
                        <BuildingIcon className="h-5 w-5" />
                        <span className="hidden md:inline">Nenhuma Empresa</span> {/* Ocultar texto em mobile */}
                    </button>
                ) : canManageCompany ? (
                    <button
                        onClick={handleCompanyClick}
                        className="flex items-center gap-2 text-sm text-text-light hover:bg-gray-100 p-2 rounded-lg transition-colors"
                        aria-label="Configurações da empresa"
                    >
                        <BuildingIcon className="h-5 w-5" />
                        <span className="hidden md:inline">{company.name}</span> {/* Ocultar texto em mobile */}
                    </button>
                ) : (
                    <div className="flex items-center gap-2 text-sm text-text-light">
                        <BuildingIcon className="h-5 w-5" />
                        <span className="hidden md:inline">{company.name}</span> {/* Ocultar texto em mobile */}
                    </div>
                )}
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
                   
                    <div className="text-left hidden md:block"> {/* Ocultar em mobile */}
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
                    <span className="hidden md:inline">Sair</span> {/* Ocultar texto em mobile */}
                </button>
            </div>
        </header>
    );
};

export default Header;