-- Fix RLS policies for conversations to allow users to create conversations without auth
-- First drop the existing policy that's causing the issue
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;

-- Create a new policy that allows users to create conversations they are part of
-- Since we removed auth, we'll make it permissive but still check participants
CREATE POLICY "Users can create conversations" 
ON conversations 
FOR INSERT 
WITH CHECK (
  participant_1 IS NOT NULL AND participant_2 IS NOT NULL AND participant_1 != participant_2
);

-- Also drop and recreate the messages policies to remove auth dependency
DROP POLICY IF EXISTS "Users can view group messages" ON messages;
DROP POLICY IF EXISTS "Users can create group messages" ON messages;
DROP POLICY IF EXISTS "Users can view conversation messages" ON messages;
DROP POLICY IF EXISTS "Users can create messages" ON messages;

-- Create new message policies without auth dependency
CREATE POLICY "Users can view all messages" 
ON messages 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create any messages" 
ON messages 
FOR INSERT 
WITH CHECK (sender_id IS NOT NULL AND content IS NOT NULL);