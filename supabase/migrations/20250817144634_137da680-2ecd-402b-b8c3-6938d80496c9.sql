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
  WHERE id = NEW.sender_id;
  RETURN NEW;
END;
$$;

-- Create trigger to update last_seen when user sends a message (if not exists)
DROP TRIGGER IF EXISTS update_user_activity ON public.messages;
CREATE TRIGGER update_user_activity
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_user_last_seen();