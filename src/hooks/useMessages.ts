import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  read: boolean;
  createdAt: Date;
  sender: {
    id: string;
    username: string;
    displayName: string;
    avatar: string;
    verified: boolean;
  };
}

export interface Conversation {
  id: string;
  participant1Id: string;
  participant2Id: string;
  lastMessageId: string | null;
  createdAt: Date;
  updatedAt: Date;
  otherParticipant: {
    id: string;
    username: string;
    displayName: string;
    avatar: string;
    verified: boolean;
  };
  lastMessage?: Message;
  unreadCount: number;
}

export const useMessages = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<{ [conversationId: string]: Message[] }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const fetchConversations = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id,
          participant_1_id,
          participant_2_id,
          last_message_id,
          created_at,
          updated_at,
          participant_1:participant_1_id (
            id,
            username,
            display_name,
            avatar_url,
            verified
          ),
          participant_2:participant_2_id (
            id,
            username,
            display_name,
            avatar_url,
            verified
          ),
          last_message:last_message_id (
            id,
            content,
            sender_id,
            read,
            created_at,
            sender:sender_id (
              id,
              username,
              display_name,
              avatar_url,
              verified
            )
          )
        `)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const formattedConversations: Conversation[] = (data || []).map(conv => {
        const otherParticipant = conv.participant_1_id === user.id 
          ? conv.participant_2 
          : conv.participant_1;

        return {
          id: conv.id,
          participant1Id: conv.participant_1_id,
          participant2Id: conv.participant_2_id,
          lastMessageId: conv.last_message_id,
          createdAt: new Date(conv.created_at),
          updatedAt: new Date(conv.updated_at),
          otherParticipant: {
            id: otherParticipant.id,
            username: otherParticipant.username,
            displayName: otherParticipant.display_name,
            avatar: otherParticipant.avatar_url || '',
            verified: otherParticipant.verified || false,
          },
          lastMessage: conv.last_message ? {
            id: conv.last_message.id,
            conversationId: conv.id,
            senderId: conv.last_message.sender_id,
            content: conv.last_message.content,
            read: conv.last_message.read,
            createdAt: new Date(conv.last_message.created_at),
            sender: {
              id: conv.last_message.sender.id,
              username: conv.last_message.sender.username,
              displayName: conv.last_message.sender.display_name,
              avatar: conv.last_message.sender.avatar_url || '',
              verified: conv.last_message.sender.verified || false,
            }
          } : undefined,
          unreadCount: 0, // Will be calculated separately
        };
      });

      // Calculate unread counts
      for (const conversation of formattedConversations) {
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conversation.id)
          .eq('read', false)
          .neq('sender_id', user.id);

        conversation.unreadCount = count || 0;
      }

      setConversations(formattedConversations);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching conversations:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchMessages = async (conversationId: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          conversation_id,
          sender_id,
          content,
          read,
          created_at,
          sender:sender_id (
            id,
            username,
            display_name,
            avatar_url,
            verified
          )
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const formattedMessages: Message[] = (data || []).map(msg => ({
        id: msg.id,
        conversationId: msg.conversation_id,
        senderId: msg.sender_id,
        content: msg.content,
        read: msg.read,
        createdAt: new Date(msg.created_at),
        sender: {
          id: msg.sender.id,
          username: msg.sender.username,
          displayName: msg.sender.display_name,
          avatar: msg.sender.avatar_url || '',
          verified: msg.sender.verified || false,
        }
      }));

      setMessages(prev => ({
        ...prev,
        [conversationId]: formattedMessages
      }));

      return formattedMessages;
    } catch (err: any) {
      console.error('Error fetching messages:', err);
      throw new Error(err.message);
    }
  };

  const sendMessage = async (conversationId: string, content: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: content.trim(),
        })
        .select(`
          id,
          conversation_id,
          sender_id,
          content,
          read,
          created_at,
          sender:sender_id (
            id,
            username,
            display_name,
            avatar_url,
            verified
          )
        `)
        .single();

      if (error) throw error;

      const newMessage: Message = {
        id: data.id,
        conversationId: data.conversation_id,
        senderId: data.sender_id,
        content: data.content,
        read: data.read,
        createdAt: new Date(data.created_at),
        sender: {
          id: data.sender.id,
          username: data.sender.username,
          displayName: data.sender.display_name,
          avatar: data.sender.avatar_url || '',
          verified: data.sender.verified || false,
        }
      };

      // Update local messages
      setMessages(prev => ({
        ...prev,
        [conversationId]: [...(prev[conversationId] || []), newMessage]
      }));

      return newMessage;
    } catch (err: any) {
      throw new Error(err.message);
    }
  };

  const createConversation = async (otherUserId: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { data, error } = await supabase.rpc('get_or_create_conversation', {
        user1_id: user.id,
        user2_id: otherUserId
      });

      if (error) throw error;

      // Refresh conversations to include the new one
      await fetchConversations();

      return data;
    } catch (err: any) {
      throw new Error(err.message);
    }
  };

  const markAsRead = async (conversationId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('messages')
        .update({ read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', user.id)
        .eq('read', false);

      if (error) throw error;

      // Update local state
      setConversations(prev =>
        prev.map(conv =>
          conv.id === conversationId
            ? { ...conv, unreadCount: 0 }
            : conv
        )
      );
    } catch (err: any) {
      console.error('Error marking messages as read:', err);
    }
  };

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user) return;

    const setupRealtimeSubscriptions = async () => {
      try {
        // Clean up existing subscription
        if (channelRef.current) {
          await channelRef.current.unsubscribe();
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }

        const channel = supabase
          .channel(`messages_user_${user.id}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'messages',
            },
            () => {
              // Refresh conversations when new message arrives
              fetchConversations();
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'conversations',
              filter: `participant_1_id=eq.${user.id}`,
            },
            () => {
              fetchConversations();
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'conversations',
              filter: `participant_2_id=eq.${user.id}`,
            },
            () => {
              fetchConversations();
            }
          );

        channelRef.current = channel;
        
        if (channel.state !== 'joined' && channel.state !== 'joining') {
          await channel.subscribe();
        }
      } catch (error) {
        console.error('Error setting up real-time subscriptions:', error);
      }
    };

    setupRealtimeSubscriptions();

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user, fetchConversations]);

  // Initial fetch
  useEffect(() => {
    if (user) {
      fetchConversations();
    } else {
      setConversations([]);
      setMessages({});
      setLoading(false);
    }
  }, [user, fetchConversations]);

  const totalUnreadCount = conversations.reduce((total, conv) => total + conv.unreadCount, 0);

  return {
    conversations,
    messages,
    loading,
    error,
    totalUnreadCount,
    fetchConversations,
    fetchMessages,
    sendMessage,
    createConversation,
    markAsRead,
  };
};