-- Add foreign key relationship for created_by in entry_versions
ALTER TABLE entry_versions
DROP CONSTRAINT IF EXISTS entry_versions_created_by_fkey;

ALTER TABLE entry_versions
ADD CONSTRAINT entry_versions_created_by_fkey
FOREIGN KEY (created_by)
REFERENCES users(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_entry_versions_created_by 
ON entry_versions(created_by);

-- Update entry_versions policies
DROP POLICY IF EXISTS "Enable read access for team members on entry_versions" ON entry_versions;

CREATE POLICY "Enable read access for team members on entry_versions"
  ON entry_versions
  FOR SELECT
  TO authenticated
  USING (
    dictionary_id IN (
      SELECT id FROM dictionaries
      WHERE created_by = auth.uid()
      UNION
      SELECT dictionary_id FROM team_members
      WHERE user_id = auth.uid()
    )
  );

-- Update history view function
CREATE OR REPLACE FUNCTION get_entry_history(
  p_dictionary_id uuid,
  p_entry_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 10,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  entry_id uuid,
  dictionary_id uuid,
  version integer,
  changes jsonb,
  created_at timestamptz,
  created_by uuid,
  field_name text,
  user_email text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ev.id,
    ev.entry_id,
    ev.dictionary_id,
    ev.version,
    ev.changes,
    ev.created_at,
    ev.created_by,
    de.field_name,
    u.email as user_email
  FROM entry_versions ev
  LEFT JOIN dictionary_entries de ON ev.entry_id = de.id
  LEFT JOIN users u ON ev.created_by = u.id
  WHERE 
    ev.dictionary_id = p_dictionary_id
    AND (p_entry_id IS NULL OR ev.entry_id = p_entry_id)
  ORDER BY ev.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;