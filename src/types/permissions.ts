export interface Permission {
  id: string;
  name: string;
  description?: string;
  category: string;
  created_at: string;
}

export interface RolePermission {
  id: string;
  role: string;
  permission_id: string;
  granted_by?: string;
  created_at: string;
  permission?: Permission;
}

export interface RoleSetting {
  id: string;
  role: string;
  setting_key: string;
  setting_value: any;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ChatRestrictions {
  can_chat_with: string[];
  max_daily_messages: number | null;
}

export interface PermissionContext {
  permissions: Permission[];
  rolePermissions: RolePermission[];
  roleSettings: RoleSetting[];
  hasPermission: (permissionName: string, userRole: string) => boolean;
  getChatRestrictions: (userRole: string) => ChatRestrictions;
  updateRoleSetting: (role: string, settingKey: string, value: any) => Promise<void>;
  loading: boolean;
}