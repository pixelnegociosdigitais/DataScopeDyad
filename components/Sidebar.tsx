import React from 'react';
import { LogoIcon } from './icons/LogoIcon';
import { HomeIcon } from './icons/HomeIcon';
import { CreateIcon } from './icons/CreateIcon';
import { GiftIcon } from './icons/GiftIcon';
import { SettingsIcon } from './icons/SettingsIcon';
import { MenuIcon } from './icons/MenuIcon';
import { ChevronLeftIcon } from './icons/ChevronLeftIcon';
import { BuildingIcon } from './icons/BuildingIcon';
import { UserIcon } from './icons/UserIcon';
import { BellIcon } from './icons/BellIcon';
import { ChatIcon } from './icons/ChatIcon';
import { TemplateIcon } from './icons/TemplateIcon';
import { View, ModuleName, UserRole } from '../types';

interface SidebarProps {
    currentView: View;
    setView: (view: View) => void;
    modulePermissions: Record<ModuleName, boolean>;
    currentUserRole: UserRole;
    isExpanded: boolean;
    onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, modulePermissions, currentUserRole, isExpanded, onToggle }) => {
    const navItems = [
        {
            label: 'Início',
            icon: HomeIcon,
            view: View.SURVEY_LIST,
            permission: true, // Home/SurveyList is always accessible
        },
        {
            label: 'Criar Pesquisa',
            icon: CreateIcon,
            view: View.CREATE_SURVEY,
            permission: modulePermissions[ModuleName.CREATE_SURVEY],
        },
        {
            label: 'Sorteios',
            icon: GiftIcon,
            view: View.GIVEAWAYS,
            permission: modulePermissions[ModuleName.PERFORM_GIVEAWAYS] || modulePermissions[ModuleName.VIEW_GIVEAWAY_DATA],
        },
        {
            label: 'Chat',
            icon: ChatIcon,
            view: View.CHAT,
            permission: modulePermissions[ModuleName.ACCESS_CHAT],
        },
        // Gerenciamento de Usuários para Administradores
        {
            label: 'Gerenciar Usuários',
            icon: UserIcon,
            view: View.ADMIN_USER_MANAGER,
            permission: currentUserRole === UserRole.ADMIN,
        },
        // Gerenciamento de Empresas para Desenvolvedores
        {
            label: 'Gerenciar Empresas',
            icon: BuildingIcon,
            view: View.DEVELOPER_COMPANY_USER_MANAGER,
            permission: currentUserRole === UserRole.DEVELOPER,
        },
        {
            label: 'Gerenciar Avisos',
            icon: BellIcon,
            view: View.MANAGE_NOTICES,
            permission: modulePermissions[ModuleName.MANAGE_NOTICES],
        },
        {
            label: 'Gerenciar Modelos',
            icon: TemplateIcon,
            view: View.SURVEY_TEMPLATES,
            permission: modulePermissions[ModuleName.MANAGE_SURVEY_TEMPLATES],
        },
        {
            label: 'Configurações',
            icon: SettingsIcon,
            view: View.SETTINGS_PANEL,
            permission: currentUserRole === UserRole.DEVELOPER, // Apenas desenvolvedores podem acessar o painel de configurações
        },
    ];

    return (
        <>
            {/* Mobile Overlay */}
            {isExpanded && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
                    onClick={onToggle}
                    aria-label="Fechar menu"
                />
            )}
            
            <aside className={`fixed inset-y-0 left-0 z-50 bg-gray-800 text-white flex flex-col shadow-lg transition-all duration-300 ease-in-out
                     ${isExpanded 
                         ? 'w-full md:w-64 translate-x-0' 
                         : 'w-0 md:w-20 -translate-x-full md:translate-x-0 overflow-hidden'
                     }`}>
                <div className="p-4">
                    <div className={`flex items-center ${isExpanded ? 'justify-start' : 'justify-center'} gap-3 mb-8`}>
                        <LogoIcon className="h-8 w-8 text-primary flex-shrink-0" />
                        {isExpanded && <h1 className="text-xl font-bold text-white whitespace-nowrap">DataScope</h1>}
                    </div>

                    <nav className="space-y-2">
                        {navItems.map(item => item.permission && (
                            <button
                                key={item.label}
                                onClick={() => {
                                    setView(item.view);
                                    if (isExpanded && window.innerWidth < 768) { // Recolher sidebar em mobile após clique
                                        onToggle();
                                    }
                                }}
                                className={`flex items-center w-full p-3 rounded-lg text-left transition-colors duration-200
                                            ${currentView === item.view || (item.view === View.SURVEY_LIST && (currentView === View.DASHBOARD || currentView === View.RESPOND_SURVEY || currentView === View.EDIT_SURVEY))
                                                ? 'bg-gray-700 text-primary-light relative before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-primary'
                                                : 'hover:bg-gray-700 text-gray-300'}
                                            ${isExpanded ? 'justify-start' : 'justify-center'}`}
                            >
                                <item.icon className="h-6 w-6 flex-shrink-0" />
                                {isExpanded && <span className="text-base whitespace-nowrap ml-4">{item.label}</span>}
                                {!isExpanded && (
                                    <span className="sr-only">{item.label}</span>
                                )}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Mobile Close Button */}
                <div className={`mt-auto p-4 border-t border-gray-700 ${isExpanded ? 'flex justify-end' : 'flex justify-center'} md:hidden`}>
                    <button
                        onClick={onToggle}
                        className="p-2 rounded-full text-gray-300 hover:bg-gray-700 transition-colors"
                        aria-label={isExpanded ? "Recolher menu" : "Expandir menu"}
                    >
                        {isExpanded ? <ChevronLeftIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
                    </button>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;