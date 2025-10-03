import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Chat, ChatMessage, User, ChatParticipant, UserRole } from '../../../types';
import { supabase } from '../../integrations/supabase/client';
import { showError } from '../../utils/toast';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import TypingIndicator from './TypingIndicator';
import { ArrowLeftIcon } from '../../../components/icons/ArrowLeftIcon';

interface ChatWindowProps {
    chat: Chat;
    currentUser: User;
    onBack: () => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ chat, currentUser, onBack }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loadingMessages, setLoadingMessages] = useState(true);
    const [participants, setParticipants] = useState<ChatParticipant[]>([]);
    const participantsRef = useRef(participants); // Ref para manter a lista de participantes atualizada
    const [typingUsers, setTypingUsers] = useState<Record<string, string>>({}); // { userId: userName }
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Atualiza a ref sempre que o estado 'participants' muda
    useEffect(() => {
        participantsRef.current = participants;
    }, [participants]);

    const fetchMessages = useCallback(async () => {
        setLoadingMessages(true);
        const { data, error } = await supabase
            .from('messages')
            .select(`
                *,
                sender:profiles(id, full_name, avatar_url, role, email, phone, address, permissions, status, company_id)
            `)
            .eq('chat_id', chat.id)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Erro ao buscar mensagens:', error);
            showError('Não foi possível carregar as mensagens.');
        } else {
            // Mapear os dados para corresponder às interfaces ChatMessage e User
            const mappedMessages: ChatMessage[] = (data || []).map((msg: any) => ({
                ...msg,
                sender: msg.sender ? {
                    id: msg.sender.id,
                    fullName: msg.sender.full_name || '', // Mapear full_name para fullName e garantir string
                    avatar_url: msg.sender.avatar_url || undefined,
                    role: msg.sender.role as UserRole || UserRole.USER, // Garantir role
                    email: msg.sender.email || '', // Garantir email
                    phone: msg.sender.phone || undefined,
                    address: msg.address || undefined,
                    permissions: msg.permissions || {},
                    status: msg.status || 'active',
                    company_id: msg.company_id || undefined,
                } as User : undefined,
            }));
            setMessages(mappedMessages);
        }
        setLoadingMessages(false);
    }, [chat.id]);

    const fetchParticipants = useCallback(async () => {
        const { data, error } = await supabase
            .from('chat_participants')
            .select(`
                *,
                profiles(id, full_name, avatar_url, role, email, phone, address, permissions, status, company_id)
            `)
            .eq('chat_id', chat.id);

        if (error) {
            console.error('Erro ao buscar participantes:', error);
        } else {
            // Mapear os dados para corresponder à interface ChatParticipant e User
            const mappedParticipants: ChatParticipant[] = (data || []).map((p: any) => ({
                ...p,
                profiles: p.profiles ? {
                    id: p.profiles.id,
                    fullName: p.profiles.full_name || '', // Mapear full_name para fullName e garantir string
                    avatar_url: p.profiles.avatar_url || undefined,
                    role: p.profiles.role as UserRole || UserRole.USER, // Garantir role
                    email: p.profiles.email || '', // Garantir email
                    phone: p.profiles.phone || undefined,
                    address: p.address || undefined,
                    permissions: p.permissions || {},
                    status: p.status || 'active',
                    company_id: p.company_id || undefined,
                } as User : undefined,
            }));
            setParticipants(mappedParticipants);
        }
    }, [chat.id]);

    const markChatAsRead = useCallback(async () => {
        if (!currentUser) return;
        const { error } = await supabase
            .from('chat_participants')
            .update({ unread_count: 0 })
            .eq('chat_id', chat.id)
            .eq('user_id', currentUser.id);

        if (error) {
            console.error('Erro ao marcar chat como lido:', error);
        }
    }, [chat.id, currentUser]);

    useEffect(() => {
        fetchMessages();
        fetchParticipants();
        markChatAsRead();

        const channel = supabase
            .channel(`chat_${chat.id}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chat.id}` }, payload => {
                const rawNewMessage = payload.new as any; // Cast para any para acessar full_name
                const newMessage: ChatMessage = {
                    ...rawNewMessage,
                    sender: rawNewMessage.sender ? {
                        id: rawNewMessage.sender.id,
                        fullName: rawNewMessage.sender.full_name || '', // Mapear full_name para fullName e garantir string
                        avatar_url: rawNewMessage.sender.avatar_url || undefined,
                        role: rawNewMessage.sender.role as UserRole || UserRole.USER, // Garantir role
                        email: rawNewMessage.sender.email || '', // Garantir email
                        phone: rawNewMessage.phone || undefined,
                        address: rawNewMessage.address || undefined,
                        permissions: rawNewMessage.permissions || {},
                        status: rawNewMessage.status || 'active',
                        company_id: rawNewMessage.company_id || undefined,
                    } as User : undefined,
                };

                // Usar participantsRef.current para acessar a lista de participantes mais recente
                const senderProfile = participantsRef.current.find(p => p.user_id === newMessage.sender_id)?.profiles || currentUser;
                setMessages(prev => {
                    // Evitar duplicatas se a mensagem já foi adicionada otimisticamente
                    if (prev.some(msg => msg.id === newMessage.id)) {
                        return prev;
                    }
                    // Se a mensagem foi adicionada otimisticamente com um ID temporário, substitua-a
                    const updatedMessages = prev.map(msg => 
                        msg.sender_id === newMessage.sender_id && msg.content === newMessage.content && msg.id.startsWith('temp-')
                            ? { ...newMessage, sender: senderProfile }
                            : msg
                    );
                    // Se não encontrou para substituir, adicione como nova
                    if (!updatedMessages.some(msg => msg.id === newMessage.id)) {
                        return [...updatedMessages, { ...newMessage, sender: senderProfile }];
                    }
                    return updatedMessages;
                });
                markChatAsRead(); // Marcar como lido quando uma nova mensagem chega
            })
            .on('broadcast', { event: 'typing_status' }, ({ payload }) => {
                const { userId, isTyping } = payload;
                if (userId === currentUser.id) return; // Ignorar o status de digitação do próprio usuário

                // Usar participantsRef.current para acessar a lista de participantes mais recente
                const participant = participantsRef.current.find(p => p.user_id === userId);
                // Explicitamente verificar se participant e participant.profiles existem
                if (participant && participant.profiles && participant.profiles.fullName) {
                    setTypingUsers(prev => {
                        const newTypingUsers = { ...prev };
                        if (isTyping) {
                            newTypingUsers[userId] = participant.profiles!.fullName; // Non-null assertion here
                        } else {
                            delete newTypingUsers[userId];
                        }
                        return newTypingUsers;
                    });
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [chat.id, currentUser, fetchMessages, fetchParticipants, markChatAsRead]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, typingUsers]);

    const handleSendMessage = async (content: string) => {
        if (!currentUser) {
            showError('Usuário não autenticado.');
            return;
        }

        const tempMessageId = `temp-${Date.now()}`;
        const optimisticMessage: ChatMessage = {
            id: tempMessageId, // ID temporário para a atualização otimista
            chat_id: chat.id,
            sender_id: currentUser.id,
            content,
            created_at: new Date().toISOString(), // Data/hora atual
            sender: currentUser, // O remetente é o usuário atual
        };

        // Adiciona a mensagem otimisticamente ao estado
        setMessages(prev => [...prev, optimisticMessage]);

        try {
            const { data, error } = await supabase.from('messages').insert({
                chat_id: chat.id,
                sender_id: currentUser.id,
                content,
            }).select().single(); // Seleciona a mensagem inserida para obter o ID real

            if (error) throw error;

            // Se a inserção for bem-sucedida, o listener de tempo real deve pegar a mensagem real.
            // A lógica no listener foi ajustada para substituir a mensagem otimista pela real.
            // Se por algum motivo o listener não pegar, a mensagem otimista permanecerá.
            // Para garantir que a mensagem otimista seja substituída pelo ID real,
            // podemos fazer uma substituição explícita aqui também, caso o listener seja lento.
            setMessages(prev => prev.map(msg => msg.id === tempMessageId ? { ...data, sender: currentUser } : msg));

        } catch (error: any) {
            console.error('Erro ao enviar mensagem:', error);
            showError('Não foi possível enviar a mensagem: ' + error.message);
            // Remove a mensagem otimista se a inserção falhar
            setMessages(prev => prev.filter(msg => msg.id !== tempMessageId));
        }
    };

    const getChatTitle = () => {
        if (chat.is_group_chat) {
            return chat.name || 'Chat em Grupo';
        }
        // Encontra o outro participante que não seja o usuário atual
        const otherParticipant = participants.find(p => p.user_id !== currentUser.id);
        // Retorna o nome completo do outro participante, usando 'fullName'
        if (otherParticipant && otherParticipant.profiles) {
            return otherParticipant.profiles.fullName || 'Chat Individual';
        }
        return 'Chat Individual';
    };

    const typingUserNames = Object.values(typingUsers);

    return (
        <div className="flex flex-col h-full bg-gray-50 rounded-lg shadow-md">
            <div className="flex items-center p-4 bg-white border-b border-gray-200">
                <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-200 transition-colors" aria-label="Voltar">
                    <ArrowLeftIcon className="h-6 w-6 text-gray-600" />
                </button>
                <h3 className="text-xl font-bold text-text-main ml-4">{getChatTitle()}</h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {loadingMessages ? (
                    <p className="text-center text-text-light">Carregando mensagens...</p>
                ) : messages.length === 0 ? (
                    <p className="text-center text-text-light">Nenhuma mensagem ainda. Comece a conversar!</p>
                ) : (
                    messages.map(msg => (
                        <MessageBubble
                            key={msg.id}
                            message={msg}
                            isCurrentUser={msg.sender_id === currentUser.id}
                            sender={msg.sender || currentUser}
                        />
                    ))
                )}
                {typingUserNames.length > 0 && (
                    <TypingIndicator senderName={typingUserNames.join(', ')} />
                )}
                <div ref={messagesEndRef} />
            </div>

            <MessageInput chatId={chat.id} onSendMessage={handleSendMessage} />
        </div>
    );
};

export default ChatWindow;