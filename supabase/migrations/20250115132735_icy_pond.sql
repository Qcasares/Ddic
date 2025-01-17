/*
  # Fix foreign key relationships and policies

  1. Changes
    - Add foreign key relationships for created_by and last_reviewed_by
    - Update dictionary_entries policies
*/

-- Add foreign key relationships for created_by and last_reviewed_by
ALTER TABLE dictionary_entries
  ADD CONSTRAINT fk_created_by
  FOREIGN KEY (created_by)
  REFERENCES auth.users(id);

ALTER TABLE dictionary_entries
  ADD CONSTRAINT fk_last_reviewed_by
  FOREIGN KEY (last_reviewed_by)
  REFERENCES auth.users(id);

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON dictionary_entries;

-- Create new policy
CREATE POLICY "Enable read access for authenticated users"
  ON dictionary_entries
  FOR SELECT
  TO authenticated
  USING (true);