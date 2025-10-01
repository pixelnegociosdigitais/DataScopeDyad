import React from 'react';
import { UserRole } from '../../../types';

interface PresenceIndicatorProps {
    userId: string;
    onlineUsers: Record<string, boolean>;
    lastActivity?: string; // From profiles.ultima_atividade_at
    currentUserRole: UserRole;
    contactRole: UserRole;
    contactCompanyId?: string;
    currentUserCompanyId?: string;
}

const PresenceIndicator: React.FC<PresenceIndicatorProps> = ({
    userId,
    onlineUsers,
    lastActivity,
    currentUserRole,
    contactRole,
    contactCompanyId,
    currentUserCompanyId,
}) => {
    const isOnline = onlineUsers[userId];

    const canSeeOnlineStatus = () => {
        if (currentUserRole === UserRole.DEVELOPER) {
            return true; // Developer sees all
        }
        if (contactRole === UserRole.DEVELOPER) {
            return true; // Everyone sees Developer status
        }
        if (currentUserRole === UserRole.ADMIN && contactRole === UserRole.ADMIN) {
            return currentUserCompanyId === contactCompanyId; // Admins see other Admins in same company
        }
        // Users only see Developer status (handled above)
        return false;
    };

    if (!canSeeOnlineStatus()) {
        return null; // Don't display presence if not allowed
    }

    if (isOnline) {
        return (
            <span className="flex items-center text-sm text-green-600">
                <span className="h-2 w-2 rounded-full bg-green-500 mr-1"></span> Online
            </span>
        );
    }

    if (lastActivity) {
        const date = new Date(lastActivity);
        const now = new Date();
        const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        let statusText = '';
        if (diffSeconds < 60) {
            statusText = 'Visto agora há pouco';
        } else if (diffSeconds < 3600) {
            const minutes = Math.floor(diffSeconds / 60);
            statusText = `Visto há ${minutes} min`;
        } else if (diffSeconds < 86400) {
            const hours = Math.floor(diffSeconds / 3600);
            statusText = `Visto há ${hours} h`;
        } else {
            statusText = `Visto em ${date.toLocaleDateString('pt-BR')} às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
        }

        return (
            <span className="text-sm text-gray-500">
                {statusText}
            </span>
        );
    }

    return <span className="text-sm text-gray-500">Offline</span>;
};

export default PresenceIndicator;