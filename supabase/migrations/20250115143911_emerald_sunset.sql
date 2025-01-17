/*
  # Add RLS policies for dictionary entries

  1. Changes
    - Add INSERT policy for dictionary entries
    - Add UPDATE policy for dictionary entries
    - Add DELETE policy for dictionary entries

  2. Security
    - Enable authenticated users to insert entries for dictionaries they own
    - Enable authenticated users to update entries for dictionaries they own
    - Enable authenticated users to delete entries for dictionaries they own
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable insert for dictionary owners" ON dictionary_entries;
DROP POLICY IF EXISTS "Enable update for dictionary owners" ON dictionary_entries;
DROP POLICY IF EXISTS "Enable delete for dictionary owners" ON dictionary_entries;

-- Create INSERT policy
CREATE POLICY "Enable insert for dictionary owners"
  ON dictionary_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM dictionaries
      WHERE id = dictionary_entries.dictionary_id
      AND created_by = auth.uid()
    )
  );

-- Create UPDATE policy
CREATE POLICY "Enable update for dictionary owners"
  ON dictionary_entries
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dictionaries
      WHERE id = dictionary_entries.dictionary_id
      AND created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM dictionaries
      WHERE id = dictionary_entries.dictionary_id
      AND created_by = auth.uid()
    )
  );

-- Create DELETE policy
CREATE POLICY "Enable delete for dictionary owners"
  ON dictionary_entries
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dictionaries
      WHERE id = dictionary_entries.dictionary_id
      AND created_by = auth.uid()
    )
  );