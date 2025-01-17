/*
  # Fix policy recursion issues

  1. Changes
    - Remove circular dependencies in policies
    - Simplify policy structure
    - Optimize query performance

  2. Security
    - Maintain existing security model
    - Fix infinite recursion in policies
*/

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Basic team member access" ON team_members;
DROP POLICY IF EXISTS "Team member management" ON team_members;
DROP POLICY IF EXISTS "Dictionary access control" ON dictionaries;
DROP POLICY IF EXISTS "Dictionary modification control" ON dictionaries;
DROP POLICY IF EXISTS "Entry access control" ON dictionary_entries;
DROP POLICY IF EXISTS "Entry modification control" ON dictionary_entries;

-- Create new, simplified policies for dictionaries
CREATE POLICY "Enable read access for all authenticated users"
  ON dictionaries
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for authenticated users"
  ON dictionaries
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Enable update for owners"
  ON dictionaries
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Enable delete for owners"
  ON dictionaries
  FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Create new policies for team_members
CREATE POLICY "View team memberships"
  ON team_members
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM dictionaries
      WHERE id = team_members.dictionary_id
      AND created_by = auth.uid()
    )
  );

CREATE POLICY "Manage team members"
  ON team_members
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dictionaries
      WHERE id = team_members.dictionary_id
      AND created_by = auth.uid()
    )
  );

-- Create new policies for dictionary_entries
CREATE POLICY "View dictionary entries"
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
          SELECT dictionary_id 
          FROM team_members 
          WHERE user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Modify dictionary entries"
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
          SELECT dictionary_id 
          FROM team_members 
          WHERE user_id = auth.uid()
          AND role = 'editor'
        )
      )
    )
  );