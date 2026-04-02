-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can view space members for their spaces" ON space_members;
DROP POLICY IF EXISTS "Space owners can manage members" ON space_members;
DROP POLICY IF EXISTS "Space owners and editors can create invitations" ON invitations;

-- Create simpler, non-recursive policies

-- For space_members table
CREATE POLICY "Users can view space members" ON space_members
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert themselves as members" ON space_members
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- For invitations table
CREATE POLICY "Users can create invitations for their own spaces" ON invitations
  FOR INSERT WITH CHECK (inviter_id = auth.uid());

-- Add a function to check if user owns a space (simpler approach)
CREATE OR REPLACE FUNCTION user_owns_space(space_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM spaces
    WHERE id = space_id
    AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update invitation policy to use the function
DROP POLICY IF EXISTS "Users can create invitations for their own spaces" ON invitations;
CREATE POLICY "Space owners can create invitations" ON invitations
  FOR INSERT WITH CHECK (user_owns_space(space_id));