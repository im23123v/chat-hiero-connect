-- Fix RLS policies for conversations to allow users to create conversations
-- First drop the existing policy that's causing the issue
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;

-- Create a new policy that allows users to create conversations they are part of
CREATE POLICY "Users can create conversations" 
ON conversations 
FOR INSERT 
WITH CHECK (
  -- User must be authenticated and must be one of the participants
  auth.uid() IS NOT NULL AND (
    participant_1 IN (SELECT id FROM users WHERE id = auth.uid()) OR 
    participant_2 IN (SELECT id FROM users WHERE id = auth.uid())
  )
);

-- Also ensure the messages table can handle group messages properly
-- Add policy for viewing group messages
CREATE POLICY "Users can view group messages" 
ON messages 
FOR SELECT 
USING (
  CASE 
    WHEN group_id IS NOT NULL THEN 
      EXISTS (
        SELECT 1 FROM group_members 
        WHERE group_id = messages.group_id 
        AND user_id IN (SELECT id FROM users WHERE id = auth.uid())
      )
    ELSE 
      conversation_id IN (
        SELECT id FROM conversations 
        WHERE participant_1 IN (SELECT id FROM users WHERE id = auth.uid()) 
        OR participant_2 IN (SELECT id FROM users WHERE id = auth.uid())
      )
  END
);

-- Update messages policy for creating group messages
CREATE POLICY "Users can create group messages" 
ON messages 
FOR INSERT 
WITH CHECK (
  sender_id IN (SELECT id FROM users WHERE id = auth.uid()) AND
  CASE 
    WHEN group_id IS NOT NULL THEN 
      EXISTS (
        SELECT 1 FROM group_members 
        WHERE group_id = messages.group_id 
        AND user_id IN (SELECT id FROM users WHERE id = auth.uid())
      )
    ELSE true
  END
);

-- Enable realtime for all chat-related tables
ALTER TABLE conversations REPLICA IDENTITY FULL;
ALTER TABLE messages REPLICA IDENTITY FULL;
ALTER TABLE users REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE users;