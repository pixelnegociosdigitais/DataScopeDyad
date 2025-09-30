import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';
import { Notice, UserRole } from '../../types';
import { useAuth } from '../hooks/useAuth';
import { BellIcon } from '../../components/icons/BellIcon';

interface NoticeDisplayProps {
    onNoticeDismiss: (noticeId: string) => void;
}

const NoticeDisplay: React.FC<NoticeDisplayProps> = ({ onNoticeDismiss }) => {
    const { currentUser, currentCompany, loadingAuth } = useAuth(() => {});
    const [notices, setNotices] = useState<Notice[]>([]);
    const [loadingNotices, setLoadingNotices] = useState(true);

    const fetchNotices = useCallback(async () => {
        if (loadingAuth || !currentUser) {
            setNotices([]);
            setLoadingNotices(false);
            return;
        }

        setLoadingNotices(true);
        try {
            let query = supabase
                .from('notices')
                .select('*')
                .order('created_at', { ascending: false });

            // RLS policies should handle most of this, but adding client-side filter for clarity
            if (currentUser.role === UserRole.DEVELOPER) {
                // Developers can see all notices
            } else if (currentUser.role === UserRole.ADMIN) {
                // Admins see notices for Admin or User roles within their company
                query = query.eq('company_id', currentCompany?.id || null)
                             .or(`target_roles.cs.{${UserRole.ADMIN},${UserRole.USER}}`);
            } else if (currentUser.role === UserRole.USER) {
                // Users see notices for User role within their company
                query = query.eq('company_id', currentCompany?.id || null)
                             .cs('target_roles', [UserRole.USER]);
            } else {
                // No notices for unhandled roles
                setNotices([]);
                setLoadingNotices(false);
                return;
            }

            const { data, error } = await query;

            if (error) {
                console.error('Erro ao buscar avisos:', error);
                setNotices([]);
            } else {
                // Filter client-side again to ensure correct targeting, especially for arrays
                const filteredData = (data || []).filter(notice => {
                    if (notice.target_roles.includes(currentUser.role)) {
                        if (currentUser.role === UserRole.DEVELOPER) return true;
                        if (currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.USER) {
                            return notice.company_id === currentCompany?.id;
                        }
                    }
                    return false;
                });
                setNotices(filteredData as Notice[]);
            }
        } catch (err) {
            console.error('Erro inesperado ao buscar avisos:', err);
            setNotices([]);
        } finally {
            setLoadingNotices(false);
        }
    }, [currentUser, currentCompany, loadingAuth]);

    useEffect(() => {
        fetchNotices();
    }, [fetchNotices]);

    if (loadingNotices || notices.length === 0) {
        return null;
    }

    return (
        <div className="space-y-4 mb-8">
            {notices.map(notice => (
                <div key={notice.id} className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-lg shadow-sm flex items-start gap-3">
                    <BellIcon className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <p className="font-medium text-sm mb-1">Aviso de {notice.sender_email} para {notice.target_roles.join(', ')}</p>
                        <p className="text-base">{notice.message}</p>
                        <p className="text-xs text-blue-600 mt-2">
                            Enviado em: {new Date(notice.created_at).toLocaleString('pt-BR')}
                        </p>
                    </div>
                    <button
                        onClick={() => onNoticeDismiss(notice.id)}
                        className="ml-auto p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-full transition-colors"
                        aria-label="Dismiss notice"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            ))}
        </div>
    );
};

export default NoticeDisplay;