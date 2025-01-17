/*
  # Fix Schema Issues

  1. Changes
    - Create users table to sync with auth.users
    - Add missing dictionary_id to entry_versions
    - Fix team_members foreign key relationships

  2. Security
    - Enable RLS on users table
    - Update RLS policies for team_members
*/

-- Create users table to sync with auth.users
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policy for users table
CREATE POLICY "Users can view their own data and team member data"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() OR
    id IN (
      SELECT user_id FROM team_members
      WHERE dictionary_id IN (
        SELECT id FROM dictionaries
        WHERE created_by = auth.uid()
      )
    )
  );

-- Add dictionary_id to entry_versions if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'entry_versions' 
    AND column_name = 'dictionary_id'
  ) THEN
    ALTER TABLE entry_versions
    ADD COLUMN dictionary_id uuid REFERENCES dictionaries(id);

    -- Update existing entry_versions with dictionary_id
    UPDATE entry_versions
    SET dictionary_id = (
      SELECT dictionary_id
      FROM dictionary_entries
      WHERE dictionary_entries.id = entry_versions.entry_id
    );

    -- Make dictionary_id NOT NULL after update
    ALTER TABLE entry_versions
    ALTER COLUMN dictionary_id SET NOT NULL;
  END IF;
END $$;

-- Create function to sync auth users to public users
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

-- Create trigger to sync auth users
DROP TRIGGER IF EXISTS sync_auth_user_trigger ON auth.users;
CREATE TRIGGER sync_auth_user_trigger
AFTER INSERT OR UPDATE ON auth.users
FOR EACH ROW
EXECUTE FUNCTION sync_auth_user();

-- Update team_members foreign keys
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

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_team_members_user_lookup 
ON team_members(user_id, dictionary_id);