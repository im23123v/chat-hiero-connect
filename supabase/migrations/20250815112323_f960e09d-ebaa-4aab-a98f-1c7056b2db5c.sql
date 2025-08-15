-- Create groups table
CREATE TABLE public.groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create group_members table
CREATE TABLE public.group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL,
  user_id UUID NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Add group_id column to messages table for group messages
ALTER TABLE public.messages 
ADD COLUMN group_id UUID;

-- Make conversation_id nullable since group messages won't have conversations
ALTER TABLE public.messages 
ALTER COLUMN conversation_id DROP NOT NULL;

-- Add constraint to ensure either conversation_id or group_id is set (but not both)
ALTER TABLE public.messages 
ADD CONSTRAINT messages_conversation_or_group_check 
CHECK ((conversation_id IS NOT NULL AND group_id IS NULL) OR (conversation_id IS NULL AND group_id IS NOT NULL));

-- Enable RLS on new tables
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- RLS policies for groups
CREATE POLICY "Users can view groups they are members of" 
ON public.groups 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.group_members 
    WHERE group_members.group_id = groups.id 
    AND group_members.user_id = (
      SELECT id FROM public.users WHERE id = auth.uid()
    )
  )
);

CREATE POLICY "Users can create groups based on role hierarchy" 
ON public.groups 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'admin', 'teacher')
  )
);

CREATE POLICY "Group admins and creators can update groups" 
ON public.groups 
FOR UPDATE 
USING (
  created_by = (SELECT id FROM public.users WHERE id = auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.group_members 
    WHERE group_members.group_id = groups.id 
    AND group_members.user_id = (SELECT id FROM public.users WHERE id = auth.uid())
    AND group_members.role = 'admin'
  )
);

-- RLS policies for group_members
CREATE POLICY "Users can view group members for groups they belong to" 
ON public.group_members 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.group_members gm 
    WHERE gm.group_id = group_members.group_id 
    AND gm.user_id = (SELECT id FROM public.users WHERE id = auth.uid())
  )
);

CREATE POLICY "Group admins can manage members" 
ON public.group_members 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = group_members.group_id 
    AND (
      g.created_by = (SELECT id FROM public.users WHERE id = auth.uid()) OR
      EXISTS (
        SELECT 1 FROM public.group_members gm 
        WHERE gm.group_id = group_members.group_id 
        AND gm.user_id = (SELECT id FROM public.users WHERE id = auth.uid())
        AND gm.role = 'admin'
      )
    )
  )
);

-- Update messages RLS to include group messages
DROP POLICY "Users can view messages in their conversations" ON public.messages;
CREATE POLICY "Users can view messages in their conversations or groups" 
ON public.messages 
FOR SELECT 
USING (
  -- Can view if it's a conversation they're part of
  (conversation_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.conversations 
    WHERE id = messages.conversation_id 
    AND (
      participant_1 = (SELECT id FROM public.users WHERE id = auth.uid()) OR 
      participant_2 = (SELECT id FROM public.users WHERE id = auth.uid())
    )
  )) OR
  -- Can view if it's a group they're member of
  (group_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.group_members 
    WHERE group_id = messages.group_id 
    AND user_id = (SELECT id FROM public.users WHERE id = auth.uid())
  ))
);

DROP POLICY "Users can create messages" ON public.messages;
CREATE POLICY "Users can create messages in conversations or groups" 
ON public.messages 
FOR INSERT 
WITH CHECK (
  -- Can send if it's a conversation they're part of
  (conversation_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.conversations 
    WHERE id = messages.conversation_id 
    AND (
      participant_1 = sender_id OR 
      participant_2 = sender_id
    )
  )) OR
  -- Can send if it's a group they're member of
  (group_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.group_members 
    WHERE group_id = messages.group_id 
    AND user_id = sender_id
  ))
);

-- Add trigger for groups updated_at
CREATE TRIGGER update_groups_updated_at
BEFORE UPDATE ON public.groups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function for user role-based creation permissions
CREATE OR REPLACE FUNCTION public.can_create_user_with_role(creator_role user_role, target_role user_role)
RETURNS BOOLEAN AS $$
BEGIN
  -- Super admin can create anyone
  IF creator_role = 'super_admin' THEN
    RETURN TRUE;
  END IF;
  
  -- Admin can create teachers and students
  IF creator_role = 'admin' AND target_role IN ('teacher', 'student') THEN
    RETURN TRUE;
  END IF;
  
  -- Teacher can create students
  IF creator_role = 'teacher' AND target_role = 'student' THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;