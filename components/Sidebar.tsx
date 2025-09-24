
import React from 'react';
import { View } from '../types';
import { LogoIcon } from './icons/LogoIcon';
import { SurveyIcon } from './icons/SurveyIcon';
import { CreateIcon } from './icons/CreateIcon';
import { DashboardIcon } from './icons/DashboardIcon';

interface SidebarProps {
    currentView: View;
    setView: (view: View) => void;
    canCreate: boolean;
}

const NavItem: React.FC<{
    icon: React.ReactNode;
    label: string;
    isActive: boolean;
    onClick: () => void;
}> = ({ icon, label, isActive, onClick }) => (
    <li
        onClick={onClick}
        className={`flex items-center p-3 my-1 rounded-lg cursor-pointer transition-colors ${
            isActive
                ? 'bg-primary text-white'
                : 'text-gray-300 hover:bg-sidebar-hover hover:text-white'
        }`}
    >
        {icon}
        <span className="ml-3 font-medium">{label}</span>
    </li>
);

const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, canCreate }) => {
    return (
        <aside className="w-64 bg-sidebar text-white flex flex-col p-4">
            <div className="flex items-center gap-3 p-3 mb-6">
                <LogoIcon className="h-8 w-8 text-white" />
                <span className="text-2xl font-bold">DataScope</span>
            </div>
            <nav>
                <ul>
                    <NavItem
                        icon={<SurveyIcon className="h-6 w-6" />}
                        label="Pesquisas"
                        isActive={currentView === View.SURVEY_LIST || currentView === View.DASHBOARD}
                        onClick={() => setView(View.SURVEY_LIST)}
                    />
                    {canCreate && (
                        <NavItem
                            icon={<CreateIcon className="h-6 w-6" />}
                            label="Criar Pesquisa"
                            isActive={currentView === View.CREATE_SURVEY}
                            onClick={() => setView(View.CREATE_SURVEY)}
                        />
                    )}
                </ul>
            </nav>
        </aside>
    );
};

export default Sidebar;
