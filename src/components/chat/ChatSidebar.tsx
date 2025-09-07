import { useState } from 'react';
import { User, Conversation } from '@/types/chat';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { MessageCircle, Users, Crown, GraduationCap, BookOpen, Settings } from 'lucide-react';
import { CreateUserDialog } from './CreateUserDialog';
import { AdminSettingsPanel } from './AdminSettingsPanel';
import { usePermissions } from '@/hooks/usePermissions';
import { canUserPerformAction, canUsersCommunicateWithSettings } from '@/utils/chatRules';

interface ChatSidebarProps {
  currentUser: User;
  users: User[];
  conversations: Conversation[];
  activeConversation: string | null;
  onSelectConversation: (conversationId: string) => void;
  onStartConversation: (userId: string) => void;
  onUserCreated: () => void;
}

const getRoleIcon = (role: string) => {
  switch (role) {
    case 'super_admin':
      return <Crown className="w-4 h-4 text-chat-away" />;
    case 'admin':
      return <Users className="w-4 h-4 text-chat-message-sent" />;
    case 'teacher':
      return <GraduationCap className="w-4 h-4 text-chat-online" />;
    case 'student':
      return <BookOpen className="w-4 h-4 text-muted-foreground" />;
    default:
      return null;
  }
};

const getRoleBadgeVariant = (role: string) => {
  switch (role) {
    case 'super_admin':
      return 'default';
    case 'admin':
      return 'secondary';
    case 'teacher':
      return 'outline';
    case 'student':
      return 'secondary';
    default:
      return 'secondary';
  }
};

const formatTime = (timestamp: string) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
  
  if (diffInHours < 1) {
    return 'Just now';
  } else if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  } else {
    return date.toLocaleDateString();
  }
};

export function ChatSidebar({
  currentUser,
  users,
  conversations,
  activeConversation,
  onSelectConversation,
  onStartConversation,
  onUserCreated,
}: ChatSidebarProps) {
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const { hasPermission, getChatRestrictions } = usePermissions();
  
  // Filter users based on current user's chat restrictions
  const chatRestrictions = getChatRestrictions(currentUser.role);
  const availableUsers = users.filter(user => 
    canUsersCommunicateWithSettings(
      currentUser.role, 
      user.role, 
      chatRestrictions, 
      (permission) => hasPermission(permission, currentUser.role)
    )
  );
  
  const canAccessAdminPanel = canUserPerformAction('access_admin_panel', currentUser.role, (permission) => 
    hasPermission(permission, currentUser.role)
  );
  return (
    <>
      <div className="w-80 border-r border-border bg-card h-full flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3 mb-4">
            <Avatar className="w-10 h-10">
              <AvatarImage src={currentUser.avatar_url} />
              <AvatarFallback>{currentUser.name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="font-semibold text-foreground">{currentUser.name}</h2>
              <div className="flex items-center gap-2">
                {getRoleIcon(currentUser.role)}
                <Badge variant={getRoleBadgeVariant(currentUser.role)} className="text-xs">
                  {currentUser.role.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>
            </div>
            {canAccessAdminPanel && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAdminPanel(true)}
                className="p-2"
              >
                <Settings className="w-4 h-4" />
              </Button>
            )}
          </div>
          
          {/* Add User Button */}
          <div className="px-4 pb-2">
            <CreateUserDialog 
              currentUserRole={currentUser.role} 
              onUserCreated={onUserCreated}
            />
          </div>
        </div>

      <ScrollArea className="flex-1">
        {/* Recent Conversations */}
        {conversations.length > 0 && (
          <div className="p-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              Recent Chats
            </h3>
            <div className="space-y-2">
              {conversations.map((conversation) => (
                <Card
                  key={conversation.id}
                  className={`cursor-pointer transition-all duration-200 hover:bg-chat-hover ${
                    activeConversation === conversation.id
                      ? 'bg-chat-message-sent/10 border-chat-message-sent'
                      : 'hover:shadow-sm'
                  }`}
                  onClick={() => onSelectConversation(conversation.id)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={conversation.other_user?.avatar_url} />
                        <AvatarFallback>
                          {conversation.other_user?.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm truncate">
                            {conversation.other_user?.name}
                          </span>
                          {conversation.other_user && getRoleIcon(conversation.other_user.role)}
                        </div>
                        {conversation.last_message && (
                          <p className="text-xs text-muted-foreground truncate">
                            {conversation.last_message.content}
                          </p>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatTime(conversation.last_message_at)}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            conversation.other_user?.is_online
                              ? 'bg-chat-online'
                              : 'bg-chat-offline'
                          }`}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        <Separator />

        {/* Available Users */}
        <div className="p-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Available to Chat
          </h3>
          <div className="space-y-2">
            {availableUsers.map((user) => (
              <Card
                key={user.id}
                className="cursor-pointer transition-all duration-200 hover:bg-chat-hover hover:shadow-sm"
                onClick={() => onStartConversation(user.id)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={user.avatar_url} />
                      <AvatarFallback className="text-xs">
                        {user.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm truncate">{user.name}</span>
                        {getRoleIcon(user.role)}
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            user.is_online ? 'bg-chat-online' : 'bg-chat-offline'
                          }`}
                        />
                        <span className="text-xs text-muted-foreground">
                          {user.is_online ? 'Online' : formatTime(user.last_seen)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </ScrollArea>
    </div>
    
    {/* Admin Settings Panel */}
    {showAdminPanel && (
      <AdminSettingsPanel 
        currentUser={currentUser} 
        onClose={() => setShowAdminPanel(false)} 
      />
    )}
  </>
  );
}