-- Drop existing comments table if it exists
DROP TABLE IF EXISTS comments CASCADE;

-- Create comments table with polymorphic association
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    commentable_id UUID NOT NULL,
    commentable_type TEXT NOT NULL,
    author_id UUID NOT NULL,
    text TEXT NOT NULL,
    field_name TEXT, -- Optional field name for field-specific comments
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Add RLS policies
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX comments_commentable_idx ON comments(commentable_id, commentable_type);
CREATE INDEX comments_author_id_idx ON comments(author_id);
CREATE INDEX comments_field_name_idx ON comments(field_name);

-- Allow users to view comments if they have access to the commentable object
CREATE POLICY "Users can view comments" ON comments
    FOR SELECT
    USING (
        CASE
            WHEN commentable_type = 'dictionary_entries' THEN
                EXISTS (
                    SELECT 1 FROM dictionary_entries e
                    JOIN team_members tm ON e.dictionary_id = tm.dictionary_id
                    WHERE e.id = commentable_id
                    AND tm.user_id = auth.uid()
                )
            WHEN commentable_type = 'quality_rules' THEN
                EXISTS (
                    SELECT 1 FROM quality_rules qr
                    JOIN team_members tm ON qr.dictionary_id = tm.dictionary_id
                    WHERE qr.id = commentable_id
                    AND tm.user_id = auth.uid()
                )
            ELSE false
        END
    );

-- Allow users to create comments if they have access to the commentable object
CREATE POLICY "Users can create comments" ON comments
    FOR INSERT
    WITH CHECK (
        CASE
            WHEN commentable_type = 'dictionary_entries' THEN
                EXISTS (
                    SELECT 1 FROM dictionary_entries e
                    JOIN team_members tm ON e.dictionary_id = tm.dictionary_id
                    WHERE e.id = commentable_id
                    AND tm.user_id = auth.uid()
                )
            WHEN commentable_type = 'quality_rules' THEN
                EXISTS (
                    SELECT 1 FROM quality_rules qr
                    JOIN team_members tm ON qr.dictionary_id = tm.dictionary_id
                    WHERE qr.id = commentable_id
                    AND tm.user_id = auth.uid()
                )
            ELSE false
        END
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