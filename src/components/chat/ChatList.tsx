import React, { useState, useEffect, useCallback } from 'react';
import { Chat, ChatParticipant, User } from '../../../types';
import { supabase } from '../../integrations/supabase/client';
import { showError } from '../../utils/toast';
import { ChatIcon } from '../../../components/icons/ChatIcon';
import { CreateIcon } from '../../../components/icons/CreateIcon';

interface ChatListProps {
    currentUser: User;
    currentCompanyId: string;
    onSelectChat: (chat: Chat) => void;
}

const ChatList: React.FC<ChatListProps> = ({ currentUser, currentCompanyId, onSelectChat }) => {
    const [chats, setChats] = useState<Chat[]>([]);
    const [loading, setLoading] = useState(true);
    const [showNewChatModal, setShowNewChatModal] = useState(false);
    const [availableUsers, setAvailableUsers] = useState<User[]>([]);
    const [selectedUsersForNewChat, setSelectedUsersForNewChat] = useState<string[]>([]);
    const [newChatName, setNewChatName] = useState('');

    const fetchChats = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('chat_participants')
            .select(`
                chat_id,
                unread_count,
                chats (
                    id,
                    created_at,
                    company_id,
                    name,
                    is_group_chat,
                    last_message_at,
                    chat_participants (
                        user_id,
                        profiles (id, full_name, avatar_url)
                    )
                )
            `)
            .eq('user_id', currentUser.id)
            .order('last_message_at', { foreignTable: 'chats', ascending: false });

        if (error) {
            console.error('Error fetching chats:', error);
            showError('Não foi possível carregar seus chats.');
            setChats([]);
        } else {
            const userChats: Chat[] = (data || []).map((cp: any) => {
                const chatData = cp.chats;
                return {
                    ...chatData,
                    unread_count: cp.unread_count, // Add unread_count to the chat object
                    participants: chatData.chat_participants.map((p: any) => ({
                        ...p,
                        profiles: p.profiles,
                    })),
                };
            });
            setChats(userChats);
        }
        setLoading(false);
    }, [currentUser.id]);

    const fetchAvailableUsers = useCallback(async () => {
        if (!currentCompanyId) return;
        const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .eq('company_id', currentCompanyId)
            .neq('id', currentUser.id); // Exclude current user

        if (error) {
            console.error('Error fetching available users:', error);
        } else {
            setAvailableUsers(data as User[]);
        }
    }, [currentCompanyId, currentUser.id]);

    useEffect(() => {
        fetchChats();
        fetchAvailableUsers();

        const channel = supabase
            .channel(`company_chats_${currentCompanyId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_participants', filter: `user_id=eq.${currentUser.id}` }, payload => {
                console.log('ChatList: Realtime update for chat_participants:', payload);
                fetchChats(); // Re-fetch chats on any participant change
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
                console.log('ChatList: Realtime update for new message:', payload);
                fetchChats(); // Re-fetch chats on new message to update last_message_at and unread_count
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchChats, fetchAvailableUsers, currentCompanyId, currentUser.id]);

    const handleCreateNewChat = async () => {
        if (selectedUsersForNewChat.length === 0) {
            showError('Selecione pelo menos um usuário para o chat.');
            return;
        }

        const isGroupChat = selectedUsersForNewChat.length > 1;
        const chatName = isGroupChat ? newChatName.trim() : undefined;

        if (isGroupChat && !chatName) {
            showError('Por favor, insira um nome para o chat em grupo.');
            return;
        }

        try {
            // 1. Create the chat
            const { data: newChat, error: chatError } = await supabase
                .from('chats')
                .insert({
                    company_id: currentCompanyId,
                    name: chatName,
                    is_group_chat: isGroupChat,
                })
                .select()
                .single();

            if (chatError) throw chatError;

            // 2. Add participants
            const participantsToInsert = [currentUser.id, ...selectedUsersForNewChat].map(userId => ({
                chat_id: newChat.id,
                user_id: userId,
            }));

            const { error: participantsError } = await supabase
                .from('chat_participants')
                .insert(participantsToInsert);

            if (participantsError) throw participantsError;

            showSuccess('Chat criado com sucesso!');
            setShowNewChatModal(false);
            setSelectedUsersForNewChat([]);
            setNewChatName('');
            fetchChats(); // Refresh chat list
        } catch (error: any) {
            console.error('Error creating new chat:', error);
            showError('Não foi possível criar o chat: ' + error.message);
        }
    };

    const getChatDisplayName = (chat: Chat) => {
        if (chat.is_group_chat) {
            return chat.name || 'Chat em Grupo';
        }
        const otherParticipant = chat.participants?.find(p => p.user_id !== currentUser.id);
        return otherParticipant?.profiles?.fullName || 'Chat Individual';
    };

    const getChatDisplayAvatar = (chat: Chat) => {
        if (chat.is_group_chat) {
            return <ChatIcon className="h-8 w-8 text-gray-500" />; // Generic group chat icon
        }
        const otherParticipant = chat.participants?.find(p => p.user_id !== currentUser.id);
        if (otherParticipant?.profiles?.avatar_url) {
            return <img src={otherParticipant.profiles.avatar_url} alt={otherParticipant.profiles.fullName} className="h-8 w-8 rounded-full object-cover" />;
        }
        return <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center text-xs text-gray-600">{otherParticipant?.profiles?.fullName?.charAt(0).toUpperCase() || '?'}</div>;
    };

    return (
        <div className="flex flex-col h-full bg-white rounded-lg shadow-md">
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-text-main">Chats</h2>
                <button
                    onClick={() => setShowNewChatModal(true)}
                    className="p-2 bg-primary text-white rounded-full hover:bg-primary-dark transition-colors"
                    aria-label="Iniciar novo chat"
                >
                    <CreateIcon className="h-5 w-5" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <p className="text-center text-text-light py-4">Carregando chats...</p>
                ) : chats.length === 0 ? (
                    <p className="text-center text-text-light py-4">Nenhum chat encontrado. Inicie um novo!</p>
                ) : (
                    <ul>
                        {chats.map(chat => (
                            <li
                                key={chat.id}
                                onClick={() => onSelectChat(chat)}
                                className="flex items-center p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                            >
                                <div className="flex-shrink-0 mr-3">
                                    {getChatDisplayAvatar(chat)}
                                </div>
                                <div className="flex-1">
                                    <p className="font-semibold text-text-main">{getChatDisplayName(chat)}</p>
                                    {/* You might want to display the last message here */}
                                    <p className="text-sm text-text-light">Última mensagem: {chat.last_message_at ? new Date(chat.last_message_at).toLocaleTimeString('pt-BR') : 'N/A'}</p>
                                </div>
                                {chat.unread_count > 0 && (
                                    <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                                        {chat.unread_count}
                                    </span>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {showNewChatModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
                        <h3 className="text-xl font-bold text-text-main mb-4">Iniciar Novo Chat</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Selecionar Usuários:</label>
                                <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-md p-2">
                                    {availableUsers.length === 0 ? (
                                        <p className="text-sm text-text-light">Nenhum outro usuário disponível na sua empresa.</p>
                                    ) : (
                                        availableUsers.map(user => (
                                            <label key={user.id} className="flex items-center space-x-2 cursor-pointer py-1">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedUsersForNewChat.includes(user.id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedUsersForNewChat(prev => [...prev, user.id]);
                                                        } else {
                                                            setSelectedUsersForNewChat(prev => prev.filter(id => id !== user.id));
                                                        }
                                                    }}
                                                    className="form-checkbox h-4 w-4 text-primary rounded"
                                                />
                                                <span>{user.fullName}</span>
                                            </label>
                                        ))
                                    )}
                                </div>
                            </div>
                            {selectedUsersForNewChat.length > 1 && (
                                <div>
                                    <label htmlFor="newChatName" className="block text-sm font-medium text-gray-700">Nome do Grupo (Opcional)</label>
                                    <input
                                        type="text"
                                        id="newChatName"
                                        value={newChatName}
                                        onChange={(e) => setNewChatName(e.target.value)}
                                        placeholder="Nome do seu grupo de chat"
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-gray-700"
                                    />
                                </div>
                            )}
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={() => setShowNewChatModal(false)}
                                className="px-4 py-2 font-semibold text-gray-700 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCreateNewChat}
                                className="px-4 py-2 font-semibold text-white bg-primary rounded-md hover:bg-primary-dark transition-colors"
                                disabled={selectedUsersForNewChat.length === 0 || (selectedUsersForNewChat.length > 1 && !newChatName.trim())}
                            >
                                Criar Chat
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatList;