/*
  # Fix Dictionary RLS Policies

  1. Changes
    - Add proper RLS policies for dictionary creation and access
    - Ensure authenticated users can create dictionaries
    - Allow users to access their own dictionaries
    - Fix the created_by field to properly use auth.uid()

  2. Security
    - Enable RLS on dictionaries table
    - Add policies for CRUD operations
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated users to read dictionaries" ON dictionaries;
DROP POLICY IF EXISTS "Allow users to create dictionaries" ON dictionaries;
DROP POLICY IF EXISTS "Allow users to update their own dictionaries" ON dictionaries;

-- Create new policies
CREATE POLICY "Enable read access for authenticated users"
  ON dictionaries FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert access for authenticated users"
  ON dictionaries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Enable update access for own dictionaries"
  ON dictionaries FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Enable delete access for own dictionaries"
  ON dictionaries FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Add trigger to automatically set created_by
CREATE OR REPLACE FUNCTION set_dictionary_created_by()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS set_dictionary_created_by_trigger ON dictionaries;
CREATE TRIGGER set_dictionary_created_by_trigger
  BEFORE INSERT ON dictionaries
  FOR EACH ROW
  EXECUTE FUNCTION set_dictionary_created_by();