-- Drop existing objects
DROP TRIGGER IF EXISTS refresh_analytics_views_trigger ON public.analytics_events;
DROP FUNCTION IF EXISTS refresh_analytics_views();
DROP FUNCTION IF EXISTS get_dictionary_metrics(uuid, timestamp with time zone, timestamp with time zone);
DROP MATERIALIZED VIEW IF EXISTS public.monthly_metrics;
DROP MATERIALIZED VIEW IF EXISTS public.daily_metrics;
DROP INDEX IF EXISTS idx_analytics_events_dictionary_id;
DROP INDEX IF EXISTS idx_analytics_events_created_at;
DROP TABLE IF EXISTS public.analytics_events;
DROP TABLE IF EXISTS public.performance_metrics;

-- Create enhanced analytics tables
CREATE TABLE public.analytics_events (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    dictionary_id uuid REFERENCES public.dictionaries(id) NOT NULL,
    event_type text NOT NULL,
    event_data jsonb DEFAULT '{}'::jsonb,
    user_id text NOT NULL,
    session_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    device_info jsonb DEFAULT '{}'::jsonb,
    geolocation jsonb DEFAULT '{}'::jsonb,
    referrer text,
    path text
);

CREATE TABLE public.user_sessions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id text NOT NULL,
    dictionary_id uuid REFERENCES public.dictionaries(id),
    session_start timestamp with time zone DEFAULT now() NOT NULL,
    session_end timestamp with time zone,
    device_info jsonb DEFAULT '{}'::jsonb,
    geolocation jsonb DEFAULT '{}'::jsonb,
    referrer text,
    initial_path text,
    is_active boolean DEFAULT true
);

CREATE TABLE public.conversion_funnels (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    dictionary_id uuid REFERENCES public.dictionaries(id) NOT NULL,
    name text NOT NULL,
    description text,
    steps jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by text NOT NULL,
    is_active boolean DEFAULT true
);

CREATE TABLE public.funnel_events (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    funnel_id uuid REFERENCES public.conversion_funnels(id) NOT NULL,
    user_id text NOT NULL,
    session_id uuid REFERENCES public.user_sessions(id),
    step_number integer NOT NULL,
    step_name text NOT NULL,
    completed boolean DEFAULT false,
    completion_time timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create optimized indexes
CREATE INDEX idx_analytics_events_dictionary_time ON public.analytics_events (dictionary_id, created_at DESC);
CREATE INDEX idx_analytics_events_user_session ON public.analytics_events (user_id, session_id);
CREATE INDEX idx_analytics_events_type ON public.analytics_events (event_type);
CREATE INDEX idx_user_sessions_user ON public.user_sessions (user_id, session_start DESC);
CREATE INDEX idx_user_sessions_dictionary ON public.user_sessions (dictionary_id, session_start DESC);
CREATE INDEX idx_funnel_events_funnel ON public.funnel_events (funnel_id, created_at DESC);
CREATE INDEX idx_funnel_events_user ON public.funnel_events (user_id, created_at DESC);

-- Create materialized views for analytics
CREATE MATERIALIZED VIEW public.daily_metrics AS
WITH daily_stats AS (
    SELECT 
        ae.dictionary_id,
        date_trunc('day', ae.created_at) as day,
        COUNT(DISTINCT ae.user_id) as unique_users,
        COUNT(*) as total_events,
        COUNT(DISTINCT ae.session_id) as total_sessions,
        SUM(CASE WHEN ae.event_type = 'view' THEN 1 ELSE 0 END) as views,
        SUM(CASE WHEN ae.event_type = 'edit' THEN 1 ELSE 0 END) as edits,
        SUM(CASE WHEN ae.event_type = 'search' THEN 1 ELSE 0 END) as searches,
        jsonb_object_agg(
            COALESCE(ae.device_info->>'deviceType', 'unknown'),
            COUNT(*)
        ) as device_types,
        AVG(CASE 
            WHEN ae.event_data->>'loadTime' IS NOT NULL 
            THEN (ae.event_data->>'loadTime')::float 
            ELSE NULL 
        END) as avg_load_time,
        AVG(CASE 
            WHEN ae.event_data->>'interactionTime' IS NOT NULL 
            THEN (ae.event_data->>'interactionTime')::float 
            ELSE NULL 
        END) as avg_interaction_time
    FROM public.analytics_events ae
    GROUP BY ae.dictionary_id, date_trunc('day', ae.created_at)
)
SELECT
    ds.*,
    COALESCE(
        jsonb_object_agg(
            DISTINCT CASE 
                WHEN ae.event_data->>'error' IS NOT NULL 
                THEN ae.event_data->>'error' 
            END,
            COUNT(*) FILTER (WHERE ae.event_data->>'error' IS NOT NULL)::float / NULLIF(ds.total_events, 0)
        ) FILTER (WHERE ae.event_data->>'error' IS NOT NULL),
        '{}'::jsonb
    ) as error_rates
FROM daily_stats ds
LEFT JOIN public.analytics_events ae 
    ON ae.dictionary_id = ds.dictionary_id 
    AND date_trunc('day', ae.created_at) = ds.day
GROUP BY 
    ds.dictionary_id,
    ds.day,
    ds.unique_users,
    ds.total_events,
    ds.total_sessions,
    ds.views,
    ds.edits,
    ds.searches,
    ds.device_types,
    ds.avg_load_time,
    ds.avg_interaction_time;

CREATE UNIQUE INDEX idx_daily_metrics_dict_day 
ON public.daily_metrics (dictionary_id, day);

-- Create functions to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS trigger AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.daily_metrics;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create function to fetch metrics with refresh
CREATE OR REPLACE FUNCTION get_metrics_with_refresh(
    p_dictionary_id uuid,
    p_start_date timestamp with time zone,
    p_end_date timestamp with time zone
)
RETURNS TABLE (
    timeframe text,
    unique_users bigint,
    total_events bigint,
    views bigint,
    edits bigint,
    searches bigint,
    period_start timestamp with time zone
) AS $$
BEGIN
    -- Refresh view first
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.daily_metrics;
    
    -- Then return metrics
    RETURN QUERY
    SELECT * FROM get_dictionary_metrics(p_dictionary_id, p_start_date, p_end_date);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to refresh views
CREATE TRIGGER refresh_analytics_views_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.analytics_events
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_analytics_views();

-- Enable RLS
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversion_funnels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funnel_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view events for dictionaries they have access to" 
ON public.analytics_events FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.dictionaries d
        WHERE d.id = dictionary_id
        AND (d.created_by = auth.uid() OR d.is_public = true)
    )
);

CREATE POLICY "Users can insert events for dictionaries they have access to" 
ON public.analytics_events FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.dictionaries d
        WHERE d.id = dictionary_id
        AND (d.created_by = auth.uid() OR d.is_public = true)
    )
);

-- Session policies
CREATE POLICY "Users can view their own sessions"
ON public.user_sessions FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own sessions"
ON public.user_sessions FOR ALL TO authenticated
USING (user_id = auth.uid());

-- Funnel policies
CREATE POLICY "Users can manage funnels for their dictionaries"
ON public.conversion_funnels FOR ALL TO authenticated
USING (created_by = auth.uid());

CREATE POLICY "Users can view public funnels"
ON public.conversion_funnels FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.dictionaries d
        WHERE d.id = dictionary_id
        AND (d.created_by = auth.uid() OR d.is_public = true)
    )
);

CREATE POLICY "Users can insert funnel events for accessible funnels"
ON public.funnel_events FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.conversion_funnels f
        JOIN public.dictionaries d ON d.id = f.dictionary_id
        WHERE f.id = funnel_id
        AND (d.created_by = auth.uid() OR d.is_public = true)
    )
);

-- Refresh views initially
REFRESH MATERIALIZED VIEW CONCURRENTLY public.daily_metrics;