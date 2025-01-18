-- Create dictionary_activity table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.dictionary_activity (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    dictionary_id uuid REFERENCES public.dictionaries(id),
    views integer DEFAULT 0,
    edits integer DEFAULT 0,
    searches integer DEFAULT 0,
    active_users integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Add dictionary_id to performance_metrics if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'performance_metrics' 
        AND column_name = 'dictionary_id'
    ) THEN
        ALTER TABLE public.performance_metrics
        ADD COLUMN dictionary_id uuid REFERENCES public.dictionaries(id);
    END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_dictionary_activity_dictionary_id 
ON public.dictionary_activity(dictionary_id);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_dictionary_id 
ON public.performance_metrics(dictionary_id);

-- Enable RLS on dictionary_activity
ALTER TABLE public.dictionary_activity ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for dictionary_activity
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'dictionary_activity' 
        AND policyname = 'Users can view dictionary activity'
    ) THEN
        CREATE POLICY "Users can view dictionary activity" ON public.dictionary_activity
            FOR SELECT TO authenticated
            USING (EXISTS (
                SELECT 1 FROM public.dictionaries d
                WHERE d.id = dictionary_id
                AND d.created_by = auth.uid()
            ));
    END IF;
END $$;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'set_timestamp' 
        AND tgrelid = 'dictionary_activity'::regclass
    ) THEN
        CREATE TRIGGER set_timestamp
            BEFORE UPDATE ON public.dictionary_activity
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;