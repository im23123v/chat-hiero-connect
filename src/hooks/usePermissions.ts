import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Permission, RolePermission, RoleSetting, ChatRestrictions } from '@/types/permissions';
import { UserRole } from '@/types/chat';
import { toast } from '@/hooks/use-toast';

export function usePermissions() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [roleSettings, setRoleSettings] = useState<RoleSetting[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all permissions
  const fetchPermissions = useCallback(async () => {
    const { data, error } = await supabase
      .from('permissions')
      .select('*')
      .order('category', { ascending: true });

    if (error) {
      console.error('Error fetching permissions:', error);
      return;
    }

    setPermissions(data || []);
  }, []);

  // Fetch role permissions
  const fetchRolePermissions = useCallback(async () => {
    const { data, error } = await supabase
      .from('role_permissions')
      .select(`
        *,
        permission:permissions(*)
      `);

    if (error) {
      console.error('Error fetching role permissions:', error);
      return;
    }

    setRolePermissions(data || []);
  }, []);

  // Fetch role settings
  const fetchRoleSettings = useCallback(async () => {
    const { data, error } = await supabase
      .from('role_settings')
      .select('*');

    if (error) {
      console.error('Error fetching role settings:', error);
      return;
    }

    setRoleSettings(data || []);
  }, []);

  // Check if a role has a specific permission
  const hasPermission = useCallback((permissionName: string, userRole: string): boolean => {
    const rolePerms = rolePermissions.filter(rp => rp.role === userRole);
    return rolePerms.some(rp => 
      rp.permission && rp.permission.name === permissionName
    );
  }, [rolePermissions]);

  // Get chat restrictions for a role
  const getChatRestrictions = useCallback((userRole: string): ChatRestrictions => {
    const setting = roleSettings.find(rs => 
      rs.role === userRole && rs.setting_key === 'chat_restrictions'
    );

    if (setting && setting.setting_value) {
      return setting.setting_value as ChatRestrictions;
    }

    // Default restrictions based on role
    const defaultRestrictions: Record<UserRole, ChatRestrictions> = {
      super_admin: { can_chat_with: ['super_admin', 'admin', 'teacher', 'student'], max_daily_messages: null },
      admin: { can_chat_with: ['super_admin', 'admin', 'teacher', 'student'], max_daily_messages: 500 },
      teacher: { can_chat_with: ['admin', 'teacher', 'student'], max_daily_messages: 200 },
      student: { can_chat_with: ['teacher'], max_daily_messages: 50 }
    };

    return defaultRestrictions[userRole as UserRole] || defaultRestrictions.student;
  }, [roleSettings]);

  // Update a role setting
  const updateRoleSetting = useCallback(async (role: string, settingKey: string, value: any) => {
    try {
      const { error } = await supabase
        .from('role_settings')
        .upsert({
          role: role as UserRole,
          setting_key: settingKey,
          setting_value: value,
          created_by: 'system' // This should be the current user's ID in a real app
        });

      if (error) {
        console.error('Error updating role setting:', error);
        toast({
          title: "Error",
          description: "Failed to update role setting",
          variant: "destructive"
        });
        return;
      }

      await fetchRoleSettings();
      
      toast({
        title: "Success",
        description: "Role setting updated successfully"
      });
    } catch (error) {
      console.error('Error in updateRoleSetting:', error);
      toast({
        title: "Error",
        description: "Something went wrong",
        variant: "destructive"
      });
    }
  }, [fetchRoleSettings]);

  // Set up real-time subscriptions
  useEffect(() => {
    const permissionsChannel = supabase
      .channel('permissions-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'role_permissions',
        },
        () => {
          fetchRolePermissions();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'role_settings',
        },
        () => {
          fetchRoleSettings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(permissionsChannel);
    };
  }, [fetchRolePermissions, fetchRoleSettings]);

  // Initial data fetch
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      await Promise.all([
        fetchPermissions(),
        fetchRolePermissions(),
        fetchRoleSettings()
      ]);
      setLoading(false);
    };

    initializeData();
  }, [fetchPermissions, fetchRolePermissions, fetchRoleSettings]);

  return {
    permissions,
    rolePermissions,
    roleSettings,
    hasPermission,
    getChatRestrictions,
    updateRoleSetting,
    loading
  };
}