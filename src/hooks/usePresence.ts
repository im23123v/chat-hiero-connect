import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@/types/chat';

export function usePresence(currentUser: User | null) {
  const presenceChannelRef = useRef<any>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!currentUser) return;

    // Update user status to online when they connect
    const updateOnlineStatus = async (isOnline: boolean) => {
      try {
        await supabase
          .from('users')
          .update({ 
            is_online: isOnline, 
            last_seen: new Date().toISOString() 
          })
          .eq('id', currentUser.id);
      } catch (error) {
        console.error('Error updating online status:', error);
      }
    };

    // Set user as online
    updateOnlineStatus(true);

    // Create presence channel for real-time presence tracking
    const channel = supabase.channel('online-users', {
      config: {
        presence: {
          key: currentUser.id,
        },
      },
    });

    // Track presence
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          user_id: currentUser.id,
          name: currentUser.name,
          role: currentUser.role,
          online_at: new Date().toISOString(),
        });
      }
    });

    // Set up heartbeat to keep presence alive
    heartbeatIntervalRef.current = setInterval(() => {
      if (channel.socket.isConnected()) {
        updateOnlineStatus(true);
      }
    }, 30000); // Every 30 seconds

    presenceChannelRef.current = channel;

    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden) {
        updateOnlineStatus(false);
      } else {
        updateOnlineStatus(true);
      }
    };

    // Handle beforeunload to set user offline
    const handleBeforeUnload = () => {
      updateOnlineStatus(false);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      // Cleanup
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      
      updateOnlineStatus(false);
      
      if (presenceChannelRef.current) {
        presenceChannelRef.current.untrack();
        supabase.removeChannel(presenceChannelRef.current);
      }
      
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentUser?.id, currentUser?.name, currentUser?.role]);

  return null;
}
