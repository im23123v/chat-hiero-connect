import { useState } from 'react';
import { UserRole } from '@/types/chat';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

interface RolePermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface RolePermissions {
  canAddMembers: boolean;
  canRemoveMembers: boolean;
  canCreateGroups: boolean;
  canDeleteGroups: boolean;
  canModerateMessages: boolean;
  canManageRoles: boolean;
}

const defaultPermissions: Record<UserRole, RolePermissions> = {
  super_admin: {
    canAddMembers: true,
    canRemoveMembers: true,
    canCreateGroups: true,
    canDeleteGroups: true,
    canModerateMessages: true,
    canManageRoles: true,
  },
  admin: {
    canAddMembers: true,
    canRemoveMembers: true,
    canCreateGroups: true,
    canDeleteGroups: false,
    canModerateMessages: true,
    canManageRoles: false,
  },
  teacher: {
    canAddMembers: false,
    canRemoveMembers: false,
    canCreateGroups: true,
    canDeleteGroups: false,
    canModerateMessages: true,
    canManageRoles: false,
  },
  student: {
    canAddMembers: false,
    canRemoveMembers: false,
    canCreateGroups: false,
    canDeleteGroups: false,
    canModerateMessages: false,
    canManageRoles: false,
  },
};

export function RolePermissionsDialog({ open, onOpenChange }: RolePermissionsDialogProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole>('student');
  const [allowedRoles, setAllowedRoles] = useState<UserRole[]>(['teacher']);
  const [permissions, setPermissions] = useState<RolePermissions>(defaultPermissions[selectedRole]);

  const handleRoleChange = (role: UserRole) => {
    setSelectedRole(role);
    setPermissions(defaultPermissions[role]);
  };

  const handlePermissionChange = (permission: keyof RolePermissions, checked: boolean) => {
    setPermissions(prev => ({
      ...prev,
      [permission]: checked
    }));
  };

  const toggleAllowedRole = (role: UserRole) => {
    setAllowedRoles(prev => 
      prev.includes(role) 
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  const handleSave = () => {
    // Here you would save the role permissions to your backend/state
    console.log('Saving role permissions:', {
      role: selectedRole,
      allowedRoles,
      permissions
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Role & Permissions Settings</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Role Selection */}
          <div className="space-y-2">
            <Label>Configure Role</Label>
            <Select value={selectedRole} onValueChange={handleRoleChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="super_admin">Super Admin</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="teacher">Teacher</SelectItem>
                <SelectItem value="student">Student</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Role Interactions */}
          <div className="space-y-3">
            <Label>Can interact with roles:</Label>
            <div className="grid grid-cols-2 gap-3">
              {(['super_admin', 'admin', 'teacher', 'student'] as UserRole[]).map((role) => (
                <div key={role} className="flex items-center space-x-2">
                  <Checkbox
                    id={`role-${role}`}
                    checked={allowedRoles.includes(role)}
                    onCheckedChange={() => toggleAllowedRole(role)}
                  />
                  <Label htmlFor={`role-${role}`} className="text-sm capitalize">
                    {role.replace('_', ' ')}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Permissions */}
          <div className="space-y-3">
            <Label>Permissions:</Label>
            <div className="space-y-2">
              {Object.entries({
                canAddMembers: 'Can add members',
                canRemoveMembers: 'Can remove members',
                canCreateGroups: 'Can create groups',
                canDeleteGroups: 'Can delete groups',
                canModerateMessages: 'Can moderate messages',
                canManageRoles: 'Can manage roles'
              }).map(([key, label]) => (
                <div key={key} className="flex items-center space-x-2">
                  <Checkbox
                    id={key}
                    checked={permissions[key as keyof RolePermissions]}
                    onCheckedChange={(checked) => 
                      handlePermissionChange(key as keyof RolePermissions, !!checked)
                    }
                  />
                  <Label htmlFor={key} className="text-sm">
                    {label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}