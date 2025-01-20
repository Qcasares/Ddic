-- Drop existing comments table if it exists
DROP TABLE IF EXISTS comments CASCADE;

-- Create comments table
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_id UUID NOT NULL,
    author_id UUID NOT NULL,
    text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (entry_id) REFERENCES dictionary_entries(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Add RLS policies
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Allow users to view comments if they have access to the dictionary
CREATE POLICY "Users can view comments" ON comments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM dictionary_entries e
            JOIN team_members tm ON e.dictionary_id = tm.dictionary_id
            WHERE e.id = comments.entry_id
            AND tm.user_id = auth.uid()
        )
    );

-- Allow users to create comments if they have access to the dictionary
CREATE POLICY "Users can create comments" ON comments
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM dictionary_entries e
            JOIN team_members tm ON e.dictionary_id = tm.dictionary_id
            WHERE e.id = comments.entry_id
            AND tm.user_id = auth.uid()
        )
    );

-- Allow users to update their own comments
CREATE POLICY "Users can update their own comments" ON comments
    FOR UPDATE
    USING (author_id = auth.uid());

-- Allow users to delete their own comments
CREATE POLICY "Users can delete their own comments" ON comments
    FOR DELETE
    USING (author_id = auth.uid());

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_comments_updated_at
    BEFORE UPDATE ON comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create index for performance
CREATE INDEX comments_entry_id_idx ON comments(entry_id);
CREATE INDEX comments_author_id_idx ON comments(author_id);