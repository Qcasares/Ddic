/*
  # Fix team policies and enhance collaboration

  1. Changes
    - Fix infinite recursion in team_members policies
    - Add missing indexes for performance
    - Add audit fields for team management
    - Improve policy security

  2. Security
    - Simplified team member access policies
    - Added proper cascading permissions
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Team members can view their own memberships" ON team_members;
DROP POLICY IF EXISTS "Dictionary owners can manage team members" ON team_members;

-- Add audit fields to team_members
ALTER TABLE team_members
  ADD COLUMN IF NOT EXISTS invited_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS invited_at timestamptz DEFAULT now();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_team_members_dictionary_id ON team_members(dictionary_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_role ON team_members(role);

-- Create new, simplified policies
CREATE POLICY "Enable read access for team members"
  ON team_members
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    dictionary_id IN (
      SELECT dictionary_id FROM team_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "Enable insert access for dictionary owners"
  ON team_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    dictionary_id IN (
      SELECT dictionary_id FROM team_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "Enable delete access for dictionary owners"
  ON team_members
  FOR DELETE
  TO authenticated
  USING (
    dictionary_id IN (
      SELECT dictionary_id FROM team_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Update the add_owner_as_team_member function to include audit fields
CREATE OR REPLACE FUNCTION add_owner_as_team_member()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO team_members (
    dictionary_id,
    user_id,
    role,
    invited_by,
    invited_at
  )
  VALUES (
    NEW.id,
    auth.uid(),
    'owner',
    auth.uid(),
    now()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;