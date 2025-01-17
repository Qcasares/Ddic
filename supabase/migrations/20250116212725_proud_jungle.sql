-- Fix comments table relationships
ALTER TABLE comments
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES users(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_comments_created_by ON comments(created_by);

-- Enable RLS on comments table
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Create policies for comments
CREATE POLICY "Enable read access for team members on comments"
  ON comments
  FOR SELECT
  TO authenticated
  USING (
    entry_id IN (
      SELECT id FROM dictionary_entries
      WHERE dictionary_id IN (
        SELECT id FROM dictionaries
        WHERE created_by = auth.uid()
        UNION
        SELECT dictionary_id FROM team_members
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Enable write access for team members on comments"
  ON comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    entry_id IN (
      SELECT id FROM dictionary_entries
      WHERE dictionary_id IN (
        SELECT id FROM dictionaries
        WHERE created_by = auth.uid()
        UNION
        SELECT dictionary_id FROM team_members
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Enable delete access for comment owners"
  ON comments
  FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid() OR
    entry_id IN (
      SELECT id FROM dictionary_entries
      WHERE dictionary_id IN (
        SELECT id FROM dictionaries
        WHERE created_by = auth.uid()
      )
    )
  );

-- Function to automatically set created_by
CREATE OR REPLACE FUNCTION set_comment_created_by()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for created_by
CREATE TRIGGER set_comment_created_by_trigger
  BEFORE INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION set_comment_created_by();