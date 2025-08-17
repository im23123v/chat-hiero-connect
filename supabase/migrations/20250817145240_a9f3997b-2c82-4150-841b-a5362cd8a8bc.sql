-- Fix RLS policies for messaging functionality

-- Drop existing restrictive message policies
DROP POLICY IF EXISTS "Users can create messages in conversations or groups" ON public.messages;
DROP POLICY IF EXISTS "Users can view messages in their conversations or groups" ON public.messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;

-- Create simpler, working RLS policies for messages
CREATE POLICY "Users can create messages" 
ON public.messages 
FOR INSERT 
WITH CHECK (
  sender_id = (SELECT id FROM public.users WHERE id = auth.uid())
);

CREATE POLICY "Users can view conversation messages" 
ON public.messages 
FOR SELECT 
USING (
  conversation_id IN (
    SELECT id FROM public.conversations 
    WHERE participant_1 = (SELECT id FROM public.users WHERE id = auth.uid()) 
       OR participant_2 = (SELECT id FROM public.users WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can update their own messages" 
ON public.messages 
FOR UPDATE 
USING (sender_id = (SELECT id FROM public.users WHERE id = auth.uid()));

-- Fix conversation policies to be simpler
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;

CREATE POLICY "Users can create conversations" 
ON public.conversations 
FOR INSERT 
WITH CHECK (
  participant_1 = (SELECT id FROM public.users WHERE id = auth.uid()) 
  OR participant_2 = (SELECT id FROM public.users WHERE id = auth.uid())
);

CREATE POLICY "Users can view their conversations" 
ON public.conversations 
FOR SELECT 
USING (
  participant_1 = (SELECT id FROM public.users WHERE id = auth.uid()) 
  OR participant_2 = (SELECT id FROM public.users WHERE id = auth.uid())
);