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
    permissions?: Record<string, boolean>; // Adicionado para permissões granulares
    status?: 'active' | 'inactive'; // Adicionado para o status do usuário
    company_id?: string; // Adicionado para vincular o usuário a uma empresa
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
    status?: 'active' | 'inactive'; // Adicionado para o status da empresa
    administrators: User[]; // Alterado para ser sempre um array, não opcional
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
    questions?: Question[] | null; // Tornada opcional e anulável
    responseCount?: number; // Adicionado para armazenar a contagem de respostas
    created_at?: string; // Adicionado para a data de criação
    created_by?: string; // Adicionado para o ID do criador
    companyName?: string; // Adicionado para o nome da empresa
    createdByName?: string; // Adicionado para o nome do criador
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

export interface Notice {
    id: string;
    created_at: string;
    sender_id: string;
    sender_email: string;
    message: string;
    target_roles: UserRole[]; // Array de roles para quem o aviso é destinado
    company_id?: string; // Opcional, para avisos específicos da empresa
}

export interface UserNotice {
    user_id: string;
    notice_id: string;
    read_at: string;
}

export interface Chat {
    id: string;
    created_at: string;
    company_id: string | null; // Pode ser null
    name?: string | null; // Pode ser null
    is_group_chat: boolean | null; // Pode ser null
    last_message_at?: string | null; // Pode ser null
    participants?: ChatParticipant[]; // Joined data
    displayName?: string | null; // AGORA PODE SER NULL
    unread_count?: number; // Adicionado para exibir a contagem de mensagens não lidas
}

export interface ChatParticipant {
    chat_id: string;
    user_id: string;
    joined_at: string;
    unread_count: number;
    profiles?: User; // Joined data
}

export interface ChatMessage {
    id: string;
    chat_id: string;
    sender_id: string;
    content: string;
    created_at: string;
    sender?: User; // Joined data for sender details
}

export enum View {
    SURVEY_LIST = 'SURVEY_LIST',
    CREATE_SURVEY = 'CREATE_SURVEY',
    EDIT_SURVEY = 'EDIT_SURVEY',
    DASHBOARD = 'DASHBOARD',
    PROFILE = 'PROFILE',
    RESPOND_SURVEY = 'RESPOND_SURVEY',
    COMPANY_SETTINGS = 'COMPANY_SETTINGS',
    GIVEAWAYS = 'GIVEAWAYS',
    SETTINGS_PANEL = 'SETTINGS_PANEL',
    MODULE_PERMISSIONS_MANAGER = 'MODULE_PERMISSIONS_MANAGER',
    DEVELOPER_COMPANY_USER_MANAGER = 'DEVELOPER_COMPANY_USER_MANAGER',
    ADMIN_USER_MANAGER = 'ADMIN_USER_MANAGER',
    LOGS_AND_AUDIT = 'LOGS_AND_AUDIT',
    MANAGE_NOTICES = 'MANAGE_NOTICES',
    NOTICES = 'NOTICES', // Added for viewing notices
    CHAT = 'CHAT',
    SURVEY_QUESTIONS = 'SURVEY_QUESTIONS', // Nova view para gerenciar perguntas
    SURVEY_TEMPLATES = 'SURVEY_TEMPLATES', // Nova view para gerenciar modelos
}

export enum ModuleName {
    CREATE_SURVEY = 'create_survey',
    MANAGE_SURVEYS = 'manage_surveys', // Edit/Delete surveys
    VIEW_DASHBOARD = 'view_dashboard',
    ACCESS_GIVEAWAYS = 'access_giveaways', // Será substituído por PERFORM_GIVEAWAYS e VIEW_GIVEAWAY_DATA
    PERFORM_GIVEAWAYS = 'perform_giveaways', // Nova permissão: Realizar sorteios e gerenciar prêmios
    VIEW_GIVEAWAY_DATA = 'view_giveaway_data', // Nova permissão: Visualizar histórico de sorteios
    MANAGE_COMPANY_SETTINGS = 'manage_company_settings',
    MANAGE_USERS = 'manage_users', // Para administradores gerenciarem usuários
    MANAGE_COMPANIES = 'manage_companies', // Para desenvolvedores gerenciarem empresas
    MANAGE_NOTICES = 'manage_notices', // Nova permissão: Gerenciar avisos
    ACCESS_CHAT = 'access_chat', // Nova permissão: Acessar o chat
    MANAGE_SURVEY_TEMPLATES = 'manage_survey_templates', // Nova permissão: Gerenciar modelos de pesquisa
}

export interface ModulePermission {
    id?: string; // Optional for new entries
    role: UserRole;
    module_name: ModuleName;
    enabled: boolean;
}

export interface LogEntry {
    id: string;
    timestamp: string;
    level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
    message: string;
    userId?: string;
    userEmail?: string;
    companyId?: string;
    module?: string;
}

// New interface for raw data from Supabase query
export interface RawSurveyData {
    id: string;
    title: string;
    company_id: string;
    created_by: string;
    created_at: string;
    questions?: Question[] | null; // Tornada opcional e anulável
    survey_responses?: any[] | null; // Tornada opcional e anulável
    companies: { name: string }[] | null; // Expecting an array of objects or null
    profiles: { full_name: string }[] | null; // Expecting an array of objects or null
}

// New interface for the chart data items
export interface ChartDataItem {
    name: string;
    value: number;
    [key: string]: any; // Adicionado para permitir propriedades adicionais
}

// New interface to combine Question with its analysis data
export interface QuestionAnalysis extends Question {
    data: string[] | ChartDataItem[];
}

export interface SurveyTemplateManagerProps {
    onBack: () => void;
    templates: Survey[];
    currentUser: User; // Added currentUser prop
    modulePermissions: Record<ModuleName, boolean>;
    onSaveTemplate: (templateData: Survey, editingTemplateId?: string) => Promise<void>;
    onDeleteTemplate: (templateId: string) => Promise<boolean>;
}