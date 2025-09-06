-- Remove restrictive RLS policies and enable real-time for conversations
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;

-- Create permissive policies for conversations (no security as requested)
CREATE POLICY "Anyone can create conversations" 
ON public.conversations FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can view conversations" 
ON public.conversations FOR SELECT 
USING (true);

CREATE POLICY "Anyone can update conversations" 
ON public.conversations FOR UPDATE 
USING (true);

-- Update messages policies to be completely permissive
DROP POLICY IF EXISTS "Users can create any messages" ON public.messages;
DROP POLICY IF EXISTS "Users can view all messages" ON public.messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;

CREATE POLICY "Anyone can create messages" 
ON public.messages FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can view messages" 
ON public.messages FOR SELECT 
USING (true);

CREATE POLICY "Anyone can update messages" 
ON public.messages FOR UPDATE 
USING (true);

-- Enable real-time for conversations and messages
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;