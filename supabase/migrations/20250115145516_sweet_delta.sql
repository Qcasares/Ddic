/*
  # Add team collaboration features

  1. New Tables
    - `team_members`
      - `id` (uuid, primary key)
      - `dictionary_id` (uuid, references dictionaries)
      - `user_id` (uuid, references auth.users)
      - `role` (text, enum: owner, editor, viewer)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `team_members` table
    - Add policies for team member management
    - Add policies for dictionary access based on team membership
*/

-- Create team_members table
CREATE TABLE IF NOT EXISTS team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dictionary_id uuid REFERENCES dictionaries(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(dictionary_id, user_id)
);

-- Enable RLS
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Policies for team_members table
CREATE POLICY "Team members can view their own memberships"
  ON team_members
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR
    auth.uid() IN (
      SELECT user_id 
      FROM team_members 
      WHERE dictionary_id = team_members.dictionary_id 
      AND role IN ('owner', 'editor')
    )
  );

CREATE POLICY "Dictionary owners can manage team members"
  ON team_members
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE dictionary_id = team_members.dictionary_id
      AND user_id = auth.uid()
      AND role = 'owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE dictionary_id = team_members.dictionary_id
      AND user_id = auth.uid()
      AND role = 'owner'
    )
  );

-- Update dictionary policies to include team access
CREATE POLICY "Team members can access dictionaries"
  ON dictionaries
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE dictionary_id = dictionaries.id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Team editors can modify dictionaries"
  ON dictionaries
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE dictionary_id = dictionaries.id
      AND user_id = auth.uid()
      AND role IN ('owner', 'editor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE dictionary_id = dictionaries.id
      AND user_id = auth.uid()
      AND role IN ('owner', 'editor')
    )
  );

-- Update dictionary_entries policies to include team access
CREATE POLICY "Team members can view entries"
  ON dictionary_entries
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE dictionary_id = dictionary_entries.dictionary_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Team editors can modify entries"
  ON dictionary_entries
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE dictionary_id = dictionary_entries.dictionary_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'editor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE dictionary_id = dictionary_entries.dictionary_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'editor')
    )
  );

-- Function to automatically add owner as team member
CREATE OR REPLACE FUNCTION add_owner_as_team_member()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO team_members (dictionary_id, user_id, role)
  VALUES (NEW.id, auth.uid(), 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to add owner as team member
CREATE TRIGGER add_owner_as_team_member_trigger
  AFTER INSERT ON dictionaries
  FOR EACH ROW
  EXECUTE FUNCTION add_owner_as_team_member();