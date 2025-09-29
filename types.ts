export enum UserRole {
    DEVELOPER = 'Desenvolvedor',
    ADMIN = 'Administrador',
    USER = 'Usuário',
}

export interface User {
    id: string;
    fullName: string;
    role: UserRole;
    email: string;
    phone?: string;
    address?: string;
    profilePictureUrl?: string;
}

export interface Company {
    id: string;
    name: string;
    cnpj?: string;
    phone?: string;
    address_street?: string;
    address_neighborhood?: string;
    address_complement?: string;
    address_city?: string;
    address_state?: string;
}

export enum QuestionType {
    SHORT_TEXT = 'Texto Curto',
    LONG_TEXT = 'Texto Longo',
    PHONE = 'Telefone',
    EMAIL = 'Email',
    MULTIPLE_CHOICE = 'Múltipla Escolha',
    CHECKBOX = 'Caixas de Seleção',
    RATING = 'Avaliação (1-10)',
}

export interface Question {
    id: string;
    text: string;
    type: QuestionType;
    options?: string[];
    position?: number; // Adicionado para corrigir o erro de tipagem
}

export interface Survey {
    id: string;
    title: string;
    companyId: string;
    questions: Question[];
    responseCount?: number; // Adicionado para armazenar a contagem de respostas
}

export interface Answer {
    questionId: string;
    value: string | number | string[]; // Permitir array de strings para caixas de seleção
}

export interface SurveyResponse {
    id:string;
    surveyId: string;
    answers: Answer[];
}

export interface Prize {
    id: string;
    company_id: string;
    name: string;
    description?: string;
    rank?: number; // Adicionado para definir a ordem do prêmio
    created_at?: string;
}

export interface GiveawayWinner {
    id: string;
    survey_id: string;
    prize_id: string;
    winner_response_id: string;
    winner_name: string;
    winner_email?: string;
    winner_phone?: string;
    rank: number;
    created_at?: string;
    prize?: Prize; // Para incluir detalhes do prêmio ao buscar
}

export enum View {
    SURVEY_LIST = 'SURVEY_LIST',
    CREATE_SURVEY = 'CREATE_SURVEY',
    EDIT_SURVEY = 'EDIT_SURVEY',
    DASHBOARD = 'DASHBOARD',
    PROFILE = 'PROFILE',
    RESPOND_SURVEY = 'RESPOND_SURVEY',
    COMPANY_SETTINGS = 'COMPANY_SETTINGS',
    GIVEAWAYS = 'GIVEAWAYS', // Nova view para sorteios
    SETTINGS_PANEL = 'SETTINGS_PANEL', // Nova view para o painel de configurações
    MODULE_PERMISSIONS_MANAGER = 'MODULE_PERMISSIONS_MANAGER', // Nova view para gerenciamento de permissões
}

export enum ModuleName {
    CREATE_SURVEY = 'create_survey',
    MANAGE_SURVEYS = 'manage_surveys', // Edit/Delete surveys
    VIEW_DASHBOARD = 'view_dashboard',
    ACCESS_GIVEAWAYS = 'access_giveaways',
    MANAGE_COMPANY_SETTINGS = 'manage_company_settings',
}

export interface ModulePermission {
    id?: string; // Optional for new entries
    role: UserRole;
    module_name: ModuleName;
    enabled: boolean;
}