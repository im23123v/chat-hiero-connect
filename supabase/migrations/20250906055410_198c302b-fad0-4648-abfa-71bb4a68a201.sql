-- Create settings table for role-based configurations
CREATE TABLE public.role_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role user_role NOT NULL,
  setting_key text NOT NULL,
  setting_value jsonb NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(role, setting_key)
);

-- Enable RLS
ALTER TABLE public.role_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for role settings
CREATE POLICY "Super admins can manage all settings" 
ON public.role_settings FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.users 
  WHERE id = auth.uid() AND role = 'super_admin'
));

CREATE POLICY "Admins can manage teacher and student settings" 
ON public.role_settings FOR ALL 
USING (
  role IN ('teacher', 'student') AND 
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
  )
);

CREATE POLICY "Teachers can view their own settings" 
ON public.role_settings FOR SELECT 
USING (
  role = 'teacher' AND 
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'teacher')
  )
);

-- Create permissions table for granular control
CREATE TABLE public.permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  description text,
  category text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create role_permissions junction table
CREATE TABLE public.role_permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role user_role NOT NULL,
  permission_id uuid NOT NULL REFERENCES public.permissions(id),
  granted_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(role, permission_id)
);

-- Enable RLS for permissions tables
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Anyone can view permissions
CREATE POLICY "Anyone can view permissions" 
ON public.permissions FOR SELECT 
USING (true);

-- Anyone can view role permissions
CREATE POLICY "Anyone can view role permissions" 
ON public.role_permissions FOR SELECT 
USING (true);

-- Only super admins can manage permissions
CREATE POLICY "Super admins can manage permissions" 
ON public.permissions FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.users 
  WHERE id = auth.uid() AND role = 'super_admin'
));

-- Role permission management based on hierarchy
CREATE POLICY "Super admins can manage all role permissions" 
ON public.role_permissions FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.users 
  WHERE id = auth.uid() AND role = 'super_admin'
));

CREATE POLICY "Admins can manage teacher and student permissions" 
ON public.role_permissions FOR ALL 
USING (
  role IN ('teacher', 'student') AND 
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
  )
);

-- Insert default permissions
INSERT INTO public.permissions (name, description, category) VALUES
('chat_with_any_role', 'Can chat with users of any role', 'communication'),
('chat_cross_hierarchy', 'Can chat across role hierarchy levels', 'communication'),
('create_users', 'Can create new users', 'user_management'),
('manage_lower_roles', 'Can manage users of lower roles', 'user_management'),
('view_all_conversations', 'Can view all conversations in the system', 'administration'),
('delete_messages', 'Can delete messages', 'moderation'),
('ban_users', 'Can ban or suspend users', 'moderation'),
('modify_user_roles', 'Can modify user roles', 'administration'),
('access_admin_panel', 'Can access administrative panel', 'administration'),
('broadcast_messages', 'Can send broadcast messages to all users', 'communication');

-- Default role permissions
-- Super Admin gets all permissions
INSERT INTO public.role_permissions (role, permission_id, granted_by)
SELECT 'super_admin', id, (SELECT id FROM public.users WHERE role = 'super_admin' LIMIT 1)
FROM public.permissions;

-- Admin permissions
INSERT INTO public.role_permissions (role, permission_id, granted_by)
SELECT 'admin', id, (SELECT id FROM public.users WHERE role = 'super_admin' LIMIT 1)
FROM public.permissions 
WHERE name IN ('create_users', 'manage_lower_roles', 'chat_with_any_role', 'access_admin_panel');

-- Teacher permissions  
INSERT INTO public.role_permissions (role, permission_id, granted_by)
SELECT 'teacher', id, (SELECT id FROM public.users WHERE role = 'super_admin' LIMIT 1)
FROM public.permissions 
WHERE name IN ('create_users', 'chat_cross_hierarchy');

-- Student permissions (minimal)
INSERT INTO public.role_permissions (role, permission_id, granted_by)
SELECT 'student', id, (SELECT id FROM public.users WHERE role = 'super_admin' LIMIT 1)
FROM public.permissions 
WHERE name IN ();

-- Default role settings
INSERT INTO public.role_settings (role, setting_key, setting_value, created_by) VALUES
('super_admin', 'chat_restrictions', '{"can_chat_with": ["super_admin", "admin", "teacher", "student"], "max_daily_messages": null}', (SELECT id FROM public.users WHERE role = 'super_admin' LIMIT 1)),
('admin', 'chat_restrictions', '{"can_chat_with": ["super_admin", "admin", "teacher", "student"], "max_daily_messages": 500}', (SELECT id FROM public.users WHERE role = 'super_admin' LIMIT 1)),
('teacher', 'chat_restrictions', '{"can_chat_with": ["admin", "teacher", "student"], "max_daily_messages": 200}', (SELECT id FROM public.users WHERE role = 'super_admin' LIMIT 1)),
('student', 'chat_restrictions', '{"can_chat_with": ["teacher"], "max_daily_messages": 50}', (SELECT id FROM public.users WHERE role = 'super_admin' LIMIT 1));

-- Add triggers for timestamps
CREATE TRIGGER update_role_settings_updated_at
  BEFORE UPDATE ON public.role_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable real-time for settings
ALTER TABLE public.role_settings REPLICA IDENTITY FULL;
ALTER TABLE public.role_permissions REPLICA IDENTITY FULL;