export interface ChatPermission {
  id: string;
  role: string;
  can_chat_with: string[];
  daily_message_limit: number | null;
  created_at: string;
  updated_at: string;
}

export interface ChatPermissionContext {
  permissions: ChatPermission[];
  canChatWith: (senderRole: string, recipientRole: string) => boolean;
  getDailyMessageLimit: (role: string) => number | null;
  updateChatPermission: (role: string, canChatWith: string[], dailyLimit: number | null) => Promise<void>;
  loading: boolean;
}