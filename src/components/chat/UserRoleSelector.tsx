import { useState } from 'react';
import { UserRole } from '@/types/chat';
import { Card, CardContent } from '@/components/ui/card';
import { Crown, Users, GraduationCap, BookOpen } from 'lucide-react';

interface UserRoleSelectorProps {
  onSelectUser: (userId: string) => void;
}

const testUsers = [
  { id: '1', name: 'Super Admin', role: 'super_admin' as UserRole },
  { id: '2', name: 'Admin User', role: 'admin' as UserRole },
  { id: '3', name: 'Teacher John', role: 'teacher' as UserRole },
  { id: '4', name: 'Student Alice', role: 'student' as UserRole },
];

const getRoleIcon = (role: UserRole) => {
  switch (role) {
    case 'super_admin':
      return <Crown className="w-6 h-6 text-chat-away" />;
    case 'admin':
      return <Users className="w-6 h-6 text-chat-message-sent" />;
    case 'teacher':
      return <GraduationCap className="w-6 h-6 text-chat-online" />;
    case 'student':
      return <BookOpen className="w-6 h-6 text-muted-foreground" />;
  }
};

export function UserRoleSelector({ onSelectUser }: UserRoleSelectorProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Hierarchical Chat System
          </h1>
          <p className="text-muted-foreground">
            Select a user role to experience the chat system
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {testUsers.map((user) => (
            <Card
              key={user.id}
              className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 hover:bg-chat-hover"
              onClick={() => onSelectUser(user.id)}
            >
              <CardContent className="p-6 text-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="p-4 rounded-full bg-secondary">
                    {getRoleIcon(user.role)}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
                      {user.name}
                    </h3>
                    <p className="text-sm text-muted-foreground capitalize">
                      {user.role.replace('_', ' ')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="mt-8 p-4 bg-card rounded-lg border border-border">
          <h3 className="text-lg font-semibold mb-3">Chat Hierarchy Rules:</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• <span className="text-chat-away">Super Admin</span>: Can chat with anyone</li>
            <li>• <span className="text-chat-message-sent">Admin</span>: Can chat with Super Admin and Teachers</li>
            <li>• <span className="text-chat-online">Teacher</span>: Can chat with Admin and Students</li>
            <li>• <span className="text-foreground">Student</span>: Can only chat with Teachers</li>
          </ul>
        </div>
      </div>
    </div>
  );
}