import { useState } from 'react';
import { useChat } from '@/hooks/useChat';
import { ChatSidebar } from './ChatSidebar';
import { ChatWindow } from './ChatWindow';
import { UserRoleSelector } from './UserRoleSelector';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export function ChatApp() {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  
  const {
    users,
    conversations,
    messages,
    currentUser,
    activeConversation,
    loading,
    setActiveConversation,
    sendMessage,
    startConversation,
  } = useChat(selectedUserId || '');

  // Create a refetch function for users
  const refetchUsers = async () => {
    // Force re-fetch of all data by recreating the hook
    window.location.reload();
  };

  // Show user selection if no user is selected
  if (!selectedUserId) {
    return <UserRoleSelector onSelectUser={setSelectedUserId} />;
  }

  // Show loading state
  if (loading || !currentUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8">
          <div className="flex items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-lg">Loading chat...</span>
          </div>
        </Card>
      </div>
    );
  }

  const handleSendMessage = async (content: string) => {
    if (!activeConversation) return;
    
    const conversation = conversations.find(c => c.id === activeConversation);
    if (!conversation?.other_user) return;
    
    await sendMessage(content, conversation.other_user.id);
  };

  const handleSelectConversation = (conversationId: string) => {
    setActiveConversation(conversationId);
  };

  const activeConversationData = conversations.find(
    c => c.id === activeConversation
  );

  return (
    <div className="h-screen bg-background flex">
      <ChatSidebar
        currentUser={currentUser}
        users={users}
        conversations={conversations}
        activeConversation={activeConversation}
        onSelectConversation={handleSelectConversation}
        onStartConversation={startConversation}
        onUserCreated={refetchUsers}
      />
      <ChatWindow
        messages={messages}
        currentUser={currentUser}
        otherUser={activeConversationData?.other_user}
        onSendMessage={handleSendMessage}
      />
    </div>
  );
}