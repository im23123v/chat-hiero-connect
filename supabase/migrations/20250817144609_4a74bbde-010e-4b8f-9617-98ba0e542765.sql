-- Enable real-time for existing tables
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
ALTER TABLE public.users REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.users;

-- Create function to update user online status
CREATE OR REPLACE FUNCTION public.update_user_last_seen()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  UPDATE public.users 
  SET 
    last_seen = now(),
    is_online = true
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

-- Create trigger to update last_seen when user sends a message
CREATE TRIGGER update_user_activity
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_user_last_seen();