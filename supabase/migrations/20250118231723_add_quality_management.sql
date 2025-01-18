-- Quality rules table
CREATE TABLE IF NOT EXISTS public.quality_rules (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    dictionary_id uuid REFERENCES public.dictionaries(id),
    name text NOT NULL,
    rule_type text NOT NULL CHECK (rule_type IN ('regex', 'required_field', 'length', 'format')),
    configuration jsonb NOT NULL,
    severity text NOT NULL CHECK (severity IN ('error', 'warning', 'info')),
    created_at timestamptz DEFAULT now(),
    created_by uuid REFERENCES auth.users(id),
    updated_at timestamptz DEFAULT now()
);

-- Quality scores table
CREATE TABLE IF NOT EXISTS public.quality_scores (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    entry_id uuid REFERENCES public.dictionary_entries(id),
    total_score numeric NOT NULL CHECK (total_score >= 0 AND total_score <= 100),
    dimension_scores jsonb NOT NULL,
    failed_rules jsonb[],
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_quality_rules_dictionary_id ON public.quality_rules(dictionary_id);
CREATE INDEX IF NOT EXISTS idx_quality_scores_entry_id ON public.quality_scores(entry_id);

-- Enable RLS
ALTER TABLE public.quality_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quality_scores ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for quality_rules
CREATE POLICY "Users can view quality rules" ON public.quality_rules
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.dictionaries d
        WHERE d.id = dictionary_id
        AND (d.created_by = auth.uid() OR d.is_public = true)
    ));

CREATE POLICY "Users can manage their own quality rules" ON public.quality_rules
    FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.dictionaries d
        WHERE d.id = dictionary_id
        AND d.created_by = auth.uid()
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.dictionaries d
        WHERE d.id = dictionary_id
        AND d.created_by = auth.uid()
    ));

-- Create RLS policies for quality_scores
CREATE POLICY "Users can view quality scores" ON public.quality_scores
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.dictionary_entries e
        JOIN public.dictionaries d ON d.id = e.dictionary_id
        WHERE e.id = entry_id
        AND (d.created_by = auth.uid() OR d.is_public = true)
    ));

-- Create updated_at trigger function if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
        CREATE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = now();
            RETURN NEW;
        END;
        $$ language 'plpgsql';
    END IF;
END $$;

-- Create triggers for updated_at
CREATE TRIGGER set_quality_rules_timestamp
    BEFORE UPDATE ON public.quality_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_quality_scores_timestamp
    BEFORE UPDATE ON public.quality_scores
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();