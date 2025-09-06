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

-- Create policies for role settings (permissive for now)
CREATE POLICY "Anyone can manage role settings" 
ON public.role_settings FOR ALL 
USING (true);

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
  granted_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(role, permission_id)
);

-- Enable RLS for permissions tables
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Permissive policies for now
CREATE POLICY "Anyone can view and manage permissions" 
ON public.permissions FOR ALL 
USING (true);

CREATE POLICY "Anyone can view and manage role permissions" 
ON public.role_permissions FOR ALL 
USING (true);

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

-- Add triggers for timestamps
CREATE TRIGGER update_role_settings_updated_at
  BEFORE UPDATE ON public.role_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable real-time for settings
ALTER TABLE public.role_settings REPLICA IDENTITY FULL;
ALTER TABLE public.role_permissions REPLICA IDENTITY FULL;