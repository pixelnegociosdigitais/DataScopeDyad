import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/src/integrations/supabase/client';

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
            const { data: { session: initialSession } } = await supabase.auth.getSession();
            // Only update if the session is truly different
            if (JSON.stringify(initialSession) !== JSON.stringify(session)) { // Deep comparison for stability
                setSession(initialSession);
            }
            setLoadingSession(false);
            console.log('AuthSessionContext: Sessão buscada. loadingSession = false. Sessão:', initialSession);
        };

        getSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
            console.log('AuthSessionContext: Evento onAuthStateChange. Evento:', _event, 'Sessão:', newSession);
            // Only update if the session is truly different
            if (JSON.stringify(newSession) !== JSON.stringify(session)) { // Deep comparison for stability
                setSession(newSession);
            }
            setLoadingSession(false);
            console.log('AuthSessionContext: onAuthStateChange concluído. loadingSession = false.');
        });

        return () => {
            console.log('AuthSessionContext: Desinscrevendo do onAuthStateChange.');
            subscription.unsubscribe();
        };
    }, [session]); // Adicionar session como dependência para garantir que a comparação seja feita com o estado atual

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