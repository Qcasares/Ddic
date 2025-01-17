/*
  # Add version history and search capabilities

  1. New Functions
    - `generate_tsvector`: Creates a text search vector for dictionary entries
    - `track_entry_changes`: Tracks changes to dictionary entries
    - `update_entry_search_vector`: Updates search vector when entry is modified

  2. New Columns
    - Add `search_vector` to dictionary_entries for full-text search
    - Add `workflow_status` to dictionary_entries
    - Add `review_status` to dictionary_entries
    - Add `last_reviewed_by` to dictionary_entries
    - Add `last_reviewed_at` to dictionary_entries

  3. New Indexes
    - GIN index on search_vector for efficient full-text search
    - B-tree index on workflow_status for status filtering
    - B-tree index on review_status for review filtering

  4. Security
    - Update RLS policies for new columns
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Add new columns to dictionary_entries
ALTER TABLE dictionary_entries ADD COLUMN IF NOT EXISTS search_vector tsvector;
ALTER TABLE dictionary_entries ADD COLUMN IF NOT EXISTS workflow_status text DEFAULT 'draft';
ALTER TABLE dictionary_entries ADD COLUMN IF NOT EXISTS review_status text DEFAULT 'pending';
ALTER TABLE dictionary_entries ADD COLUMN IF NOT EXISTS last_reviewed_by uuid REFERENCES auth.users(id);
ALTER TABLE dictionary_entries ADD COLUMN IF NOT EXISTS last_reviewed_at timestamptz;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_dictionary_entries_search_vector ON dictionary_entries USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_dictionary_entries_workflow_status ON dictionary_entries(workflow_status);
CREATE INDEX IF NOT EXISTS idx_dictionary_entries_review_status ON dictionary_entries(review_status);

-- Function to generate search vector
CREATE OR REPLACE FUNCTION generate_tsvector(
  field_name text,
  description text,
  data_type text,
  sample_values jsonb
) RETURNS tsvector AS $$
BEGIN
  RETURN (
    setweight(to_tsvector('english', coalesce(field_name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(data_type, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(sample_values::text, '')), 'D')
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to track entry changes
CREATE OR REPLACE FUNCTION track_entry_changes()
RETURNS TRIGGER AS $$
DECLARE
  changes jsonb;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    changes = jsonb_object_agg(
      key,
      jsonb_build_object(
        'old', old_row.value,
        'new', new_row.value
      )
    )
    FROM (
      SELECT key, value AS old_row, new_value AS new_row
      FROM jsonb_each(to_jsonb(OLD)) old_data
      FULL OUTER JOIN jsonb_each(to_jsonb(NEW)) new_data 
      ON old_data.key = new_data.key
      WHERE old_data.value IS DISTINCT FROM new_data.value
    ) diff;
    
    IF changes IS NOT NULL AND changes <> '{}'::jsonb THEN
      INSERT INTO entry_versions (
        entry_id,
        version,
        changes,
        created_by
      ) VALUES (
        NEW.id,
        COALESCE((
          SELECT MAX(version) + 1
          FROM entry_versions
          WHERE entry_id = NEW.id
        ), 1),
        changes,
        auth.uid()
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update search vector
CREATE OR REPLACE FUNCTION update_entry_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector = generate_tsvector(
    NEW.field_name,
    NEW.description,
    NEW.data_type,
    NEW.sample_values
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS track_entry_changes_trigger ON dictionary_entries;
CREATE TRIGGER track_entry_changes_trigger
  AFTER UPDATE ON dictionary_entries
  FOR EACH ROW
  EXECUTE FUNCTION track_entry_changes();

DROP TRIGGER IF EXISTS update_entry_search_vector_trigger ON dictionary_entries;
CREATE TRIGGER update_entry_search_vector_trigger
  BEFORE INSERT OR UPDATE ON dictionary_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_entry_search_vector();

-- Update existing entries with search vectors
UPDATE dictionary_entries
SET search_vector = generate_tsvector(
  field_name,
  description,
  data_type,
  sample_values
);

-- Add RLS policies for new columns
ALTER TABLE dictionary_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can update workflow status"
  ON dictionary_entries
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (
    auth.uid() IN (
      SELECT created_by FROM dictionaries WHERE id = dictionary_id
    )
  );

CREATE POLICY "Users can update review status"
  ON dictionary_entries
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (
    auth.uid() IN (
      SELECT created_by FROM dictionaries WHERE id = dictionary_id
    )
  );