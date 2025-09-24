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
                ? 'bg-primary text-white' // Item ativo mantém o azul primário
                : 'text-blue-700 hover:bg-blue-200 hover:text-blue-900' // Itens inativos em azul escuro no fundo claro
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
        <aside className={`bg-blue-100 text-blue-800 flex flex-col h-full justify-between p-4 transition-all duration-300 ease-in-out ${isExpanded ? 'w-64' : 'w-20'}`}>
            {/* Seção superior: Logo e Navegação */}
            <div>
                <div className="flex items-center gap-3 p-3 mb-6">
                    <LogoIcon className="h-8 w-8 text-primary flex-shrink-0" /> {/* Logo em azul primário */}
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

            {/* Seção inferior: Botão de recolher */}
            <div className="border-t border-blue-200 pt-4"> {/* Borda mais clara para o fundo azul */}
                <button 
                    onClick={() => setIsExpanded(!isExpanded)} 
                    className={`flex items-center w-full p-3 rounded-lg cursor-pointer transition-colors 
                                bg-primary text-white hover:bg-primary-dark 
                                ${!isExpanded ? 'justify-center' : ''}`}
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