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
}

export enum QuestionType {
    TEXT = 'Texto',
    MULTIPLE_CHOICE = 'Múltipla Escolha',
    RATING = 'Avaliação (1-5)',
}

export interface Question {
    id: string;
    text: string;
    type: QuestionType;
    options?: string[];
}

export interface Survey {
    id: string;
    title: string;
    companyId: string;
    questions: Question[];
}

export interface Answer {
    questionId: string;
    value: string | number;
}

export interface SurveyResponse {
    id:string;
    surveyId: string;
    answers: Answer[];
}

export enum View {
    SURVEY_LIST = 'SURVEY_LIST',
    CREATE_SURVEY = 'CREATE_SURVEY',
    DASHBOARD = 'DASHBOARD',
    PROFILE = 'PROFILE',
}