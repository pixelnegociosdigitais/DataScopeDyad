import React from 'react';
import { User, Chat, ChatParticipant } from '../../../types';
import PresenceIndicator from './PresenceIndicator';
import { UserIcon } from '../../../components/icons/UserIcon';

interface ContactListProps {
    contacts: User[];
    chats: Chat[];
    onSelectChat: (chat: Chat) => void;
    onCreateChat: (participantId: string) => void;
    onlineUsers: Record<string, boolean>;
    currentUser: User;
}

const ContactList: React.FC<ContactListProps> = ({ contacts, chats, onSelectChat, onCreateChat, onlineUsers, currentUser }) => {
    // For simplicity, we'll display all contacts and allow starting a new chat.
    // In a real app, you'd likely filter this by existing chats or search.

    const handleContactClick = (contact: User) => {
        // Find if a chat already exists with this contact
        // This logic needs to be more robust, checking chat_participants table
        // For now, we'll just create a new chat or select an existing one
        onCreateChat(contact.id);
    };

    return (
        <div className="flex-1 overflow-y-auto">
            <h3 className="text-lg font-semibold text-text-main px-4 py-3 border-b border-gray-100">Contatos</h3>
            <ul>
                {contacts.map(contact => (
                    <li
                        key={contact.id}
                        className="flex items-center gap-3 p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleContactClick(contact)}
                    >
                        {contact.profilePictureUrl ? (
                            <img src={contact.profilePictureUrl} alt={contact.fullName} className="h-10 w-10 rounded-full object-cover" />
                        ) : (
                            <UserIcon className="h-10 w-10 p-2 bg-gray-200 rounded-full text-gray-500" />
                        )}
                        <div className="flex-1">
                            <p className="font-medium text-text-main">{contact.fullName}</p>
                            <PresenceIndicator
                                userId={contact.id}
                                onlineUsers={onlineUsers}
                                lastActivity={contact.ultima_atividade_at}
                                currentUserRole={currentUser.role}
                                contactRole={contact.role}
                                contactCompanyId={contact.company_id}
                                currentUserCompanyId={currentUser.company_id}
                            />
                        </div>
                        {/* You could add unread count here if available */}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default ContactList;