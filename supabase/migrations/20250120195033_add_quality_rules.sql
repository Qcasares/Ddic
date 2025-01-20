-- Create enum types for severity and condition
CREATE TYPE quality_rule_severity AS ENUM ('error', 'warning', 'info');
CREATE TYPE quality_rule_condition AS ENUM ('required', 'minLength', 'maxLength', 'pattern', 'enum');

-- Create quality rules table
CREATE TABLE quality_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dictionary_id UUID NOT NULL REFERENCES dictionaries(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    severity quality_rule_severity NOT NULL,
    condition quality_rule_condition NOT NULL,
    field VARCHAR(255) NOT NULL,
    value JSONB, -- Stores number, string, or array values
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES auth.users(id),
    
    -- Add uniqueness constraint for dictionary_id + name
    UNIQUE(dictionary_id, name)
);

-- Create index for performance
CREATE INDEX quality_rules_dictionary_id_idx ON quality_rules(dictionary_id);

-- Add RLS policies
ALTER TABLE quality_rules ENABLE ROW LEVEL SECURITY;

-- Users can view quality rules if they have access to the dictionary
CREATE POLICY "Users can view quality rules" ON quality_rules
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM team_members
            WHERE dictionary_id = quality_rules.dictionary_id
            AND user_id = auth.uid()
        )
    );

-- Only editors can create/update/delete quality rules
CREATE POLICY "Editors can create quality rules" ON quality_rules
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM team_members
            WHERE dictionary_id = quality_rules.dictionary_id
            AND user_id = auth.uid()
            AND role IN ('editor', 'owner')
        )
    );

CREATE POLICY "Editors can update quality rules" ON quality_rules
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM team_members
            WHERE dictionary_id = quality_rules.dictionary_id
            AND user_id = auth.uid()
            AND role IN ('editor', 'owner')
        )
    );

CREATE POLICY "Editors can delete quality rules" ON quality_rules
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM team_members
            WHERE dictionary_id = quality_rules.dictionary_id
            AND user_id = auth.uid()
            AND role IN ('editor', 'owner')
        )
    );

-- Create quality_violations table to track historical violations
CREATE TABLE quality_violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_id UUID NOT NULL REFERENCES dictionary_entries(id) ON DELETE CASCADE,
    rule_id UUID NOT NULL REFERENCES quality_rules(id) ON DELETE CASCADE,
    field VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    severity quality_rule_severity NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES auth.users(id),

    -- Add indexes for common queries
    CONSTRAINT quality_violations_unique_active_violation 
        UNIQUE (entry_id, rule_id) 
        WHERE resolved_at IS NULL
);

-- Create indexes for performance
CREATE INDEX quality_violations_entry_id_idx ON quality_violations(entry_id);
CREATE INDEX quality_violations_rule_id_idx ON quality_violations(rule_id);
CREATE INDEX quality_violations_resolved_idx ON quality_violations(resolved_at) 
    WHERE resolved_at IS NULL;

-- Add RLS policies
ALTER TABLE quality_violations ENABLE ROW LEVEL SECURITY;

-- Users can view violations if they have access to the dictionary
CREATE POLICY "Users can view quality violations" ON quality_violations
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM dictionary_entries e
            JOIN team_members tm ON e.dictionary_id = tm.dictionary_id
            WHERE e.id = quality_violations.entry_id
            AND tm.user_id = auth.uid()
        )
    );

-- Editors can resolve violations
CREATE POLICY "Editors can resolve violations" ON quality_violations
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM dictionary_entries e
            JOIN team_members tm ON e.dictionary_id = tm.dictionary_id
            WHERE e.id = quality_violations.entry_id
            AND tm.user_id = auth.uid()
            AND tm.role IN ('editor', 'owner')
        )
    );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_quality_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_quality_rules_timestamp
    BEFORE UPDATE ON quality_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_quality_rules_updated_at();

-- Function to automatically create violation records
CREATE OR REPLACE FUNCTION create_quality_violation()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if there's an active violation for this rule and entry
    IF NOT EXISTS (
        SELECT 1 FROM quality_violations
        WHERE entry_id = NEW.id
        AND rule_id = NEW.rule_id
        AND resolved_at IS NULL
    ) THEN
        INSERT INTO quality_violations (
            entry_id,
            rule_id,
            field,
            message,
            severity
        ) VALUES (
            NEW.id,
            NEW.rule_id,
            NEW.field,
            NEW.message,
            NEW.severity
        );
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for automatic violation recording
CREATE TRIGGER record_quality_violation
    AFTER INSERT ON dictionary_entries
    FOR EACH ROW
    EXECUTE FUNCTION create_quality_violation();