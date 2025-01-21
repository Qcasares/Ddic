-- Enable the pg_trgm extension for text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add search_vector column to dictionary_entries
ALTER TABLE dictionary_entries ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create index for full text search
CREATE INDEX IF NOT EXISTS dictionary_entries_search_idx ON dictionary_entries USING GIN (search_vector);

-- Create function to update search vector
CREATE OR REPLACE FUNCTION dictionary_entries_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.field_name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.data_type, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update search vector
DROP TRIGGER IF EXISTS dictionary_entries_search_vector_update ON dictionary_entries;
CREATE TRIGGER dictionary_entries_search_vector_update
  BEFORE INSERT OR UPDATE ON dictionary_entries
  FOR EACH ROW
  EXECUTE FUNCTION dictionary_entries_search_vector_update();

-- Add RLS policies for dictionary_entries
DROP POLICY IF EXISTS "Allow authenticated users to read entries" ON dictionary_entries;
CREATE POLICY "Allow authenticated users to read entries"
  ON dictionary_entries FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow users to create entries" ON dictionary_entries;
CREATE POLICY "Allow users to create entries"
  ON dictionary_entries FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM dictionaries d
      WHERE d.id = dictionary_id
      AND d.created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Allow users to update their entries" ON dictionary_entries;
CREATE POLICY "Allow users to update their entries"
  ON dictionary_entries FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dictionaries d
      WHERE d.id = dictionary_id
      AND d.created_by = auth.uid()
    )
  );

-- Update existing entries to populate search_vector
UPDATE dictionary_entries SET search_vector = 
  setweight(to_tsvector('english', coalesce(field_name, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(data_type, '')), 'C');