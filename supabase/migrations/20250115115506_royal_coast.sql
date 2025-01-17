/*
  # Add metadata support to dictionaries

  1. New Columns
    - `domain` (text): Business domain for the dictionary
    - `steward` (text): Data steward responsible for the dictionary
    - `status` (text): Current status of the dictionary (draft, review, approved)
    - `metadata` (jsonb): Custom metadata fields

  2. Changes
    - Add new columns to dictionaries table
    - Add validation check for status values
    - Update RLS policies for new columns

  3. Security
    - Maintain existing RLS policies
    - Add policy for status updates
*/

-- Add new columns to dictionaries table
ALTER TABLE dictionaries 
  ADD COLUMN IF NOT EXISTS domain text,
  ADD COLUMN IF NOT EXISTS steward text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved')),
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- Create index for status field
CREATE INDEX IF NOT EXISTS idx_dictionaries_status ON dictionaries(status);

-- Update RLS policies
CREATE POLICY "Users can update dictionary status"
  ON dictionaries
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (
    auth.uid() = created_by AND
    (
      -- Allow any status change by the owner
      true
    )
  );