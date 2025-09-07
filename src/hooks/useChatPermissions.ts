import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ChatPermission } from '@/types/chatPermissions';
import { toast } from '@/hooks/use-toast';

export function useChatPermissions() {
  const [permissions, setPermissions] = useState<ChatPermission[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all chat permissions
  const fetchPermissions = useCallback(async () => {
    const { data, error } = await supabase
      .from('chat_permissions')
      .select('*')
      .order('role', { ascending: true });

    if (error) {
      console.error('Error fetching chat permissions:', error);
      return;
    }

    setPermissions(data || []);
  }, []);

  // Check if a role can chat with another role
  const canChatWith = useCallback((senderRole: string, recipientRole: string): boolean => {
    const senderPermission = permissions.find(p => p.role === senderRole);
    if (!senderPermission) return false;
    
    return senderPermission.can_chat_with.includes(recipientRole);
  }, [permissions]);

  // Get daily message limit for a role
  const getDailyMessageLimit = useCallback((role: string): number | null => {
    const permission = permissions.find(p => p.role === role);
    return permission?.daily_message_limit || null;
  }, [permissions]);

  // Update chat permission for a role
  const updateChatPermission = useCallback(async (
    role: string, 
    canChatWith: string[], 
    dailyLimit: number | null
  ) => {
    try {
      console.log('Updating chat permission:', { role, canChatWith, dailyLimit });
      
      const { error } = await supabase
        .from('chat_permissions')
        .update({
          can_chat_with: canChatWith,
          daily_message_limit: dailyLimit
        })
        .eq('role', role);

      if (error) {
        console.error('Supabase error updating chat permission:', error);
        toast({
          title: "Error",
          description: `Failed to update chat permission: ${error.message}`,
          variant: "destructive"
        });
        return;
      }

      console.log('Chat permission updated successfully');
      await fetchPermissions();
      
      toast({
        title: "Success",
        description: "Chat permissions updated successfully"
      });
    } catch (error) {
      console.error('Unexpected error in updateChatPermission:', error);
      toast({
        title: "Error",
        description: "Something went wrong while updating permissions",
        variant: "destructive"
      });
    }
  }, [fetchPermissions]);

  // Set up real-time subscriptions
  useEffect(() => {
    const permissionsChannel = supabase
      .channel('chat-permissions-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_permissions',
        },
        () => {
          console.log('Chat permissions changed, refetching...');
          fetchPermissions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(permissionsChannel);
    };
  }, [fetchPermissions]);

  // Initial data fetch
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      await fetchPermissions();
      setLoading(false);
    };

    initializeData();
  }, [fetchPermissions]);

  return {
    permissions,
    canChatWith,
    getDailyMessageLimit,
    updateChatPermission,
    loading
  };
}