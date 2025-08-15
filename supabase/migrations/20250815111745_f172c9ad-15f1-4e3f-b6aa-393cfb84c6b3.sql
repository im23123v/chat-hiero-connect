-- Insert sample users for testing the chat system
INSERT INTO public.users (name, role, is_online, avatar_url) VALUES 
('Emma Wilson', 'super_admin', true, 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emma'),
('Michael Chen', 'admin', true, 'https://api.dicebear.com/7.x/avataaars/svg?seed=Michael'),
('Sarah Johnson', 'teacher', false, 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah'),
('David Rodriguez', 'teacher', true, 'https://api.dicebear.com/7.x/avataaars/svg?seed=David'),
('Alice Brown', 'student', true, 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice'),
('Tom Williams', 'student', false, 'https://api.dicebear.com/7.x/avataaars/svg?seed=Tom');