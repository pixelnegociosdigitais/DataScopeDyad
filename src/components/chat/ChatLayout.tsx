import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChatIcon } from '../../../components/icons/ChatIcon';
import { ArrowLeftIcon } from '../../../components/icons/ArrowLeftIcon';
import { User, Chat, ChatParticipant, Message, UserRole, View } from '../../../types';
import { supabase } from '../../integrations/supabase/client';
import { useAuth } from '../../hooks/useAuth';
import { showError, showSuccess } from '../../utils/toast';
import { logActivity } from '../../utils/logger';
import ContactList from './ContactList';
import ChatMessages from './ChatMessages';
import MessageInput from './MessageInput';
import PresenceIndicator from './PresenceIndicator';

interface ChatLayoutProps {
    onBack: () => void;
    setCurrentView: (view: View) => void;
}

const ChatLayout: React.FC<ChatLayoutProps> = ({ onBack, setCurrentView }) => {
    const { currentUser, currentCompany, loadingAuth, fetchUserData } = useAuth(setCurrentView);
    const [contacts, setContacts] = useState<User[]>([]);
    const [chats, setChats] = useState<Chat[]>([]);
    const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [onlineUsers, setOnlineUsers] = useState<Record<string, boolean>>({}); // Track online status from presence
    const [lastActivity, setLastActivity] = useState<Record<string, string>>({}); // Track last activity from profiles

    const messageSubscriptionRef = useRef<any>(null);
    const presenceChannelRef = useRef<any>(null);

    const fetchContacts = useCallback(async () => {
        if (!currentUser || !currentCompany) {
            setContacts([]);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            let query = supabase
                .from('profiles')
                .select('id, full_name, email, role, company_id, visibilidade_chat, status_online, ultima_atividade_at');

            if (currentUser.role === UserRole.DEVELOPER) {
                // Developer can see all users, filtered by visibilidade_chat
                query = query.eq('visibilidade_chat', true);
            } else {
                // Admin/User can see users from the same company
                query = query.eq('company_id', currentCompany.id);
            }

            const { data, error } = await query;

            if (error) {
                throw error;
            }

            const fetchedContacts: User[] = data.map((p: any) => ({
                id: p.id,
                fullName: p.full_name,
                email: p.email,
                role: p.role,
                company_id: p.company_id,
                visibilidade_chat: p.visibilidade_chat,
                status_online: p.status_online,
                ultima_atividade_at: p.ultima_atividade_at,
            }));

            // Filter contacts based on business rules
            const filteredContacts = fetchedContacts.filter(contact => {
                if (contact.id === currentUser.id) return false; // Don't show self in contacts

                if (currentUser.role === UserRole.DEVELOPER) {
                    return contact.visibilidade_chat; // Dev sees all visible users
                } else if (currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.USER) {
                    // Admin/User sees users from same company or visible developers
                    const isSameCompany = contact.company_id === currentCompany.id;
                    const isVisibleDeveloper = contact.role === UserRole.DEVELOPER && contact.visibilidade_chat;
                    return isSameCompany || isVisibleDeveloper;
                }
                return false;
            });

            setContacts(filteredContacts);
            logActivity('INFO', 'Contatos carregados para o chat.', 'CHAT', currentUser.id, currentUser.email, currentCompany.id);
        } catch (err: any) {
            console.error('Erro ao buscar contatos:', err.message);
            setError('Não foi possível carregar os contatos: ' + err.message);
            logActivity('ERROR', `Erro ao buscar contatos: ${err.message}`, 'CHAT', currentUser?.id, currentUser?.email, currentCompany?.id);
        } finally {
            setLoading(false);
        }
    }, [currentUser, currentCompany]);

    const fetchChats = useCallback(async () => {
        if (!currentUser) {
            setChats([]);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('chat_participants')
                .select(`
                    chat_id,
                    chats (id, created_at),
                    user_id,
                    unread_count,
                    joined_at
                `)
                .eq('user_id', currentUser.id);

            if (error) {
                throw error;
            }

            const userChats: Chat[] = data.map((p: any) => p.chats);
            setChats(userChats);
            logActivity('INFO', 'Chats do usuário carregados.', 'CHAT', currentUser.id, currentUser.email, currentCompany?.id);
        } catch (err: any) {
            console.error('Erro ao buscar chats:', err.message);
            setError('Não foi possível carregar seus chats: ' + err.message);
            logActivity('ERROR', `Erro ao buscar chats: ${err.message}`, 'CHAT', currentUser.id, currentUser.email, currentCompany?.id);
        }
    }, [currentUser, currentCompany]);

    const fetchMessages = useCallback(async (chatId: string) => {
        try {
            const { data, error } = await supabase
                .from('messages')
                .select(`
                    id,
                    chat_id,
                    sender_id,
                    content,
                    created_at,
                    status,
                    profiles (id, full_name, email, profilePictureUrl)
                `)
                .eq('chat_id', chatId)
                .order('created_at', { ascending: true });

            if (error) {
                throw error;
            }

            const fetchedMessages: Message[] = data.map((m: any) => ({
                id: m.id,
                chat_id: m.chat_id,
                sender_id: m.sender_id,
                content: m.content,
                created_at: m.created_at,
                status: m.status,
                sender: {
                    id: m.profiles.id,
                    fullName: m.profiles.full_name,
                    email: m.profiles.email,
                    profilePictureUrl: m.profiles.profilePictureUrl,
                } as User,
            }));
            setMessages(fetchedMessages);
            logActivity('INFO', `Mensagens do chat ${chatId} carregadas.`, 'CHAT', currentUser?.id, currentUser?.email, currentCompany?.id);
        } catch (err: any) {
            console.error('Erro ao buscar mensagens:', err.message);
            showError('Não foi possível carregar as mensagens: ' + err.message);
            logActivity('ERROR', `Erro ao buscar mensagens do chat ${chatId}: ${err.message}`, 'CHAT', currentUser?.id, currentUser?.email, currentCompany?.id);
        }
    }, [currentUser, currentCompany]);

    const handleSelectChat = useCallback(async (chat: Chat) => {
        setSelectedChat(chat);
        await fetchMessages(chat.id);
        // Mark messages as read
        if (currentUser) {
            await supabase
                .from('chat_participants')
                .update({ unread_count: 0 })
                .eq('chat_id', chat.id)
                .eq('user_id', currentUser.id);
        }
    }, [fetchMessages, currentUser]);

    const handleSendMessage = useCallback(async (content: string) => {
        if (!selectedChat || !currentUser) return;

        try {
            const { data, error } = await supabase
                .from('messages')
                .insert({
                    chat_id: selectedChat.id,
                    sender_id: currentUser.id,
                    content,
                    status: 'sent',
                })
                .select()
                .single();

            if (error) throw error;

            // Update unread count for other participants
            await supabase.rpc('increment_unread_count', { chat_id_param: selectedChat.id, user_id_to_exclude: currentUser.id });

            logActivity('INFO', `Mensagem enviada no chat ${selectedChat.id}.`, 'CHAT', currentUser.id, currentUser.email, currentCompany?.id);
        } catch (err: any) {
            console.error('Erro ao enviar mensagem:', err.message);
            showError('Não foi possível enviar a mensagem: ' + err.message);
            logActivity('ERROR', `Erro ao enviar mensagem no chat ${selectedChat.id}: ${err.message}`, 'CHAT', currentUser.id, currentUser.email, currentCompany?.id);
        }
    }, [selectedChat, currentUser, currentCompany]);

    const handleCreateChat = useCallback(async (participantId: string) => {
        if (!currentUser) return;

        // Check if a chat already exists between these two users
        const { data: existingChatsData, error: existingChatsError } = await supabase
            .from('chat_participants')
            .select('chat_id')
            .in('user_id', [currentUser.id, participantId]);

        if (existingChatsError) {
            showError('Erro ao verificar chats existentes.');
            console.error('Erro ao verificar chats existentes:', existingChatsError);
            return;
        }

        const chatIds = existingChatsData.map(p => p.chat_id);
        const commonChatIds = chatIds.filter((id, index) => chatIds.indexOf(id) !== index);

        if (commonChatIds.length > 0) {
            const existingChat = chats.find(c => c.id === commonChatIds[0]);
            if (existingChat) {
                handleSelectChat(existingChat);
                return;
            }
        }

        // If no existing chat, create a new one
        try {
            const { data: newChatData, error: chatError } = await supabase
                .from('chats')
                .insert({})
                .select()
                .single();

            if (chatError) throw chatError;

            if (newChatData) {
                await supabase.from('chat_participants').insert([
                    { chat_id: newChatData.id, user_id: currentUser.id },
                    { chat_id: newChatData.id, user_id: participantId },
                ]);
                showSuccess('Novo chat criado!');
                fetchChats(); // Refresh chat list
                handleSelectChat(newChatData);
                logActivity('INFO', `Novo chat criado entre ${currentUser.id} e ${participantId}.`, 'CHAT', currentUser.id, currentUser.email, currentCompany?.id);
            }
        } catch (err: any) {
            console.error('Erro ao criar chat:', err.message);
            showError('Não foi possível criar o chat: ' + err.message);
            logActivity('ERROR', `Erro ao criar chat entre ${currentUser.id} e ${participantId}: ${err.message}`, 'CHAT', currentUser.id, currentUser.email, currentCompany?.id);
        }
    }, [currentUser, chats, fetchChats, handleSelectChat, currentCompany]);

    // Realtime subscriptions
    useEffect(() => {
        if (!currentUser) return;

        // Subscribe to messages
        if (selectedChat) {
            if (messageSubscriptionRef.current) {
                supabase.removeChannel(messageSubscriptionRef.current);
            }
            const messageChannel = supabase
                .channel(`chat:${selectedChat.id}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'messages',
                        filter: `chat_id=eq.${selectedChat.id}`,
                    },
                    (payload: any) => {
                        const newMessage: Message = {
                            id: payload.new.id,
                            chat_id: payload.new.chat_id,
                            sender_id: payload.new.sender_id,
                            content: payload.new.content,
                            created_at: payload.new.created_at,
                            status: payload.new.status,
                            sender: contacts.find(c => c.id === payload.new.sender_id) || { id: payload.new.sender_id, fullName: 'Desconhecido', email: '' } as User,
                        };
                        setMessages(prev => [...prev, newMessage]);
                        // Mark as delivered if not sent by current user
                        if (payload.new.sender_id !== currentUser.id) {
                            supabase.from('messages').update({ status: 'delivered' }).eq('id', payload.new.id).then(({ error }) => {
                                if (error) console.error('Error marking message as delivered:', error);
                            });
                        }
                    }
                )
                .subscribe();
            messageSubscriptionRef.current = messageChannel;
        }

        // Presence tracking
        if (presenceChannelRef.current) {
            supabase.removeChannel(presenceChannelRef.current);
        }
        const presenceChannel = supabase.channel('online_status', {
            config: { presence: { key: currentUser.id } }
        });

        presenceChannel.on('presence', { event: 'sync' }, () => {
            const newState = presenceChannel.presenceState();
            const newOnlineUsers: Record<string, boolean> = {};
            for (const userId in newState) {
                newOnlineUsers[userId] = true;
            }
            setOnlineUsers(newOnlineUsers);
        });

        presenceChannel.on('presence', { event: 'join' }, ({ newPresences }) => {
            newPresences.forEach(p => {
                setOnlineUsers(prev => ({ ...prev, [p.key]: true }));
            });
        });

        presenceChannel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
            leftPresences.forEach(p => {
                setOnlineUsers(prev => ({ ...prev, [p.key]: false }));
            });
        });

        presenceChannel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await presenceChannel.track({
                    user_id: currentUser.id,
                    status: 'online',
                    last_active: new Date().toISOString(),
                });
                // Update database status on connect
                await supabase.from('profiles').update({ status_online: true, ultima_atividade_at: new Date().toISOString() }).eq('id', currentUser.id);
            }
        });
        presenceChannelRef.current = presenceChannel;

        return () => {
            if (messageSubscriptionRef.current) {
                supabase.removeChannel(messageSubscriptionRef.current);
            }
            if (presenceChannelRef.current) {
                supabase.removeChannel(presenceChannelRef.current);
            }
        };
    }, [selectedChat, currentUser, contacts]);

    // Update last activity in database periodically
    useEffect(() => {
        if (!currentUser) return;

        const updateActivity = async () => {
            await supabase.from('profiles').update({ ultima_atividade_at: new Date().toISOString() }).eq('id', currentUser.id);
        };

        const interval = setInterval(updateActivity, 30000); // Update every 30 seconds
        return () => clearInterval(interval);
    }, [currentUser]);

    // Handle user leaving/closing app
    useEffect(() => {
        if (!currentUser) return;

        const handleVisibilityChange = async () => {
            if (document.visibilityState === 'hidden') {
                await supabase.from('profiles').update({ status_online: false, ultima_atividade_at: new Date().toISOString() }).eq('id', currentUser.id);
            } else {
                await supabase.from('profiles').update({ status_online: true, ultima_atividade_at: new Date().toISOString() }).eq('id', currentUser.id);
            }
        };

        window.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            window.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [currentUser]);

    useEffect(() => {
        fetchContacts();
        fetchChats();
    }, [fetchContacts, fetchChats]);

    if (loadingAuth || loading) {
        return <div className="text-center py-8 text-text-light">Carregando chat...</div>;
    }

    if (error) {
        return <div className="text-center py-8 text-red-600">{error}</div>;
    }

    if (!currentUser) {
        return <div className="text-center py-8 text-red-600">Usuário não autenticado.</div>;
    }

    return (
        <div className="flex h-[calc(100vh-80px)] bg-white rounded-lg shadow-md overflow-hidden">
            <div className={`w-1/3 border-r border-gray-200 flex flex-col ${selectedChat ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-4 border-b border-gray-200 flex items-center gap-4">
                    <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-200 transition-colors" aria-label="Voltar">
                        <ArrowLeftIcon className="h-6 w-6 text-gray-600" />
                    </button>
                    <ChatIcon className="h-8 w-8 text-primary" />
                    <h2 className="text-2xl font-bold text-text-main">Chat</h2>
                </div>
                <ContactList
                    contacts={contacts}
                    chats={chats}
                    onSelectChat={handleSelectChat}
                    onCreateChat={handleCreateChat}
                    onlineUsers={onlineUsers}
                    currentUser={currentUser}
                />
            </div>

            <div className={`flex-1 flex flex-col ${selectedChat ? 'flex' : 'hidden md:flex'}`}>
                {selectedChat ? (
                    <>
                        <div className="p-4 border-b border-gray-200 flex items-center gap-4">
                            <button onClick={() => setSelectedChat(null)} className="md:hidden p-2 rounded-full hover:bg-gray-200 transition-colors" aria-label="Voltar para contatos">
                                <ArrowLeftIcon className="h-6 w-6 text-gray-600" />
                            </button>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-text-main">
                                    {/* Display chat name (e.g., other participant's name) */}
                                    {selectedChat.id}
                                </h3>
                                {/* <PresenceIndicator userId={otherParticipantId} onlineUsers={onlineUsers} lastActivity={lastActivity} /> */}
                            </div>
                        </div>
                        <ChatMessages messages={messages} currentUser={currentUser} />
                        <MessageInput onSendMessage={handleSendMessage} />
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-text-light">
                        Selecione um contato para iniciar uma conversa.
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatLayout;