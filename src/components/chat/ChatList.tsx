import React, { useState, useEffect, useCallback } from 'react';
import { Chat, ChatParticipant, User } from '../../../types';
import { supabase } from '../../integrations/supabase/client';
import { showError, showSuccess } from '../../utils/toast';
import { ChatIcon } from '../../../components/icons/ChatIcon';
import { CreateIcon } from '../../../components/icons/CreateIcon';
import { UserIcon } from '../../../components/icons/UserIcon';
import { SearchIcon } from '../../../components/icons/SearchIcon';

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
    const [searchTerm, setSearchTerm] = useState('');

    const fetchChats = useCallback(async () => {
        setLoading(true);
        try {
            const { data: userChatParticipants, error: cpError } = await supabase
                .from('chat_participants')
                .select('chat_id, unread_count')
                .eq('user_id', currentUser.id);

            if (cpError) throw cpError;

            if (!userChatParticipants || userChatParticipants.length === 0) {
                setChats([]);
                setLoading(false);
                return;
            }

            const chatIds = userChatParticipants.map(cp => cp.chat_id);
            const unreadCountsMap = new Map(userChatParticipants.map(cp => [cp.chat_id, cp.unread_count]));

            const { data: chatsData, error: chatsError } = await supabase
                .from('chats')
                .select(`
                    id,
                    created_at,
                    company_id,
                    name,
                    is_group_chat,
                    last_message_at,
                    chat_participants (
                        user_id,
                        profiles (id, full_name, avatar_url)
                    ),
                    messages (
                        content,
                        created_at
                    )
                `)
                .in('id', chatIds)
                .order('last_message_at', { ascending: false, nullsLast: true });

            if (chatsError) throw chatsError;

            const fetchedChats: Chat[] = (chatsData || []).map((chat: any) => {
                const lastMessage = chat.messages.length > 0 ? chat.messages[0] : null;
                return {
                    ...chat,
                    unread_count: unreadCountsMap.get(chat.id) || 0,
                    participants: chat.chat_participants.map((p: any) => ({
                        ...p,
                        profiles: p.profiles,
                    })),
                    last_message_content: lastMessage ? lastMessage.content : null,
                    last_message_at: lastMessage ? lastMessage.created_at : chat.last_message_at,
                };
            });

            setChats(fetchedChats);

        } catch (error: any) {
            console.error('Error fetching chats:', error);
            showError('Não foi possível carregar seus chats.');
            setChats([]);
        } finally {
            setLoading(false);
        }
    }, [currentUser.id]);

    const fetchAvailableUsers = useCallback(async () => {
        if (!currentCompanyId) {
            console.log('ChatList: currentCompanyId is null or undefined, cannot fetch available users.');
            setAvailableUsers([]);
            return;
        }
        console.log('ChatList: Fetching available users for company:', currentCompanyId, 'excluding user:', currentUser.id);
        const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .eq('company_id', currentCompanyId)
            .neq('id', currentUser.id); // Exclude current user

        if (error) {
            console.error('ChatList: Error fetching available users:', error);
            showError('Não foi possível carregar os usuários disponíveis.');
            setAvailableUsers([]);
        } else {
            console.log('ChatList: Available users fetched:', data);
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
                fetchChats();
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
                console.log('ChatList: Realtime update for new message:', payload);
                fetchChats();
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
            fetchChats();
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
            return <ChatIcon className="h-10 w-10 text-gray-500" />;
        }
        const otherParticipant = chat.participants?.find(p => p.user_id !== currentUser.id);
        if (otherParticipant?.profiles?.avatar_url) {
            return <img src={otherParticipant.profiles.avatar_url} alt={otherParticipant.profiles.fullName} className="h-10 w-10 rounded-full object-cover" />;
        }
        return <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center text-base text-gray-600">{otherParticipant?.profiles?.fullName?.charAt(0).toUpperCase() || '?'}</div>;
    };

    const filteredChats = chats.filter(chat => {
        const displayName = getChatDisplayName(chat).toLowerCase();
        const searchLower = searchTerm.toLowerCase();
        return displayName.includes(searchLower);
    });

    return (
        <div className="flex flex-col h-full bg-white rounded-lg shadow-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                    {currentUser.profilePictureUrl ? (
                        <img src={currentUser.profilePictureUrl} alt={currentUser.fullName} className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                        <UserIcon className="h-10 w-10 p-1 bg-gray-200 rounded-full text-gray-500" />
                    )}
                    <span className="font-semibold text-lg text-text-main">{currentUser.fullName}</span>
                </div>
                <button
                    onClick={() => setShowNewChatModal(true)}
                    className="p-2 bg-primary text-white rounded-full hover:bg-primary-dark transition-colors"
                    aria-label="Iniciar novo chat"
                >
                    <CreateIcon className="h-5 w-5" />
                </button>
            </div>

            <div className="p-4 border-b border-gray-200">
                <div className="relative">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Pesquisar chats..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-light text-gray-700"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <p className="text-center text-text-light py-4">Carregando chats...</p>
                ) : filteredChats.length === 0 && searchTerm === '' ? (
                    <div className="text-center py-4 px-4">
                        <p className="text-text-light mb-4">Nenhum chat encontrado. Inicie um novo!</p>
                        {availableUsers.length > 0 ? (
                            <div className="bg-gray-100 p-4 rounded-lg shadow-inner mt-6">
                                <h4 className="font-semibold text-text-main mb-3">Pessoas na sua empresa:</h4>
                                <ul className="space-y-2">
                                    {availableUsers.map(user => (
                                        <li key={user.id} className="flex items-center justify-between bg-white p-3 rounded-md shadow-sm border border-gray-100">
                                            <div className="flex items-center gap-3">
                                                {user.avatar_url ? (
                                                    <img src={user.avatar_url} alt={user.fullName} className="h-8 w-8 rounded-full object-cover" />
                                                ) : (
                                                    <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center text-xs text-gray-600">
                                                        {user.fullName.charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                                <span className="text-gray-800 font-medium">{user.fullName}</span>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    setSelectedUsersForNewChat([user.id]);
                                                    setShowNewChatModal(true);
                                                }}
                                                className="px-3 py-1 text-sm font-medium text-primary border border-primary rounded-md hover:bg-primary/10 transition-colors"
                                            >
                                                Iniciar Chat
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ) : (
                            <p className="text-sm text-text-light mt-6">Nenhum outro usuário disponível na sua empresa para iniciar um chat.</p>
                        )}
                    </div>
                ) : filteredChats.length === 0 && searchTerm !== '' ? (
                    <p className="text-center text-text-light py-4">Nenhum chat encontrado para "{searchTerm}".</p>
                ) : (
                    <ul>
                        {filteredChats.map(chat => (
                            <li
                                key={chat.id}
                                onClick={() => onSelectChat(chat)}
                                className="flex items-center p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                            >
                                <div className="flex-shrink-0 mr-3">
                                    {getChatDisplayAvatar(chat)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-center">
                                        <p className="font-semibold text-text-main truncate">{getChatDisplayName(chat)}</p>
                                        {chat.last_message_at && (
                                            <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                                                {new Date(chat.last_message_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex justify-between items-center mt-1">
                                        <p className="text-sm text-text-light truncate pr-2">
                                            {chat.last_message_content || 'Nenhuma mensagem.'}
                                        </p>
                                        {chat.unread_count > 0 && (
                                            <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full flex-shrink-0">
                                                {chat.unread_count}
                                            </span>
                                        )}
                                    </div>
                                </div>
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