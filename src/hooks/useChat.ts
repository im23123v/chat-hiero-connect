import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Conversation, Message } from '@/types/chat';
import { canUsersCommunicateWithSettings, canSendMessage } from '@/utils/chatRules';
import { useChatPermissions } from '@/hooks/useChatPermissions';
import { usePermissions } from '@/hooks/usePermissions';
import { toast } from '@/hooks/use-toast';

export function useChat(currentUserId: string) {
  const { canChatWith, getDailyMessageLimit } = useChatPermissions();
  const { hasPermission, getChatRestrictions } = usePermissions();
  const [users, setUsers] = useState<User[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch current user
  const fetchCurrentUser = useCallback(async () => {
    if (!currentUserId || currentUserId.trim() === '') {
      setCurrentUser(null);
      return;
    }

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', currentUserId)
      .maybeSingle();
    
    if (error) {
      console.error('Error fetching current user:', error);
      setCurrentUser(null);
      return;
    }
    
    setCurrentUser(data);
  }, [currentUserId]);

  // Fetch all users that current user can communicate with
  const fetchUsers = useCallback(async () => {
    if (!currentUser) return;
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .neq('id', currentUserId);
    
    if (error) {
      console.error('Error fetching users:', error);
      return;
    }
    
    // Filter users based on enhanced chat rules
    const allowedUsers = data.filter(user => {
      const chatRestrictions = getChatRestrictions(currentUser.role);
      const hasPermissionFn = (permission: string) => hasPermission(permission, currentUser.role);
      return canUsersCommunicateWithSettings(
        currentUser.role, 
        user.role, 
        chatRestrictions, 
        hasPermissionFn
      );
    });
    
    setUsers(allowedUsers);
  }, [currentUser, currentUserId]);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    if (!currentUserId) return;

    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .or(`participant_1.eq.${currentUserId},participant_2.eq.${currentUserId}`)
      .order('last_message_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching conversations:', error);
      return;
    }
    
    // Get other participants and last messages
    const conversationsWithDetails = await Promise.all(
      data.map(async (conv) => {
        const otherUserId = conv.participant_1 === currentUserId ? conv.participant_2 : conv.participant_1;
        
        const { data: otherUser } = await supabase
          .from('users')
          .select('*')
          .eq('id', otherUserId)
          .maybeSingle();
        
        const { data: lastMessage } = await supabase
          .from('messages')
          .select(`
            *,
            sender:users!messages_sender_id_fkey (name, role)
          `)
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        return {
          ...conv,
          other_user: otherUser,
          last_message: lastMessage,
        } as Conversation;
      })
    );
    
    setConversations(conversationsWithDetails);
  }, [currentUserId]);

  // Fetch messages for active conversation
  const fetchMessages = useCallback(async (conversationId: string) => {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:users!messages_sender_id_fkey (name, role)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Error fetching messages:', error);
      return;
    }
    
    setMessages(data as Message[]);
  }, []);

  // Send a message
  const sendMessage = useCallback(async (content: string, recipientId: string) => {
    if (!currentUser) return;
    
    // Get recipient user data to check communication permissions
    const { data: recipient } = await supabase
      .from('users')
      .select('*')
      .eq('id', recipientId)
      .maybeSingle();
    
    if (!recipient) {
      toast({
        title: "Error",
        description: "Recipient not found",
        variant: "destructive",
      });
      return;
    }
    
    // Check chat permissions using new system
    if (!canChatWith(currentUser.role, recipient.role)) {
      toast({
        title: "Chat Restricted",
        description: `You cannot chat with ${recipient.role.replace('_', ' ')}s according to your role permissions`,
        variant: "destructive"
      });
      return;
    }

    // Check daily message limit
    const dailyLimit = getDailyMessageLimit(currentUser.role);
    if (dailyLimit !== null) {
      // For simplicity, we'll just show a warning if there's a limit
      // In a real app, you'd track daily message counts
      console.log(`Daily message limit for ${currentUser.role}: ${dailyLimit}`);
    }
    
    try {
      // Check if conversation exists
      let conversationId: string;
      const existingConv = conversations.find(conv => 
        (conv.participant_1 === currentUserId && conv.participant_2 === recipientId) ||
        (conv.participant_1 === recipientId && conv.participant_2 === currentUserId)
      );
      
      if (existingConv) {
        conversationId = existingConv.id;
      } else {
        // Create new conversation
        const { data: newConv, error: convError } = await supabase
          .from('conversations')
          .insert({
            participant_1: currentUserId,
            participant_2: recipientId,
            last_message_at: new Date().toISOString()
          })
          .select()
          .single();
        
        if (convError) {
          console.error('Error creating conversation:', convError);
          toast({
            title: "Error",
            description: "Failed to create conversation. Please try again.",
            variant: "destructive",
          });
          return;
        }
        
        conversationId = newConv.id;
      }
      
      // Send message
      const { error: msgError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: currentUserId,
          content,
          is_read: false
        });
      
      if (msgError) {
        console.error('Error sending message:', msgError);
        toast({
          title: "Error",
          description: "Failed to send message. Please try again.",
          variant: "destructive",
        });
        return;
      }
      
      // Update conversation timestamp
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId);
      
      toast({
        title: "Message sent",
        description: "Your message has been delivered",
      });
      
      // Refresh data
      await fetchConversations();
      if (activeConversation === conversationId) {
        await fetchMessages(conversationId);
      }
      
    } catch (error) {
      console.error('Error in sendMessage:', error);
      toast({
        title: "Error", 
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  }, [currentUser, conversations, currentUserId, activeConversation, fetchConversations, fetchMessages, canChatWith, getDailyMessageLimit]);

  // Start conversation with user
  const startConversation = useCallback(async (userId: string) => {
    if (!currentUser) return;
    
    // Get target user data to check communication permissions
    const { data: targetUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    
    if (!targetUser) {
      toast({
        title: "Error",
        description: "User not found",
        variant: "destructive",
      });
      return;
    }

    // Check chat permissions using new system
    if (!canChatWith(currentUser.role, targetUser.role)) {
      toast({
        title: "Communication Restricted",
        description: `You are not allowed to start conversations with ${targetUser.role.replace('_', ' ')}s based on current settings`,
        variant: "destructive",
      });
      return;
    }

    try {
      
      // Check if conversation already exists
      const existingConv = conversations.find(conv => 
        (conv.participant_1 === currentUserId && conv.participant_2 === userId) ||
        (conv.participant_1 === userId && conv.participant_2 === currentUserId)
      );
      
      if (existingConv) {
        setActiveConversation(existingConv.id);
        fetchMessages(existingConv.id);
        return;
      }
      
      // Create new conversation
      const { data: newConv, error } = await supabase
        .from('conversations')
        .insert({
          participant_1: currentUserId,
          participant_2: userId,
          last_message_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error creating conversation:', error);
        toast({
          title: "Error",
          description: "Failed to start conversation. Please try again.",
          variant: "destructive",
        });
        return;
      }
      
      setActiveConversation(newConv.id);
      fetchMessages(newConv.id);
      fetchConversations(); // Refresh conversations list
      
    } catch (error) {
      console.error('Error in startConversation:', error);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.", 
        variant: "destructive",
      });
    }
  }, [currentUser, conversations, currentUserId, fetchMessages, fetchConversations, canChatWith]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!currentUserId) return;

    // Enhanced real-time channel with better filtering
    const realtimeChannel = supabase
      .channel(`chat-${currentUserId}`, {
        config: {
          broadcast: { self: true },
          presence: { key: currentUserId }
        }
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          const newMessage = payload.new as Message;
          
          // Check if message is relevant to current user
          const isRelevant = await checkMessageRelevance(newMessage.conversation_id);
          if (!isRelevant) return;
          
          // Fetch sender info for the new message
          const { data: sender } = await supabase
            .from('users')
            .select('name, role')
            .eq('id', newMessage.sender_id)
            .maybeSingle();

          const messageWithSender = {
            ...newMessage,
            sender: sender
          } as Message;
          
          // Add to current conversation if it matches
          if (newMessage.conversation_id === activeConversation) {
            setMessages(prev => {
              // Prevent duplicates
              const exists = prev.some(msg => msg.id === newMessage.id);
              if (exists) return prev;
              return [...prev, messageWithSender];
            });
          }
          
          // Refresh conversations to update last message
          fetchConversations();
          
          // Show notification for new messages not in active conversation
          if (newMessage.conversation_id !== activeConversation && newMessage.sender_id !== currentUserId) {
            toast({
              title: "New message",
              description: `Message from ${sender?.name || 'Unknown'}`,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversations',
        },
        (payload) => {
          const newConv = payload.new as any;
          // Check if this conversation involves current user
          if (newConv.participant_1 === currentUserId || newConv.participant_2 === currentUserId) {
            fetchConversations();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
        },
        (payload) => {
          const updatedConv = payload.new as any;
          // Check if this conversation involves current user
          if (updatedConv.participant_1 === currentUserId || updatedConv.participant_2 === currentUserId) {
            fetchConversations();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
        },
        (payload) => {
          const updatedUser = payload.new as User;
          
          // Update users list
          setUsers(prev => 
            prev.map(user => 
              user.id === updatedUser.id 
                ? { ...user, is_online: updatedUser.is_online, last_seen: updatedUser.last_seen }
                : user
            )
          );
          
          // Update conversations list
          setConversations(prev => 
            prev.map(conv => 
              conv.other_user?.id === updatedUser.id
                ? { 
                    ...conv, 
                    other_user: { 
                      ...conv.other_user, 
                      is_online: updatedUser.is_online, 
                      last_seen: updatedUser.last_seen 
                    } 
                  }
                : conv
            )
          );
          
          // Update current user if it's them
          if (updatedUser.id === currentUserId) {
            setCurrentUser(prev => prev ? { ...prev, ...updatedUser } : null);
          }
        }
      )
      .subscribe();

    // Helper function to check if message is relevant to current user
    const checkMessageRelevance = async (conversationId: string) => {
      const { data } = await supabase
        .from('conversations')
        .select('participant_1, participant_2')
        .eq('id', conversationId)
        .maybeSingle();
      
      return data && (data.participant_1 === currentUserId || data.participant_2 === currentUserId);
    };

    return () => {
      supabase.removeChannel(realtimeChannel);
    };
  }, [activeConversation, fetchConversations, currentUserId]);

  // Initial data fetch
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      await fetchCurrentUser();
      setLoading(false);
    };
    
    initializeData();
  }, [fetchCurrentUser]);

  useEffect(() => {
    if (currentUser) {
      fetchUsers();
      fetchConversations();
    }
  }, [currentUser, fetchUsers, fetchConversations]);

  useEffect(() => {
    if (activeConversation) {
      fetchMessages(activeConversation);
    }
  }, [activeConversation, fetchMessages]);

  return {
    users,
    conversations,
    messages,
    currentUser,
    activeConversation,
    loading,
    setActiveConversation,
    sendMessage,
    startConversation,
    fetchMessages,
  };
}