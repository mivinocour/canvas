-- Clean setup for invitation system (starting fresh)

-- Create invitations table
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL,
  space_name TEXT NOT NULL,
  inviter_id UUID NOT NULL,
  inviter_name TEXT NOT NULL,
  inviter_email TEXT NOT NULL,
  invitee_email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('editor', 'viewer')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  UNIQUE(space_id, invitee_email)
);

-- Create space_members table
CREATE TABLE IF NOT EXISTS space_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL,
  user_id UUID NOT NULL,
  user_email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(space_id, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_invitations_invitee_email ON invitations(invitee_email);
CREATE INDEX IF NOT EXISTS idx_invitations_space_id ON invitations(space_id);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);
CREATE INDEX IF NOT EXISTS idx_space_members_space_id ON space_members(space_id);
CREATE INDEX IF NOT EXISTS idx_space_members_user_id ON space_members(user_id);

-- Enable Row Level Security
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE space_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own invitations" ON invitations
  FOR SELECT USING (
    auth.uid()::text = inviter_id::text OR
    auth.email() = invitee_email
  );

CREATE POLICY "Space owners and editors can create invitations" ON invitations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM space_members
      WHERE space_id = invitations.space_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'editor')
    )
  );

CREATE POLICY "Users can update invitations sent to them" ON invitations
  FOR UPDATE USING (auth.email() = invitee_email);

CREATE POLICY "Users can view space members for their spaces" ON space_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM space_members sm
      WHERE sm.space_id = space_members.space_id
      AND sm.user_id = auth.uid()
    )
  );

CREATE POLICY "Space owners can manage members" ON space_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM space_members
      WHERE space_id = space_members.space_id
      AND user_id = auth.uid()
      AND role = 'owner'
    )
  );

-- Function to automatically add space creator as owner
CREATE OR REPLACE FUNCTION add_space_owner()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO space_members (space_id, user_id, user_email, role)
  VALUES (NEW.id, auth.uid(), auth.email(), 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically add you as owner when you create a space
CREATE TRIGGER trigger_add_space_owner
  AFTER INSERT ON spaces
  FOR EACH ROW
  EXECUTE FUNCTION add_space_owner();