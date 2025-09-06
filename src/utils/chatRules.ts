import { UserRole } from '@/types/chat';
import { ChatRestrictions } from '@/types/permissions';

// Enhanced chat rules based on permissions and settings
export function canUsersCommunicateWithSettings(
  userRole: UserRole, 
  targetRole: UserRole, 
  chatRestrictions?: ChatRestrictions,
  hasPermission?: (permission: string) => boolean
): boolean {
  // If user has 'chat_with_any_role' permission, they can chat with anyone
  if (hasPermission?.('chat_with_any_role')) {
    return true;
  }

  // Check custom chat restrictions from settings
  if (chatRestrictions?.can_chat_with) {
    return chatRestrictions.can_chat_with.includes(targetRole);
  }

  // Fall back to default hierarchy rules
  return canUsersCommunicateDefault(userRole, targetRole);
}

// Default communication rules (original logic)
export function canUsersCommunicateDefault(userRole: UserRole, targetRole: UserRole): boolean {
  const ROLE_HIERARCHY: Record<UserRole, number> = {
    super_admin: 4,
    admin: 3,
    teacher: 2,
    student: 1,
  };

  const userLevel = ROLE_HIERARCHY[userRole];
  const targetLevel = ROLE_HIERARCHY[targetRole];
  
  // Super admin can chat with anyone
  if (userRole === 'super_admin') return true;
  
  // Students can only chat with teachers by default
  if (userRole === 'student') return targetRole === 'teacher';
  
  // Others can chat 1 level up and down
  return Math.abs(userLevel - targetLevel) <= 1;
}

// Check if user can perform an action based on permissions
export function canUserPerformAction(
  action: string,
  userRole: UserRole,
  hasPermission: (permission: string) => boolean
): boolean {
  const roleActionMap: Record<string, string[]> = {
    create_users: ['super_admin', 'admin', 'teacher'],
    manage_lower_roles: ['super_admin', 'admin'],
    access_admin_panel: ['super_admin', 'admin'],
    delete_messages: ['super_admin', 'admin'],
    ban_users: ['super_admin', 'admin'],
    modify_user_roles: ['super_admin'],
    view_all_conversations: ['super_admin', 'admin'],
    broadcast_messages: ['super_admin', 'admin']
  };

  // Check permission-based access first
  if (hasPermission(action)) {
    return true;
  }

  // Fall back to role-based access
  const allowedRoles = roleActionMap[action] || [];
  return allowedRoles.includes(userRole);
}

// Get available roles a user can create
export function getAvailableRolesToCreate(
  userRole: UserRole,
  hasPermission: (permission: string) => boolean
): UserRole[] {
  if (hasPermission('create_users')) {
    switch (userRole) {
      case 'super_admin':
        return ['super_admin', 'admin', 'teacher', 'student'];
      case 'admin':
        return ['teacher', 'student'];
      case 'teacher':
        return ['student'];
      default:
        return [];
    }
  }

  // Default role-based creation rules
  switch (userRole) {
    case 'super_admin':
      return ['admin', 'teacher', 'student'];
    case 'admin':
      return ['teacher', 'student'];
    case 'teacher':
      return ['student'];
    default:
      return [];
  }
}

// Check daily message limits
export function canSendMessage(
  userRole: UserRole,
  dailyMessageCount: number,
  chatRestrictions?: ChatRestrictions
): { canSend: boolean; reason?: string } {
  const maxMessages = chatRestrictions?.max_daily_messages;
  
  if (maxMessages === null || maxMessages === undefined) {
    return { canSend: true };
  }

  if (dailyMessageCount >= maxMessages) {
    return { 
      canSend: false, 
      reason: `Daily message limit of ${maxMessages} reached` 
    };
  }

  return { canSend: true };
}
