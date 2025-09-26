import React from 'react';
import { LogoIcon } from './icons/LogoIcon';
import { HomeIcon } from './icons/HomeIcon';
import { SurveyIcon } from './icons/SurveyIcon';
import { CreateIcon } from './icons/CreateIcon';
import { GiftIcon } from './icons/GiftIcon';
import { SettingsIcon } from './icons/SettingsIcon';
import { View, ModuleName, UserRole, User } from '../types';

interface SidebarProps {
    currentView: View;
    setView: (view: View) => void;
    modulePermissions: Record<ModuleName, boolean>;
    currentUserRole: UserRole;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, modulePermissions, currentUserRole }) => {
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
            permission: modulePermissions[ModuleName.ACCESS_GIVEAWAYS],
        },
        {
            label: 'Configurações',
            icon: SettingsIcon,
            view: View.SETTINGS_PANEL,
            permission: currentUserRole === UserRole.DEVELOPER, // Only developers can access settings panel
        },
    ];

    return (
        <aside className="fixed inset-y-0 left-0 w-64 bg-gray-800 text-white p-4 flex flex-col shadow-lg z-30">
            <div className="flex items-center gap-3 mb-8 px-2">
                <LogoIcon className="h-10 w-10 text-primary" />
                <h1 className="text-2xl font-bold text-white">DataScope</h1>
            </div>

            <nav className="flex-1 space-y-2">
                {navItems.map(item => item.permission && (
                    <button
                        key={item.label}
                        onClick={() => setView(item.view)}
                        className={`flex items-center w-full p-3 rounded-lg text-left transition-colors duration-200
                                    ${currentView === item.view || (item.view === View.SURVEY_LIST && (currentView === View.DASHBOARD || currentView === View.RESPOND_SURVEY || currentView === View.EDIT_SURVEY))
                                        ? 'bg-gray-700 text-primary-light relative before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-primary'
                                        : 'hover:bg-gray-700 text-gray-300'}`}
                    >
                        <item.icon className="h-6 w-6 mr-4" />
                        <span className="text-lg">{item.label}</span>
                    </button>
                ))}
            </nav>
        </aside>
    );
};

export default Sidebar;