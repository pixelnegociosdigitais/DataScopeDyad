import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/src/integrations/supabase/client';
import { AuthErrorHandler } from '@/src/utils/authErrorHandler';

interface AuthSessionContextType {
    session: Session | null;
    loadingSession: boolean;
}

const AuthSessionContext = createContext<AuthSessionContextType | undefined>(undefined);

export const AuthSessionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [loadingSession, setLoadingSession] = useState(true);

    useEffect(() => {
        const getSession = async () => {
            console.log('AuthSessionContext: Iniciando busca da sessão...');
            try {
                const { data: { session: initialSession }, error } = await supabase.auth.getSession();
                
                if (error) {
                    console.error('AuthSessionContext: Erro ao buscar sessão:', error);
                    
                    // Usar o AuthErrorHandler para tratar erros de refresh token
                    if (AuthErrorHandler.isRefreshTokenError(error)) {
                        console.log('AuthSessionContext: Token de refresh inválido detectado. Usando AuthErrorHandler...');
                        await AuthErrorHandler.handleRefreshTokenError(error);
                        setSession(null);
                    }
                } else {
                    // Atualiza a sessão diretamente, sem comparação profunda
                    setSession(initialSession);
                    console.log('AuthSessionContext: Sessão buscada. loadingSession = false. Sessão:', initialSession);
                }
            } catch (error) {
                console.error('AuthSessionContext: Erro inesperado ao buscar sessão:', error);
                setSession(null);
            } finally {
                setLoadingSession(false);
            }
        };

        getSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
            console.log('AuthSessionContext: Evento onAuthStateChange. Evento:', _event, 'Sessão:', newSession);
            
            // Tratar eventos específicos de erro de token
            if (_event === 'TOKEN_REFRESHED' && !newSession) {
                console.log('AuthSessionContext: Falha na renovação do token. Limpando sessão...');
                setSession(null);
            } else if (_event === 'SIGNED_OUT') {
                console.log('AuthSessionContext: Usuário deslogado. Limpando dados...');
                // Usar AuthErrorHandler para limpeza consistente
                AuthErrorHandler.clearAuthData();
                setSession(null);
            } else {
                // Atualiza a sessão diretamente, sem comparação profunda
                setSession(newSession);
            }
            
            setLoadingSession(false);
            console.log('AuthSessionContext: onAuthStateChange concluído. loadingSession = false.');
        });

        return () => {
            console.log('AuthSessionContext: Desinscrevendo do onAuthStateChange.');
            subscription.unsubscribe();
        };
    }, []); // Removido 'session' das dependências para evitar loops e garantir que o onAuthStateChange seja o único a atualizar

    return (
        <AuthSessionContext.Provider value={{ session, loadingSession }}>
            {children}
        </AuthSessionContext.Provider>
    );
};

export const useAuthSession = () => {
    const context = useContext(AuthSessionContext);
    if (context === undefined) {
        throw new Error('useAuthSession must be used within an AuthSessionProvider');
    }
    return context;
};