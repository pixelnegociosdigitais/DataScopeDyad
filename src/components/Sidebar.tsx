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
                : 'text-sidebar-text-dark hover:bg-sidebar-hover-light hover:text-sidebar-text-dark'
        } ${!isExpanded ? 'justify-center' : ''}`}
        title={!isExpanded ? label : undefined}
    >
        {icon}
        {isExpanded && <span className="ml-3 font-medium whitespace-nowrap">{label}</span>}
    </li>
);

const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, canCreate }) => {
    const [isExpanded, setIsExpanded] = useState(true);

    return (
        <aside className={`relative h-full bg-sidebar-bg-light text-sidebar-text-dark flex flex-col p-4 transition-all duration-300 ease-in-out ${isExpanded ? 'w-64' : 'w-20'}`}>
            {/* Seção superior: Logo e Navegação */}
            <div className="flex-1"> {/* flex-1 faz esta div crescer e empurrar o conteúdo para baixo */}
                <div className="flex items-center gap-3 p-3 mb-6">
                    <LogoIcon className="h-8 w-8 text-sidebar-text-dark flex-shrink-0" />
                    {isExpanded && <span className="text-2xl font-bold whitespace-nowrap">DataScope</span>}
                </div>

                <nav>
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
            </div>

            {/* Seção inferior: Botão de recolher - Posicionamento absoluto */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-sidebar-bg-light border-t border-gray-300">
                <button 
                    onClick={() => setIsExpanded(!isExpanded)} 
                    className={`flex items-center w-full p-3 rounded-lg cursor-pointer transition-colors 
                                ${isExpanded 
                                    ? 'text-sidebar-text-dark hover:bg-sidebar-hover-light hover:text-sidebar-text-dark' 
                                    : 'bg-white text-primary justify-center shadow-md'}`}
                    aria-label={isExpanded ? 'Recolher menu' : 'Expandir menu'}
                >
                    <ChevronLeftIcon className={`h-6 w-6 flex-shrink-0 transition-transform duration-300 ${!isExpanded ? 'rotate-180' : ''}`} />
                    {isExpanded && <span className="ml-3 font-medium whitespace-nowrap">Recolher</span>}
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;