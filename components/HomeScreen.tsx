import React from 'react';
import { View, ModuleName, UserRole } from '../types';
import { CreateIcon } from './icons/CreateIcon';
import { GiftIcon } from './icons/GiftIcon';
import { SettingsIcon } from './icons/SettingsIcon';
import { BuildingIcon } from './icons/BuildingIcon';
import { UserIcon } from './icons/UserIcon';
import { BellIcon } from './icons/BellIcon';
import { ChatIcon } from './icons/ChatIcon';
import { TemplateIcon } from './icons/TemplateIcon';
import { DashboardIcon } from './icons/DashboardIcon';
import { SurveyIcon } from './icons/SurveyIcon';

interface HomeScreenProps {
    setView: (view: View) => void;
    modulePermissions: Record<ModuleName, boolean>;
    currentUserRole: UserRole;
    onCreateSurvey: () => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ 
    setView, 
    modulePermissions, 
    currentUserRole,
    onCreateSurvey 
}) => {
    const shortcuts = [
        {
            id: 'surveys',
            title: 'Pesquisas',
            icon: SurveyIcon,
            color: 'bg-blue-700 hover:bg-blue-800',
            action: () => setView(View.SURVEY_LIST),
            permission: true,
        },
        {
            id: 'create-survey',
            title: 'Criar Pesquisa',
            icon: CreateIcon,
            color: 'bg-green-700 hover:bg-green-800',
            action: onCreateSurvey,
            permission: modulePermissions[ModuleName.CREATE_SURVEY],
        },
        {
            id: 'dashboard',
            title: 'Dashboard',
            icon: DashboardIcon,
            color: 'bg-purple-700 hover:bg-purple-800',
            action: () => setView(View.SURVEY_LIST),
            permission: modulePermissions[ModuleName.VIEW_DASHBOARD],
        },
        {
            id: 'giveaways',
            title: 'Sorteios',
            icon: GiftIcon,
            color: 'bg-yellow-500 hover:bg-yellow-600',
            action: () => setView(View.GIVEAWAYS),
            permission: modulePermissions[ModuleName.PERFORM_GIVEAWAYS] || modulePermissions[ModuleName.VIEW_GIVEAWAY_DATA],
        },
        {
            id: 'chat',
            title: 'Chat com IA',
            icon: ChatIcon,
            color: 'bg-indigo-500 hover:bg-indigo-600',
            action: () => setView(View.CHAT),
            permission: modulePermissions[ModuleName.ACCESS_CHAT],
        },
        {
            id: 'templates',
            title: 'Modelos',
            icon: TemplateIcon,
            color: 'bg-pink-500 hover:bg-pink-600',
            action: () => setView(View.SURVEY_TEMPLATES),
            permission: modulePermissions[ModuleName.MANAGE_SURVEY_TEMPLATES],
        },
        {
            id: 'notices',
            title: 'Avisos',
            icon: BellIcon,
            color: 'bg-orange-500 hover:bg-orange-600',
            action: () => setView(View.MANAGE_NOTICES),
            permission: modulePermissions[ModuleName.MANAGE_NOTICES],
        },
        {
            id: 'users',
            title: 'Usuários',
            icon: UserIcon,
            color: 'bg-teal-500 hover:bg-teal-600',
            action: () => setView(View.ADMIN_USER_MANAGER),
            permission: currentUserRole === UserRole.ADMIN,
        },
        {
            id: 'companies',
            title: 'Empresas',
            icon: BuildingIcon,
            color: 'bg-red-500 hover:bg-red-600',
            action: () => setView(View.DEVELOPER_COMPANY_USER_MANAGER),
            permission: currentUserRole === UserRole.DEVELOPER,
        },
        {
            id: 'settings',
            title: 'Configurações',
            icon: SettingsIcon,
            color: 'bg-gray-500 hover:bg-gray-600',
            action: () => setView(View.SETTINGS_PANEL),
            permission: currentUserRole === UserRole.DEVELOPER,
        },
    ];

    const availableShortcuts = shortcuts.filter(shortcut => shortcut.permission);

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-gray-800 mb-2">
                        Bem-vindo ao DataScope
                    </h1>
                    <p className="text-lg text-gray-600">
                        Acesse rapidamente todas as funcionalidades da aplicação
                    </p>
                </div>

                {/* Grid de Atalhos */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {availableShortcuts.map((shortcut) => {
                        const IconComponent = shortcut.icon;
                        return (
                            <button
                                key={shortcut.id}
                                onClick={shortcut.action}
                                className={`${shortcut.color} text-white rounded-2xl p-6 shadow-lg transform transition-all duration-200 hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-blue-300 focus:ring-opacity-50 mobile-touch-target high-contrast-text`}
                            >
                                <div className="flex flex-col items-center space-y-3">
                                    <div className="bg-white bg-opacity-20 rounded-full p-4">
                                        <IconComponent className="w-8 h-8 text-white" />
                                    </div>
                                    <span className="text-sm font-semibold text-center leading-tight">
                                        {shortcut.title}
                                    </span>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Informações adicionais */}
                <div className="mt-12 text-center">
                    <div className="bg-white rounded-lg shadow-md p-6 max-w-2xl mx-auto">
                        <h2 className="text-xl font-semibold text-gray-800 mb-3">
                            Acesso Rápido
                        </h2>
                        <p className="text-gray-600">
                            Use os atalhos acima para navegar rapidamente entre as diferentes 
                            funcionalidades do sistema. Cada atalho está disponível de acordo 
                            com suas permissões de usuário.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HomeScreen;