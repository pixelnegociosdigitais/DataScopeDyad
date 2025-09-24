import { User, Company, Survey, SurveyResponse, UserRole, QuestionType } from '../types';

export const MOCK_COMPANIES: Company[] = [
    { id: 'c1', name: 'Inova S.A.' },
    { id: 'c2', name: 'DadosCorp' },
    { id: 'c3', name: 'Soluções Ltda' },
];

export const MOCK_USERS: User[] = [
    { 
        id: 'u1', 
        fullName: 'Alice Dev', 
        role: UserRole.DEVELOPER, 
        email: 'alice.dev@inova.sa',
        phone: '11 98765-4321',
        address: 'Rua das Inovações, 123, São Paulo, SP',
        profilePictureUrl: 'https://i.pravatar.cc/150?u=alice'
    },
    { 
        id: 'u2', 
        fullName: 'Beto Admin', 
        role: UserRole.ADMIN,
        email: 'beto.admin@dadoscorp.com',
        phone: '21 91234-5678',
        address: 'Avenida dos Dados, 456, Rio de Janeiro, RJ',
        profilePictureUrl: 'https://i.pravatar.cc/150?u=beto'
    },
    { 
        id: 'u3', 
        fullName: 'Carlos Usuário', 
        role: UserRole.USER,
        email: 'carlos.user@solucoes.ltda',
        phone: '31 99999-8888',
        address: 'Praça das Soluções, 789, Belo Horizonte, MG',
        profilePictureUrl: 'https://i.pravatar.cc/150?u=carlos'
    },
];

export const MOCK_SURVEYS: Survey[] = [
    {
        id: 's1',
        title: 'Pesquisa de Satisfação de Colaboradores 2024',
        companyId: 'c1',
        questions: [
            { id: 'q1', text: 'Quão satisfeito você está com seu equilíbrio entre vida pessoal e profissional?', type: QuestionType.RATING },
            { id: 'q2', text: 'Em qual departamento você trabalha?', type: QuestionType.MULTIPLE_CHOICE, options: ['Engenharia', 'Marketing', 'Vendas', 'RH'] },
            { id: 'q3', text: 'Que sugestões você tem para melhorias?', type: QuestionType.TEXT },
        ],
    },
    {
        id: 's2',
        title: 'Feedback do Cliente sobre Novo Produto',
        companyId: 'c1',
        questions: [
            { id: 'q1', text: 'Como você avaliaria o novo produto?', type: QuestionType.RATING },
            { id: 'q2', text: 'Qual funcionalidade você mais gostou?', type: QuestionType.TEXT },
            { id: 'q3', text: 'Você recomendaria este produto a um amigo?', type: QuestionType.MULTIPLE_CHOICE, options: ['Sim, com certeza', 'Talvez', 'Não'] },
        ],
    },
    {
        id: 's3',
        title: 'Eficácia da Campanha de Marketing do 3º Trimestre',
        companyId: 'c2',
        questions: [
            { id: 'q1', text: 'Onde você ouviu falar sobre nossa campanha pela primeira vez?', type: QuestionType.MULTIPLE_CHOICE, options: ['Mídias Sociais', 'E-mail', 'Amigo', 'Anúncio'] },
            { id: 'q2', text: 'Qual foi o impacto da mensagem da campanha?', type: QuestionType.RATING },
        ],
    },
];

export const MOCK_RESPONSES: SurveyResponse[] = [
    // Respostas para s1
    { id: 'r1', surveyId: 's1', answers: [{ questionId: 'q1', value: 4 }, { questionId: 'q2', value: 'Engenharia' }, { questionId: 'q3', value: 'Horários mais flexíveis seriam ótimos.' }] },
    { id: 'r2', surveyId: 's1', answers: [{ questionId: 'q1', value: 5 }, { questionId: 'q2', value: 'Marketing' }, { questionId: 'q3', value: 'A máquina de café precisa de um upgrade!' }] },
    { id: 'r3', surveyId: 's1', answers: [{ questionId: 'q1', value: 3 }, { questionId: 'q2', value: 'Engenharia' }, { questionId: 'q3', value: '' }] },
    { id: 'r4', surveyId: 's1', answers: [{ questionId: 'q1', value: 5 }, { questionId: 'q2', value: 'Vendas' }, { questionId: 'q3', value: 'Ótimos eventos de equipe!' }] },
    { id: 'r5', surveyId: 's1', answers: [{ questionId: 'q1', value: 4 }, { questionId: 'q2', value: 'Engenharia' }, { questionId: 'q3', value: 'Planos de carreira mais claros.' }] },
    
    // Respostas para s2
    { id: 'r6', surveyId: 's2', answers: [{ questionId: 'q1', value: 5 }, { questionId: 'q2', value: 'A interface do usuário é muito limpa.' }, { questionId: 'q3', value: 'Sim, com certeza' }] },
    { id: 'r7', surveyId: 's2', answers: [{ questionId: 'q1', value: 3 }, { questionId: 'q2', value: 'Ficou um pouco lento no meu dispositivo.' }, { questionId: 'q3', value: 'Talvez' }] },
    { id: 'r8', surveyId: 's2', answers: [{ questionId: 'q1', value: 4 }, { questionId: 'q2', value: 'O processo de configuração rápido.' }, { questionId: 'q3', value: 'Sim, com certeza' }] },

    // Respostas para s3
    { id: 'r9', surveyId: 's3', answers: [{ questionId: 'q1', value: 'Mídias Sociais' }, { questionId: 'q2', value: 5 }] },
    { id: 'r10', surveyId: 's3', answers: [{ questionId: 'q1', value: 'E-mail' }, { questionId: 'q2', value: 3 }] },
    { id: 'r11', surveyId: 's3', answers: [{ questionId: 'q1', value: 'Anúncio' }, { questionId: 'q2', value: 4 }] },
    { id: 'r12', surveyId: 's3', answers: [{ questionId: 'q1', value: 'Mídias Sociais' }, { questionId: 'q2', value: 4 }] },
];