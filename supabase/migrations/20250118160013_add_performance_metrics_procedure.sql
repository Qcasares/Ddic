-- Create function to handle table creation
CREATE OR REPLACE FUNCTION public.create_performance_metrics_table()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if table exists
    IF NOT EXISTS (
        SELECT FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename = 'performance_metrics'
    ) THEN
        -- Create the performance_metrics table
        CREATE TABLE public.performance_metrics (
            id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
            load_time numeric NOT NULL,
            interaction_time numeric NOT NULL,
            user_agent text NOT NULL,
            device_type text NOT NULL,
            created_at timestamp with time zone DEFAULT now() NOT NULL,
            user_id uuid REFERENCES auth.users(id)
        );

        -- Enable RLS
        ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;

        -- Create policy to allow authenticated users to insert their own metrics
        CREATE POLICY "Users can insert their own metrics" ON public.performance_metrics
            FOR INSERT TO authenticated
            WITH CHECK (auth.uid() = user_id);

        -- Create policy to allow users to read their own metrics
        CREATE POLICY "Users can read their own metrics" ON public.performance_metrics
            FOR SELECT TO authenticated
            USING (auth.uid() = user_id);
    END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_performance_metrics_table() TO authenticated;