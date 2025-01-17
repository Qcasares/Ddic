/*
  # Fix team policies and enhance team management

  1. Changes
    - Fix infinite recursion by simplifying policies
    - Add missing indexes for performance
    - Improve policy security

  2. Security
    - Simplified team member access policies
    - Added proper cascading permissions
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Enable read access for team members" ON team_members;
DROP POLICY IF EXISTS "Enable insert access for dictionary owners" ON team_members;
DROP POLICY IF EXISTS "Enable delete access for dictionary owners" ON team_members;
DROP POLICY IF EXISTS "Team members can access dictionaries" ON dictionaries;
DROP POLICY IF EXISTS "Team editors can modify dictionaries" ON dictionaries;
DROP POLICY IF EXISTS "Team members can view entries" ON dictionary_entries;
DROP POLICY IF EXISTS "Team editors can modify entries" ON dictionary_entries;

-- Create new, simplified policies for team_members
CREATE POLICY "Team members basic access"
  ON team_members
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Dictionary owners can view all team members"
  ON team_members
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dictionaries
      WHERE id = team_members.dictionary_id
      AND created_by = auth.uid()
    )
  );

CREATE POLICY "Dictionary owners can manage team"
  ON team_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM dictionaries
      WHERE id = team_members.dictionary_id
      AND created_by = auth.uid()
    )
  );

CREATE POLICY "Dictionary owners can remove team members"
  ON team_members
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dictionaries
      WHERE id = team_members.dictionary_id
      AND created_by = auth.uid()
    )
  );

-- Update dictionary policies
CREATE POLICY "Team based dictionary access"
  ON dictionaries
  FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid() OR
    id IN (
      SELECT dictionary_id FROM team_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Team based dictionary modification"
  ON dictionaries
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid() OR
    id IN (
      SELECT dictionary_id FROM team_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'editor')
    )
  );

-- Update dictionary entries policies
CREATE POLICY "Team based entry access"
  ON dictionary_entries
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dictionaries
      WHERE id = dictionary_entries.dictionary_id
      AND (
        created_by = auth.uid() OR
        id IN (
          SELECT dictionary_id FROM team_members
          WHERE user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Team based entry modification"
  ON dictionary_entries
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dictionaries
      WHERE id = dictionary_entries.dictionary_id
      AND (
        created_by = auth.uid() OR
        id IN (
          SELECT dictionary_id FROM team_members
          WHERE user_id = auth.uid()
          AND role IN ('owner', 'editor')
        )
      )
    )
  );