import { useState } from 'react';
import { UserRole } from '@/types/chat';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { UserPlus } from 'lucide-react';

interface CreateUserDialogProps {
  currentUserRole: UserRole;
  onUserCreated: () => void;
}

export function CreateUserDialog({ currentUserRole, onUserCreated }: CreateUserDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Determine what roles the current user can create
  const getAvailableRoles = (): UserRole[] => {
    switch (currentUserRole) {
      case 'super_admin':
        return ['super_admin', 'admin', 'teacher', 'student'];
      case 'admin':
        return ['teacher', 'student'];
      case 'teacher':
        return ['student'];
      default:
        return [];
    }
  };

  const availableRoles = getAvailableRoles();

  // Don't show the button if user can't create anyone
  if (availableRoles.length === 0) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({
        title: "Error",
        description: "Please enter a name",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .insert({
          name: name.trim(),
          role,
          is_online: false,
          last_seen: new Date().toISOString(),
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: `${role.replace('_', ' ')} created successfully`,
      });

      setName('');
      setRole('student');
      setOpen(false);
      onUserCreated();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <UserPlus className="w-4 h-4 mr-2" />
          Add {currentUserRole === 'teacher' ? 'Student' : 'User'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter user name"
              disabled={loading}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={(value: UserRole) => setRole(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {availableRoles.map((roleOption) => (
                  <SelectItem key={roleOption} value={roleOption}>
                    {roleOption.replace('_', ' ').toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create User'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}