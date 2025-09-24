import React, { useState } from 'react';
import { View } from '../types';
import { LogoIcon } from './icons/LogoIcon';
import { SurveyIcon } from './icons/SurveyIcon';
import { CreateIcon } from './icons/CreateIcon';
import { ChevronLeftIcon } from './icons/ChevronLeftIcon';

interface SidebarProps {
    currentView: View;
    setView: (view: View) => void;
    canCreate: boolean;
}

const NavItem: React.FC<{
    icon: React.ReactNode;
    label: string;
    isActive: boolean;
    isExpanded: boolean;
    onClick: () => void;
}> = ({ icon, label, isActive, isExpanded, onClick }) => (
    <li
        onClick={onClick}
        className={`flex items-center p-3 my-1 rounded-lg cursor-pointer transition-colors ${
            isActive
                ? 'bg-primary text-white'
                : 'text-gray-300 hover:bg-sidebar-hover hover:text-white'
        } ${!isExpanded ? 'justify-center' : ''}`}
    >
        {icon}
        {isExpanded && <span className="ml-3 font-medium whitespace-nowrap">{label}</span>}
    </li>
);

const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, canCreate }) => {
    const [isExpanded, setIsExpanded] = useState(true);

    return (
        <aside className={`bg-sidebar text-white flex flex-col p-4 transition-all duration-300 ease-in-out relative ${isExpanded ? 'w-64' : 'w-20'}`}>
            <div className="flex items-center justify-between p-3 mb-6">
                <div className="flex items-center gap-3 overflow-hidden">
                    <LogoIcon className="h-8 w-8 text-white flex-shrink-0" />
                    {isExpanded && <span className="text-2xl font-bold whitespace-nowrap">DataScope</span>}
                </div>
            </div>
            
            <button 
                onClick={() => setIsExpanded(!isExpanded)} 
                className="absolute -right-3 top-9 z-10 p-1.5 bg-sidebar-hover rounded-full text-white hover:bg-primary focus:outline-none transition-transform duration-300"
                aria-label={isExpanded ? 'Recolher menu' : 'Expandir menu'}
            >
                <ChevronLeftIcon className={`h-5 w-5 transition-transform duration-300 ${!isExpanded && 'rotate-180'}`} />
            </button>

            <nav className="flex-1">
                <ul>
                    <NavItem
                        icon={<SurveyIcon className="h-6 w-6 flex-shrink-0" />}
                        label="Pesquisas"
                        isActive={currentView === View.SURVEY_LIST || currentView === View.DASHBOARD}
                        onClick={() => setView(View.SURVEY_LIST)}
                        isExpanded={isExpanded}
                    />
                    {canCreate && (
                        <NavItem
                            icon={<CreateIcon className="h-6 w-6 flex-shrink-0" />}
                            label="Criar Pesquisa"
                            isActive={currentView === View.CREATE_SURVEY}
                            onClick={() => setView(View.CREATE_SURVEY)}
                            isExpanded={isExpanded}
                        />
                    )}
                </ul>
            </nav>
        </aside>
    );
};

export default Sidebar;