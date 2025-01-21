-- Drop table if exists
DROP TABLE IF EXISTS document_processing_results;

-- Drop enum for processing status if it exists
DROP TYPE IF EXISTS processing_status;

-- Create enum for processing status
CREATE TYPE processing_status AS ENUM ('completed', 'failed', 'partial');

-- Create table for document processing results
CREATE TABLE IF NOT EXISTS document_processing_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id TEXT NOT NULL,
    extracted_terms JSONB NOT NULL,
    processing_metrics JSONB NOT NULL,
    status processing_status NOT NULL DEFAULT 'completed',
    errors TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_document_processing_status ON document_processing_results(status);
CREATE INDEX IF NOT EXISTS idx_document_processing_created_at ON document_processing_results(created_at);

-- Add RLS policies
ALTER TABLE document_processing_results ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users
DROP POLICY IF EXISTS "Allow read access for authenticated users" ON document_processing_results;
CREATE POLICY "Allow read access for authenticated users"
    ON document_processing_results
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow insert access to authenticated users
DROP POLICY IF EXISTS "Allow insert access for authenticated users" ON document_processing_results;
CREATE POLICY "Allow insert access for authenticated users"
    ON document_processing_results
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_document_processing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc', now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at timestamp
DROP TRIGGER IF EXISTS update_document_processing_updated_at ON document_processing_results;
CREATE TRIGGER update_document_processing_updated_at
    BEFORE UPDATE ON document_processing_results
    FOR EACH ROW
    EXECUTE FUNCTION update_document_processing_updated_at();

-- Add comment to describe the table
COMMENT ON TABLE document_processing_results IS 'Stores results from document processing and term extraction operations';

-- Add comments on columns
COMMENT ON COLUMN document_processing_results.document_id IS 'Unique identifier for the processed document';
COMMENT ON COLUMN document_processing_results.extracted_terms IS 'JSON array of extracted terms and their metadata';
COMMENT ON COLUMN document_processing_results.processing_metrics IS 'Performance metrics and statistics from the processing operation';
COMMENT ON COLUMN document_processing_results.status IS 'Current status of the processing operation';
COMMENT ON COLUMN document_processing_results.errors IS 'Array of error messages if processing failed';