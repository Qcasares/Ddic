-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY,
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can view their own data and team member data" ON users;

-- Create new policy with a unique name
CREATE POLICY "Enable user data access" ON users
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

-- Sync existing auth users
INSERT INTO users (id, email)
SELECT id, email::text
FROM auth.users
ON CONFLICT (id) DO UPDATE
SET email = EXCLUDED.email;

-- Create or replace sync function
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

-- Recreate sync trigger
DROP TRIGGER IF EXISTS sync_auth_user_trigger ON auth.users;
CREATE TRIGGER sync_auth_user_trigger
AFTER INSERT OR UPDATE ON auth.users
FOR EACH ROW
EXECUTE FUNCTION sync_auth_user();

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

-- Update dictionary_entries foreign keys
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
CREATE INDEX IF NOT EXISTS idx_dictionary_entries_last_reviewed_by 
  ON dictionary_entries(last_reviewed_by);