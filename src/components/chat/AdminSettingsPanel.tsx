import { useState } from 'react';
import { useChatPermissions } from '@/hooks/useChatPermissions';
import { User, UserRole } from '@/types/chat';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Settings, Users, MessageSquare, Shield } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface AdminSettingsPanelProps {
  currentUser: User;
  onClose: () => void;
}

export function AdminSettingsPanel({ currentUser, onClose }: AdminSettingsPanelProps) {
  const { permissions, updateChatPermission, loading } = useChatPermissions();
  const [activeTab, setActiveTab] = useState<'chat' | 'permissions' | 'users'>('chat');

  const roles: UserRole[] = ['super_admin', 'admin', 'teacher', 'student'];

  const handleChatPermissionUpdate = async (role: UserRole, canChatWith: string[], dailyLimit: number | null) => {
    try {
      console.log('Updating chat permissions:', { role, canChatWith, dailyLimit });
      await updateChatPermission(role, canChatWith, dailyLimit);
    } catch (error) {
      console.error('Error updating chat permissions:', error);
      toast({
        title: "Error",
        description: "Failed to update chat permissions",
        variant: "destructive"
      });
    }
  };

  const RoleChatSettings = ({ role }: { role: UserRole }) => {
    const rolePermission = permissions.find(p => p.role === role);
    const [canChatWith, setCanChatWith] = useState<string[]>(() => rolePermission?.can_chat_with || []);
    const [dailyLimit, setDailyLimit] = useState<number | null>(() => rolePermission?.daily_message_limit || null);

    const handleAllowedRolesChange = (targetRole: UserRole, allowed: boolean) => {
      try {
        console.log('Changing allowed roles:', { targetRole, allowed, currentCanChatWith: canChatWith });
        
        const newCanChatWith = allowed 
          ? [...canChatWith, targetRole]
          : canChatWith.filter(r => r !== targetRole);
        
        const uniqueCanChatWith = [...new Set(newCanChatWith)];
        
        console.log('New can chat with:', uniqueCanChatWith);
        setCanChatWith(uniqueCanChatWith);
        handleChatPermissionUpdate(role, uniqueCanChatWith, dailyLimit);
      } catch (error) {
        console.error('Error in handleAllowedRolesChange:', error);
      }
    };

    const handleMessageLimitChange = (limit: number | null) => {
      try {
        console.log('Changing message limit:', { role, limit, currentLimit: dailyLimit });
        setDailyLimit(limit);
        handleChatPermissionUpdate(role, canChatWith, limit);
      } catch (error) {
        console.error('Error in handleMessageLimitChange:', error);
      }
    };

    return (
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Badge variant="outline">{role.replace('_', ' ').toUpperCase()}</Badge>
            Chat Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-3 block">Can Chat With:</Label>
            <div className="grid grid-cols-2 gap-2">
              {roles.map(targetRole => (
                <div key={targetRole} className="flex items-center justify-between p-2 border rounded">
                  <span className="text-sm">{targetRole.replace('_', ' ')}</span>
                  <Switch
                    checked={canChatWith.includes(targetRole)}
                    onCheckedChange={(checked) => handleAllowedRolesChange(targetRole, checked)}
                  />
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <Label htmlFor={`${role}-limit`} className="text-sm font-medium">
              Daily Message Limit
            </Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                id={`${role}-limit`}
                type="number"
                value={dailyLimit || ''}
                onChange={(e) => {
                  const value = e.target.value ? parseInt(e.target.value) : null;
                  handleMessageLimitChange(value);
                }}
                placeholder="No limit"
                className="flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleMessageLimitChange(null)}
              >
                No Limit
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <Card className="w-96 p-8">
          <div className="text-center">Loading settings...</div>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Settings className="w-5 h-5" />
              Admin Settings Panel
            </CardTitle>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
          
          <div className="flex gap-2 mt-4">
            <Button
              variant={activeTab === 'chat' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('chat')}
              className="flex items-center gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              Chat Rules
            </Button>
            <Button
              variant={activeTab === 'permissions' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('permissions')}
              className="flex items-center gap-2"
            >
              <Shield className="w-4 h-4" />
              Permissions
            </Button>
            <Button
              variant={activeTab === 'users' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('users')}
              className="flex items-center gap-2"
            >
              <Users className="w-4 h-4" />
              User Management
            </Button>
          </div>
        </CardHeader>

        <CardContent className="overflow-y-auto max-h-[70vh]">
          {activeTab === 'chat' && (
            <div>
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Chat Communication Rules</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Configure who can chat with whom and set message limits for each role.
                </p>
              </div>
              
              {roles.map(role => (
                <RoleChatSettings key={role} role={role} />
              ))}
            </div>
          )}

          {activeTab === 'permissions' && (
            <div>
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Role Permissions</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Manage what actions each role can perform in the system.
                </p>
              </div>
              
              <Card>
                <CardContent className="p-6">
                  <div className="text-center text-muted-foreground">
                    Permission management panel coming soon...
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'users' && (
            <div>
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">User Management</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Manage user accounts and role assignments.
                </p>
              </div>
              
              <Card>
                <CardContent className="p-6">
                  <div className="text-center text-muted-foreground">
                    User management panel coming soon...
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}