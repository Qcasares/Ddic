-- Drop existing trigger first
DROP TRIGGER IF EXISTS update_impact_score_trigger ON dictionary_entries;

-- Drop existing policies first
DROP POLICY IF EXISTS "Enable read access for team members on external_systems" ON external_systems;
DROP POLICY IF EXISTS "Enable write access for editors on external_systems" ON external_systems;
DROP POLICY IF EXISTS "Enable read access for team members on quality_metrics" ON quality_metrics;
DROP POLICY IF EXISTS "Enable read access for team members on quality_alerts" ON quality_alerts;

-- Create external_systems table
CREATE TABLE IF NOT EXISTS external_systems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dictionary_id uuid REFERENCES dictionaries(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  system_type text NOT NULL,
  connected_fields jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES users(id)
);

-- Create quality_metrics table
CREATE TABLE IF NOT EXISTS quality_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  field_id uuid REFERENCES dictionary_entries(id) ON DELETE CASCADE,
  score integer NOT NULL CHECK (score >= 0 AND score <= 100),
  completeness_score integer,
  accuracy_score integer,
  consistency_score integer,
  validity_score integer,
  last_checked timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create quality_alerts table
CREATE TABLE IF NOT EXISTS quality_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  field_id uuid REFERENCES dictionary_entries(id) ON DELETE CASCADE,
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  message text NOT NULL,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES users(id)
);

-- Add impact_score to dictionary_entries
ALTER TABLE dictionary_entries 
ADD COLUMN IF NOT EXISTS impact_score integer CHECK (impact_score >= 0 AND impact_score <= 100);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_external_systems_dictionary_id ON external_systems(dictionary_id);
CREATE INDEX IF NOT EXISTS idx_quality_metrics_field_id ON quality_metrics(field_id);
CREATE INDEX IF NOT EXISTS idx_quality_alerts_field_id ON quality_alerts(field_id);
CREATE INDEX IF NOT EXISTS idx_dictionary_entries_impact_score ON dictionary_entries(impact_score);

-- Enable RLS
ALTER TABLE external_systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_alerts ENABLE ROW LEVEL SECURITY;

-- Create policies for external_systems
CREATE POLICY "Enable read access for team members on external_systems"
  ON external_systems
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

CREATE POLICY "Enable write access for editors on external_systems"
  ON external_systems
  FOR ALL
  TO authenticated
  USING (
    dictionary_id IN (
      SELECT id FROM dictionaries
      WHERE created_by = auth.uid()
      UNION
      SELECT dictionary_id FROM team_members
      WHERE user_id = auth.uid() AND role = 'editor'
    )
  );

-- Create policies for quality_metrics
CREATE POLICY "Enable read access for team members on quality_metrics"
  ON quality_metrics
  FOR SELECT
  TO authenticated
  USING (
    field_id IN (
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

-- Create policies for quality_alerts
CREATE POLICY "Enable read access for team members on quality_alerts"
  ON quality_alerts
  FOR SELECT
  TO authenticated
  USING (
    field_id IN (
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

-- Function to calculate impact score
CREATE OR REPLACE FUNCTION calculate_impact_score(
  field_id uuid
) RETURNS integer AS $$
DECLARE
  impact_score integer := 0;
  dependency_count integer;
  external_system_count integer;
  quality_metric_score integer;
BEGIN
  -- Count dependencies
  SELECT COUNT(*)
  INTO dependency_count
  FROM dictionary_entries
  WHERE related_fields ? field_id::text;

  -- Count external system connections
  SELECT COUNT(*)
  INTO external_system_count
  FROM external_systems
  WHERE connected_fields ? field_id::text;

  -- Get latest quality score
  SELECT qm.score
  INTO quality_metric_score
  FROM quality_metrics qm
  WHERE qm.field_id = calculate_impact_score.field_id
  ORDER BY qm.last_checked DESC
  LIMIT 1;

  -- Calculate weighted score
  impact_score := LEAST(100, (
    COALESCE(dependency_count, 0) * 20 +
    COALESCE(external_system_count, 0) * 30 +
    COALESCE(quality_metric_score, 50)
  ) / 3);

  RETURN impact_score;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update impact score
CREATE OR REPLACE FUNCTION update_impact_score()
RETURNS TRIGGER AS $$
BEGIN
  NEW.impact_score := calculate_impact_score(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_impact_score_trigger
  BEFORE INSERT OR UPDATE ON dictionary_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_impact_score();

-- Update existing entries with impact scores
UPDATE dictionary_entries
SET impact_score = calculate_impact_score(id);