import { supabase } from '@/src/integrations/supabase/client';
import { showError } from './toast';

/**
 * Utilitário para tratar erros de autenticação e limpeza de tokens inválidos
 */
export class AuthErrorHandler {
    /**
     * Limpa todos os dados de autenticação armazenados localmente
     */
    static clearAuthData(): void {
        try {
            // Limpar dados do Supabase no localStorage
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith('supabase.auth.')) {
                    localStorage.removeItem(key);
                }
            });
            
            // Limpar dados específicos que podem estar armazenados
            localStorage.removeItem('supabase.auth.token');
            localStorage.removeItem('sb-auth-token');
            
            console.log('AuthErrorHandler: Dados de autenticação limpos do localStorage');
        } catch (error) {
            console.error('AuthErrorHandler: Erro ao limpar dados de autenticação:', error);
        }
    }

    /**
     * Verifica se o erro é relacionado ao refresh token
     */
    static isRefreshTokenError(error: any): boolean {
        if (!error) return false;
        
        const errorMessage = error.message?.toLowerCase() || '';
        const errorCode = error.code?.toLowerCase() || '';
        
        return (
            errorMessage.includes('refresh') ||
            errorMessage.includes('invalid refresh token') ||
            errorMessage.includes('refresh token not found') ||
            errorMessage.includes('token expired') ||
            errorCode.includes('refresh') ||
            errorCode === 'invalid_token'
        );
    }

    /**
     * Trata erros de refresh token automaticamente
     */
    static async handleRefreshTokenError(error: any): Promise<void> {
        if (this.isRefreshTokenError(error)) {
            console.log('AuthErrorHandler: Erro de refresh token detectado. Iniciando limpeza...');
            
            try {
                // Fazer logout silencioso
                await supabase.auth.signOut();
                
                // Limpar dados locais
                this.clearAuthData();
                
                console.log('AuthErrorHandler: Limpeza de refresh token concluída');
            } catch (signOutError) {
                console.error('AuthErrorHandler: Erro durante o logout silencioso:', signOutError);
                // Mesmo com erro no signOut, limpar dados locais
                this.clearAuthData();
            }
        }
    }

    /**
     * Interceptador global para erros de autenticação
     */
    static setupGlobalErrorInterceptor(): void {
        // Interceptar erros não tratados do Supabase
        const originalConsoleError = console.error;
        console.error = (...args: any[]) => {
            // Verificar se algum dos argumentos contém erro de refresh token
            const hasRefreshError = args.some(arg => {
                if (typeof arg === 'string') {
                    return this.isRefreshTokenError({ message: arg });
                }
                if (typeof arg === 'object' && arg !== null) {
                    return this.isRefreshTokenError(arg);
                }
                return false;
            });

            if (hasRefreshError) {
                console.log('AuthErrorHandler: Erro de refresh token detectado no console. Iniciando limpeza...');
                this.handleRefreshTokenError({ message: args.join(' ') });
            }

            // Chamar o console.error original
            originalConsoleError.apply(console, args);
        };

        console.log('AuthErrorHandler: Interceptador global de erros configurado');
    }

    /**
     * Verifica e limpa tokens expirados no localStorage
     */
    static checkAndClearExpiredTokens(): void {
        try {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith('supabase.auth.')) {
                    try {
                        const data = localStorage.getItem(key);
                        if (data) {
                            const parsed = JSON.parse(data);
                            
                            // Verificar se há token expirado
                            if (parsed.expires_at && parsed.expires_at < Date.now() / 1000) {
                                console.log(`AuthErrorHandler: Token expirado encontrado em ${key}. Removendo...`);
                                localStorage.removeItem(key);
                            }
                        }
                    } catch (parseError) {
                        console.warn(`AuthErrorHandler: Erro ao analisar dados em ${key}:`, parseError);
                        // Se não conseguir analisar, remover o item corrompido
                        localStorage.removeItem(key);
                    }
                }
            });
        } catch (error) {
            console.error('AuthErrorHandler: Erro ao verificar tokens expirados:', error);
        }
    }
}

// Configurar interceptador global na inicialização
AuthErrorHandler.setupGlobalErrorInterceptor();

// Verificar tokens expirados na inicialização
AuthErrorHandler.checkAndClearExpiredTokens();