export type UserRole = 'super_admin' | 'admin' | 'teacher' | 'student';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  avatar_url?: string;
  is_online: boolean;
  last_seen: string;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  participant_1: string;
  participant_2: string;
  last_message_at: string;
  created_at: string;
  other_user?: User;
  last_message?: Message;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  sender?: Partial<User>;
}

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  super_admin: 4,
  admin: 3,
  teacher: 2,
  student: 1,
};

export function canUsersCommunicate(userRole: UserRole, targetRole: UserRole): boolean {
  const userLevel = ROLE_HIERARCHY[userRole];
  const targetLevel = ROLE_HIERARCHY[targetRole];
  
  // Super admin can chat with anyone
  if (userRole === 'super_admin') return true;
  
  // Students can only chat with teachers
  if (userRole === 'student') return targetRole === 'teacher';
  
  // Others can chat 1 level up and down
  return Math.abs(userLevel - targetLevel) <= 1;
}
