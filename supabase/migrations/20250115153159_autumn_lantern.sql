/*
  # Business Glossary Integration

  1. New Tables
    - `business_terms`
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `definition` (text)
      - `domain` (text)
      - `status` (text)
      - `created_at` (timestamp)
      - `created_by` (uuid)
      - `updated_at` (timestamp)
    
    - `term_relationships`
      - Links business terms to dictionary entries
      - Tracks relationship type and context

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users
    
  3. Changes
    - Add business glossary support
    - Create relationship tracking
    - Add audit fields
*/

-- Create business_terms table
CREATE TABLE business_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  definition text,
  domain text,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'archived')),
  synonyms text[],
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES users(id),
  approved_by uuid REFERENCES users(id),
  approved_at timestamptz
);

-- Create term_relationships table
CREATE TABLE term_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  term_id uuid REFERENCES business_terms(id) ON DELETE CASCADE,
  entry_id uuid REFERENCES dictionary_entries(id) ON DELETE CASCADE,
  relationship_type text NOT NULL DEFAULT 'primary' CHECK (relationship_type IN ('primary', 'related', 'synonym')),
  context text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES users(id),
  UNIQUE(term_id, entry_id)
);

-- Enable RLS
ALTER TABLE business_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE term_relationships ENABLE ROW LEVEL SECURITY;

-- Create policies for business_terms
CREATE POLICY "Enable read access for authenticated users on business_terms"
  ON business_terms
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for authenticated users on business_terms"
  ON business_terms
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Enable update for creators and editors on business_terms"
  ON business_terms
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Create policies for term_relationships
CREATE POLICY "Enable read access for authenticated users on term_relationships"
  ON term_relationships
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for authenticated users on term_relationships"
  ON term_relationships
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Enable update for creators on term_relationships"
  ON term_relationships
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Create indexes for performance
CREATE INDEX idx_business_terms_name ON business_terms(name);
CREATE INDEX idx_business_terms_domain ON business_terms(domain);
CREATE INDEX idx_business_terms_status ON business_terms(status);
CREATE INDEX idx_term_relationships_term_id ON term_relationships(term_id);
CREATE INDEX idx_term_relationships_entry_id ON term_relationships(entry_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_business_terms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_business_terms_updated_at_trigger
  BEFORE UPDATE ON business_terms
  FOR EACH ROW
  EXECUTE FUNCTION update_business_terms_updated_at();

-- Add business glossary search capabilities
ALTER TABLE business_terms ADD COLUMN search_vector tsvector;
CREATE INDEX idx_business_terms_search ON business_terms USING gin(search_vector);

-- Create function to update search vector
CREATE OR REPLACE FUNCTION update_business_terms_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector = 
    setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.definition, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.domain, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for search vector updates
CREATE TRIGGER update_business_terms_search_vector_trigger
  BEFORE INSERT OR UPDATE ON business_terms
  FOR EACH ROW
  EXECUTE FUNCTION update_business_terms_search_vector();