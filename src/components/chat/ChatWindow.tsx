import { useState, useRef, useEffect } from 'react';
import { Message, User } from '@/types/chat';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Send, MessageCircle } from 'lucide-react';

interface ChatWindowProps {
  messages: Message[];
  currentUser: User;
  otherUser?: User;
  onSendMessage: (content: string) => void;
}

const formatMessageTime = (timestamp: string) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export function ChatWindow({ messages, currentUser, otherUser, onSendMessage }: ChatWindowProps) {
  const [newMessage, setNewMessage] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleSendMessage = () => {
    if (newMessage.trim() && otherUser) {
      onSendMessage(newMessage.trim());
      setNewMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!otherUser) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center">
          <MessageCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Select a conversation
          </h3>
          <p className="text-muted-foreground">
            Choose someone from the sidebar to start chatting
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Chat Header */}
      <div className="p-4 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={otherUser.avatar_url} />
            <AvatarFallback>{otherUser.name.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-semibold text-foreground">{otherUser.name}</h2>
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  otherUser.is_online ? 'bg-chat-online' : 'bg-chat-offline'
                }`}
              />
              <span className="text-sm text-muted-foreground">
                {otherUser.is_online ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                No messages yet. Start the conversation!
              </p>
            </div>
          ) : (
            messages.map((message) => {
              const isOwnMessage = message.sender_id === currentUser.id;
              return (
                <div
                  key={message.id}
                  className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`flex items-start gap-2 max-w-[70%] ${
                      isOwnMessage ? 'flex-row-reverse' : 'flex-row'
                    }`}
                  >
                    <Avatar className="w-8 h-8">
                      <AvatarImage
                        src={
                          isOwnMessage ? currentUser.avatar_url : otherUser.avatar_url
                        }
                      />
                      <AvatarFallback className="text-xs">
                        {isOwnMessage
                          ? currentUser.name.slice(0, 2).toUpperCase()
                          : otherUser.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <Card
                      className={`p-3 ${
                        isOwnMessage
                          ? 'bg-chat-message-sent text-primary-foreground'
                          : 'bg-chat-message-received'
                      }`}
                    >
                      <p className="text-sm leading-relaxed">{message.content}</p>
                      <span
                        className={`text-xs mt-1 block ${
                          isOwnMessage
                            ? 'text-primary-foreground/70'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {formatMessageTime(message.created_at)}
                      </span>
                    </Card>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className="p-4 border-t border-border bg-card">
        <div className="flex items-center gap-2">
          <Input
            placeholder={`Type a message to ${otherUser.name}...`}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            className="px-3"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}