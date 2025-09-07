-- Create chat_permissions table with proper structure
CREATE TABLE public.chat_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role TEXT NOT NULL UNIQUE,
  can_chat_with TEXT[] NOT NULL DEFAULT '{}',
  daily_message_limit INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.chat_permissions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read chat permissions (needed for checking permissions)
CREATE POLICY "Anyone can read chat permissions" 
ON public.chat_permissions 
FOR SELECT 
USING (true);

-- Only admins and super_admins can modify chat permissions
CREATE POLICY "Admins can modify chat permissions" 
ON public.chat_permissions 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.users 
  WHERE id = auth.uid() 
  AND role IN ('admin', 'super_admin')
));

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_chat_permissions_updated_at
BEFORE UPDATE ON public.chat_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default permissions for all roles
INSERT INTO public.chat_permissions (role, can_chat_with, daily_message_limit) VALUES 
('super_admin', ARRAY['super_admin', 'admin', 'teacher', 'student'], NULL),
('admin', ARRAY['super_admin', 'admin', 'teacher', 'student'], 500),
('teacher', ARRAY['admin', 'teacher', 'student'], 200),
('student', ARRAY['teacher'], 50);

-- Add table to realtime publication for instant updates
ALTER publication supabase_realtime ADD TABLE chat_permissions;