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
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);
            setLoadingSession(false);
        };

        getSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setLoadingSession(false);
        });

        return () => subscription.unsubscribe();
    }, []);

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