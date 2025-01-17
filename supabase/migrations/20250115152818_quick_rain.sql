/*
  # Fix Database Relationships

  1. Changes
    - Create users table for auth user mapping
    - Add missing dictionary_id to entry_versions
    - Fix foreign key relationships for team_members and entries
    - Add necessary indexes for performance

  2. Security
    - Enable RLS on users table
    - Add policies for user data access
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own data" ON users;
DROP POLICY IF EXISTS "Users can view team member data" ON users;
DROP POLICY IF EXISTS "Users can view their own data and team member data" ON users;

-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY,
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create new policies
CREATE POLICY "Enable read access for own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Enable read access for team data"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT user_id FROM team_members
      WHERE dictionary_id IN (
        SELECT id FROM dictionaries
        WHERE created_by = auth.uid()
      )
    ) OR
    id IN (
      SELECT invited_by FROM team_members
      WHERE dictionary_id IN (
        SELECT id FROM dictionaries
        WHERE created_by = auth.uid()
      )
    )
  );

-- Sync existing auth users
INSERT INTO users (id, email)
SELECT id, email::text
FROM auth.users
ON CONFLICT (id) DO UPDATE
SET email = EXCLUDED.email;

-- Create sync function
CREATE OR REPLACE FUNCTION sync_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create sync trigger
DROP TRIGGER IF EXISTS sync_auth_user_trigger ON auth.users;
CREATE TRIGGER sync_auth_user_trigger
AFTER INSERT OR UPDATE ON auth.users
FOR EACH ROW
EXECUTE FUNCTION sync_auth_user();

-- Add dictionary_id to entry_versions
ALTER TABLE entry_versions
ADD COLUMN IF NOT EXISTS dictionary_id uuid REFERENCES dictionaries(id);

-- Update existing entry_versions
UPDATE entry_versions
SET dictionary_id = (
  SELECT dictionary_id
  FROM dictionary_entries
  WHERE dictionary_entries.id = entry_versions.entry_id
)
WHERE dictionary_id IS NULL;

-- Make dictionary_id NOT NULL
ALTER TABLE entry_versions
ALTER COLUMN dictionary_id SET NOT NULL;

-- Update foreign key relationships
ALTER TABLE team_members
DROP CONSTRAINT IF EXISTS team_members_user_id_fkey,
DROP CONSTRAINT IF EXISTS team_members_invited_by_fkey;

ALTER TABLE team_members
ADD CONSTRAINT team_members_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES users(id),
ADD CONSTRAINT team_members_invited_by_fkey
  FOREIGN KEY (invited_by)
  REFERENCES users(id);

ALTER TABLE dictionary_entries
DROP CONSTRAINT IF EXISTS dictionary_entries_created_by_fkey,
DROP CONSTRAINT IF EXISTS dictionary_entries_last_reviewed_by_fkey;

ALTER TABLE dictionary_entries
ADD CONSTRAINT dictionary_entries_created_by_fkey
  FOREIGN KEY (created_by)
  REFERENCES users(id),
ADD CONSTRAINT dictionary_entries_last_reviewed_by_fkey
  FOREIGN KEY (last_reviewed_by)
  REFERENCES users(id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_team_members_user_lookup 
  ON team_members(user_id, dictionary_id);
CREATE INDEX IF NOT EXISTS idx_dictionary_entries_created_by 
  ON dictionary_entries(created_by);
CREATE INDEX IF NOT EXISTS idx_entry_versions_dictionary_id
  ON entry_versions(dictionary_id);