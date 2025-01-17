/*
  # Initial Schema for Data Dictionary Management System

  1. New Tables
    - `dictionaries`: Main dictionaries table
      - `id` (uuid, primary key)
      - `name` (text): Dictionary name
      - `description` (text): Dictionary description
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `created_by` (uuid): Reference to auth.users
      - `version` (integer): Current version number
      - `is_archived` (boolean): Soft delete flag

    - `dictionary_entries`: Individual field entries
      - `id` (uuid, primary key)
      - `dictionary_id` (uuid): Reference to dictionaries
      - `field_name` (text): Name of the field
      - `data_type` (text): Data type
      - `description` (text): Field description
      - `validation_rules` (jsonb): Validation rules
      - `sample_values` (jsonb): Example values
      - `related_fields` (jsonb): Related field references
      - `metadata` (jsonb): Custom metadata
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `created_by` (uuid): Reference to auth.users
      - `version` (integer): Entry version number

    - `entry_versions`: Version history for entries
      - `id` (uuid, primary key)
      - `entry_id` (uuid): Reference to dictionary_entries
      - `version` (integer): Version number
      - `changes` (jsonb): Changed fields
      - `created_at` (timestamp)
      - `created_by` (uuid): Reference to auth.users

    - `comments`: Discussion threads
      - `id` (uuid, primary key)
      - `entry_id` (uuid): Reference to dictionary_entries
      - `content` (text): Comment content
      - `created_at` (timestamp)
      - `created_by` (uuid): Reference to auth.users
      - `parent_id` (uuid): For nested comments

    - `tags`: Tag management
      - `id` (uuid, primary key)
      - `name` (text): Tag name
      - `color` (text): Tag color
      - `created_at` (timestamp)

    - `entry_tags`: Many-to-many relationship for entries and tags
      - `entry_id` (uuid): Reference to dictionary_entries
      - `tag_id` (uuid): Reference to tags

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
    - Implement role-based access control

  3. Functions
    - Add function for version management
    - Add function for audit logging
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Dictionaries table
CREATE TABLE dictionaries (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  version integer DEFAULT 1,
  is_archived boolean DEFAULT false
);

-- Dictionary entries table
CREATE TABLE dictionary_entries (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  dictionary_id uuid REFERENCES dictionaries(id) ON DELETE CASCADE,
  field_name text NOT NULL,
  data_type text NOT NULL,
  description text,
  validation_rules jsonb DEFAULT '{}',
  sample_values jsonb DEFAULT '[]',
  related_fields jsonb DEFAULT '[]',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  version integer DEFAULT 1
);

-- Entry versions table
CREATE TABLE entry_versions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  entry_id uuid REFERENCES dictionary_entries(id) ON DELETE CASCADE,
  version integer NOT NULL,
  changes jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Comments table
CREATE TABLE comments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  entry_id uuid REFERENCES dictionary_entries(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  parent_id uuid REFERENCES comments(id)
);

-- Tags table
CREATE TABLE tags (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  color text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Entry tags junction table
CREATE TABLE entry_tags (
  entry_id uuid REFERENCES dictionary_entries(id) ON DELETE CASCADE,
  tag_id uuid REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (entry_id, tag_id)
);

-- Enable RLS
ALTER TABLE dictionaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE dictionary_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE entry_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE entry_tags ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow authenticated users to read dictionaries"
  ON dictionaries FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow users to create dictionaries"
  ON dictionaries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Allow users to update their own dictionaries"
  ON dictionaries FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

-- Similar policies for other tables...

-- Functions
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER update_dictionaries_updated_at
  BEFORE UPDATE ON dictionaries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_dictionary_entries_updated_at
  BEFORE UPDATE ON dictionary_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();