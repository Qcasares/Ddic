/*
  # Fix team policies and improve performance

  1. Changes
    - Remove circular dependencies in policies
    - Add optimized indexes
    - Simplify policy structure

  2. Security
    - Maintain existing security model
    - Improve policy efficiency
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Team members basic access" ON team_members;
DROP POLICY IF EXISTS "Dictionary owners can view all team members" ON team_members;
DROP POLICY IF EXISTS "Dictionary owners can manage team" ON team_members;
DROP POLICY IF EXISTS "Dictionary owners can remove team members" ON team_members;
DROP POLICY IF EXISTS "Team based dictionary access" ON dictionaries;
DROP POLICY IF EXISTS "Team based dictionary modification" ON dictionaries;
DROP POLICY IF EXISTS "Team based entry access" ON dictionary_entries;
DROP POLICY IF EXISTS "Team based entry modification" ON dictionary_entries;

-- Create optimized indexes
CREATE INDEX IF NOT EXISTS idx_team_members_composite 
  ON team_members(dictionary_id, user_id, role);

-- Create new, simplified policies for team_members
CREATE POLICY "View own team memberships"
  ON team_members
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "View team as dictionary owner"
  ON team_members
  FOR SELECT
  TO authenticated
  USING (
    dictionary_id IN (
      SELECT id FROM dictionaries
      WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Manage team as dictionary owner"
  ON team_members
  FOR ALL
  TO authenticated
  USING (
    dictionary_id IN (
      SELECT id FROM dictionaries
      WHERE created_by = auth.uid()
    )
  )
  WITH CHECK (
    dictionary_id IN (
      SELECT id FROM dictionaries
      WHERE created_by = auth.uid()
    )
  );

-- Simplified dictionary access policies
CREATE POLICY "Access dictionary as owner or member"
  ON dictionaries
  FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM team_members
      WHERE dictionary_id = id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Modify dictionary as owner or editor"
  ON dictionaries
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM team_members
      WHERE dictionary_id = id
      AND user_id = auth.uid()
      AND role = 'editor'
    )
  );

-- Simplified dictionary entries policies
CREATE POLICY "Access entries as owner or member"
  ON dictionary_entries
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dictionaries
      WHERE id = dictionary_id
      AND (
        created_by = auth.uid() OR
        id IN (
          SELECT dictionary_id FROM team_members
          WHERE user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Modify entries as owner or editor"
  ON dictionary_entries
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dictionaries
      WHERE id = dictionary_id
      AND (
        created_by = auth.uid() OR
        id IN (
          SELECT dictionary_id FROM team_members
          WHERE user_id = auth.uid()
          AND role = 'editor'
        )
      )
    )
  );