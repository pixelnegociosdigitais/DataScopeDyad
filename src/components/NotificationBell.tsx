import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BellIcon } from '../../components/icons/BellIcon';
import { Notice, UserRole } from '../../types';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../integrations/supabase/client';
import { showError } from '../utils/toast';

interface NotificationBellProps {
    onNoticeClick: (notice: Notice) => void;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ onNoticeClick }) => {
    const { currentUser, currentCompany, loadingAuth } = useAuth(() => {});
    const [unreadNotices, setUnreadNotices] = useState<Notice[]>([]);
    const [showPanel, setShowPanel] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);
    const bellRef = useRef<HTMLButtonElement>(null);

    const fetchUnreadNotices = useCallback(async () => {
        if (loadingAuth || !currentUser) {
            setUnreadNotices([]);
            return;
        }

        try {
            let query = supabase
                .from('notices')
                .select(`
                    *,
                    user_notices!left(user_id, notice_id)
                `)
                .order('created_at', { ascending: false });

            // RLS policies should handle most of this, but adding client-side filter for clarity
            if (currentUser.role === UserRole.DEVELOPER) {
                // Developers can see all notices
            } else if (currentUser.role === UserRole.ADMIN) {
                query = query.eq('company_id', currentCompany?.id || null)
                             .or(`target_roles.cs.{${UserRole.ADMIN},${UserRole.USER}}`);
            } else if (currentUser.role === UserRole.USER) {
                query = query.eq('company_id', currentCompany?.id || null)
                             .cs('target_roles', [UserRole.USER]);
            } else {
                setUnreadNotices([]);
                return;
            }

            const { data, error } = await query;

            if (error) {
                console.error('Erro ao buscar avisos não lidos:', error);
                showError('Não foi possível carregar os avisos.');
                setUnreadNotices([]);
            } else {
                const filteredNotices = (data || [])
                    .filter(notice => {
                        // Filter client-side again to ensure correct targeting and unread status
                        const isTargeted = notice.target_roles.includes(currentUser.role);
                        const isForCompany = (currentUser.role === UserRole.DEVELOPER) || (notice.company_id === currentCompany?.id);
                        const isUnread = !notice.user_notices.some((un: any) => un.user_id === currentUser.id);
                        
                        return isTargeted && isForCompany && isUnread;
                    })
                    .map(notice => ({
                        ...notice,
                        user_notices: undefined // Remove a propriedade user_notices para limpar o objeto
                    }));
                setUnreadNotices(filteredNotices as Notice[]);
            }
        } catch (err) {
            console.error('Erro inesperado ao buscar avisos não lidos:', err);
            showError('Ocorreu um erro ao carregar os avisos.');
            setUnreadNotices([]);
        }
    }, [currentUser, currentCompany, loadingAuth]);

    const markNoticeAsRead = useCallback(async (noticeId: string) => {
        if (!currentUser) return;

        const { error } = await supabase
            .from('user_notices')
            .insert({ user_id: currentUser.id, notice_id: noticeId });

        if (error) {
            console.error('Erro ao marcar aviso como lido:', error);
            showError('Não foi possível marcar o aviso como lido.');
        } else {
            fetchUnreadNotices(); // Recarrega os avisos para atualizar a contagem
        }
    }, [currentUser, fetchUnreadNotices]);

    useEffect(() => {
        fetchUnreadNotices();
        // Opcional: configurar um polling para novos avisos a cada X segundos
        const interval = setInterval(fetchUnreadNotices, 30000); // A cada 30 segundos
        return () => clearInterval(interval);
    }, [fetchUnreadNotices]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(event.target as Node) &&
                bellRef.current && !bellRef.current.contains(event.target as Node)) {
                setShowPanel(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleNoticeClickInternal = (notice: Notice) => {
        markNoticeAsRead(notice.id);
        onNoticeClick(notice); // Chama a função passada via props para lidar com o clique
        setShowPanel(false);
    };

    if (!currentUser) {
        return null;
    }

    return (
        <div className="relative">
            <button
                ref={bellRef}
                onClick={() => setShowPanel(prev => !prev)}
                className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Ver avisos"
            >
                <BellIcon className="h-6 w-6 text-gray-600" />
                {unreadNotices.length > 0 && (
                    <span className="absolute top-1 right-1 block h-3 w-3 rounded-full ring-2 ring-white bg-red-500"></span>
                )}
            </button>

            {showPanel && (
                <div
                    ref={panelRef}
                    className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-40 max-h-96 overflow-y-auto"
                >
                    <div className="p-4 border-b border-gray-200">
                        <h4 className="font-semibold text-text-main">Avisos Não Lidos ({unreadNotices.length})</h4>
                    </div>
                    {unreadNotices.length === 0 ? (
                        <p className="p-4 text-sm text-text-light">Nenhum aviso novo.</p>
                    ) : (
                        <ul>
                            {unreadNotices.map(notice => (
                                <li
                                    key={notice.id}
                                    className="p-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 cursor-pointer"
                                    onClick={() => handleNoticeClickInternal(notice)}
                                >
                                    <p className="font-medium text-sm text-text-main">{notice.message}</p>
                                    <p className="text-xs text-text-light mt-1">
                                        De: {notice.sender_email} • {new Date(notice.created_at).toLocaleDateString('pt-BR')}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationBell;