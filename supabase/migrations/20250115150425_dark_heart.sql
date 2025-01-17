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
DROP POLICY IF EXISTS "View own team memberships" ON team_members;
DROP POLICY IF EXISTS "View team as dictionary owner" ON team_members;
DROP POLICY IF EXISTS "Manage team as dictionary owner" ON team_members;
DROP POLICY IF EXISTS "Access dictionary as owner or member" ON dictionaries;
DROP POLICY IF EXISTS "Modify dictionary as owner or editor" ON dictionaries;
DROP POLICY IF EXISTS "Access entries as owner or member" ON dictionary_entries;
DROP POLICY IF EXISTS "Modify entries as owner or editor" ON dictionary_entries;

-- Create optimized indexes
CREATE INDEX IF NOT EXISTS idx_team_members_lookup 
  ON team_members(user_id, dictionary_id);

CREATE INDEX IF NOT EXISTS idx_team_members_role_lookup 
  ON team_members(dictionary_id, role);

-- Create new, efficient policies for team_members
CREATE POLICY "Basic team member access"
  ON team_members
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    dictionary_id IN (
      SELECT id FROM dictionaries WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Team member management"
  ON team_members
  FOR ALL
  TO authenticated
  USING (
    dictionary_id IN (
      SELECT id FROM dictionaries WHERE created_by = auth.uid()
    )
  )
  WITH CHECK (
    dictionary_id IN (
      SELECT id FROM dictionaries WHERE created_by = auth.uid()
    )
  );

-- Simplified dictionary access
CREATE POLICY "Dictionary access control"
  ON dictionaries
  FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid() OR
    id IN (
      SELECT dictionary_id FROM team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Dictionary modification control"
  ON dictionaries
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid() OR
    id IN (
      SELECT dictionary_id 
      FROM team_members 
      WHERE user_id = auth.uid() AND role = 'editor'
    )
  );

-- Simplified entry access
CREATE POLICY "Entry access control"
  ON dictionary_entries
  FOR SELECT
  TO authenticated
  USING (
    dictionary_id IN (
      SELECT id FROM dictionaries WHERE created_by = auth.uid()
      UNION
      SELECT dictionary_id FROM team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Entry modification control"
  ON dictionary_entries
  FOR ALL
  TO authenticated
  USING (
    dictionary_id IN (
      SELECT id FROM dictionaries WHERE created_by = auth.uid()
      UNION
      SELECT dictionary_id 
      FROM team_members 
      WHERE user_id = auth.uid() AND role = 'editor'
    )
  );