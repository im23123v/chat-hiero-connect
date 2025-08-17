import { useState, useEffect } from 'react';
import { UserRole, User } from '@/types/chat';
import { Card, CardContent } from '@/components/ui/card';
import { Crown, Users, GraduationCap, BookOpen, Loader2, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface UserRoleSelectorProps {
  onSelectUser: (userId: string) => void;
}


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
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { signOut } = useAuth();

  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('role');
      
      if (error) {
        console.error('Error fetching users:', error);
      } else {
        setUsers(data || []);
      }
      setLoading(false);
    };

    fetchUsers();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8">
          <div className="flex items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-lg">Loading users...</span>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Welcome to EduChat</h1>
            <p className="text-muted-foreground">Select a user to start chatting</p>
          </div>
          <Button variant="outline" onClick={signOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{users.map((user) => (
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