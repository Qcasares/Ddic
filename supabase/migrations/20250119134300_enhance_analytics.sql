-- Add dictionary_id to performance_metrics
ALTER TABLE public.performance_metrics
ADD COLUMN dictionary_id uuid REFERENCES public.dictionaries(id);

-- Create index on performance_metrics
CREATE INDEX idx_metrics_dictionary_time 
ON public.performance_metrics (dictionary_id, created_at);

-- Create analytics_events table
-- Drop existing tables and views if they exist
DROP MATERIALIZED VIEW IF EXISTS public.monthly_metrics;
DROP MATERIALIZED VIEW IF EXISTS public.daily_metrics;
DROP TABLE IF EXISTS public.analytics_events;

-- Create analytics_events table
CREATE TABLE public.analytics_events (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    dictionary_id uuid REFERENCES public.dictionaries(id) NOT NULL,
    event_type text NOT NULL,
    event_data jsonb DEFAULT '{}'::jsonb,
    user_id text NOT NULL, -- Changed to text since we're passing string IDs
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create index for faster querying
CREATE INDEX idx_analytics_events_dictionary_id ON public.analytics_events(dictionary_id);
CREATE INDEX idx_analytics_events_created_at ON public.analytics_events(created_at);

-- Enable RLS on analytics_events
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Create policies for analytics_events
CREATE POLICY "Users can insert events for dictionaries they have access to" 
ON public.analytics_events FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.dictionaries d
        WHERE d.id = dictionary_id
        AND (d.created_by = auth.uid() OR d.is_public = true)
    )
);

CREATE POLICY "Users can view events for dictionaries they have access to" 
ON public.analytics_events FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.dictionaries d
        WHERE d.id = dictionary_id
        AND (d.created_by = auth.uid() OR d.is_public = true)
    )
);

-- Create materialized views for aggregated metrics
CREATE MATERIALIZED VIEW public.daily_metrics AS
SELECT 
    dictionary_id,
    date_trunc('day', created_at) as day,
    count(distinct user_id) as unique_users,
    count(*) as total_events,
    sum(CASE WHEN event_type = 'view' THEN 1 ELSE 0 END) as views,
    sum(CASE WHEN event_type = 'edit' THEN 1 ELSE 0 END) as edits,
    sum(CASE WHEN event_type = 'search' THEN 1 ELSE 0 END) as searches
FROM public.analytics_events
GROUP BY dictionary_id, date_trunc('day', created_at);

CREATE UNIQUE INDEX idx_daily_metrics_dict_day 
ON public.daily_metrics (dictionary_id, day);

CREATE MATERIALIZED VIEW public.monthly_metrics AS
SELECT 
    dictionary_id,
    date_trunc('month', created_at) as month,
    count(distinct user_id) as unique_users,
    count(*) as total_events,
    sum(CASE WHEN event_type = 'view' THEN 1 ELSE 0 END) as views,
    sum(CASE WHEN event_type = 'edit' THEN 1 ELSE 0 END) as edits,
    sum(CASE WHEN event_type = 'search' THEN 1 ELSE 0 END) as searches
FROM public.analytics_events
GROUP BY dictionary_id, date_trunc('month', created_at);

CREATE UNIQUE INDEX idx_monthly_metrics_dict_month 
ON public.monthly_metrics (dictionary_id, month);

-- Create function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS trigger AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.daily_metrics;
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.monthly_metrics;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to refresh views when analytics_events is updated
CREATE TRIGGER refresh_analytics_views_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.analytics_events
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_analytics_views();

-- Refresh views initially
REFRESH MATERIALIZED VIEW CONCURRENTLY public.daily_metrics;
REFRESH MATERIALIZED VIEW CONCURRENTLY public.monthly_metrics;

-- Create helper function for aggregated metrics
CREATE OR REPLACE FUNCTION get_dictionary_metrics(
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
DECLARE
    v_result RECORD;
BEGIN
    -- Return data for different timeframes
    RETURN QUERY
    
    WITH aggregated_metrics AS (
        -- Daily data (last 24 hours)
        SELECT
            'day'::text as metric_timeframe,
            COALESCE(sum(dm.unique_users), 0)::bigint as metric_users,
            COALESCE(sum(dm.total_events), 0)::bigint as metric_events,
            COALESCE(sum(dm.views), 0)::bigint as metric_views,
            COALESCE(sum(dm.edits), 0)::bigint as metric_edits,
            COALESCE(sum(dm.searches), 0)::bigint as metric_searches,
            date_trunc('day', dm.day) as metric_period_start
        FROM public.daily_metrics dm
        WHERE dm.dictionary_id = p_dictionary_id
        AND dm.day >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
        GROUP BY date_trunc('day', dm.day)
        
        UNION ALL
        
        -- Weekly data (last 7 days)
        SELECT
            'week'::text as metric_timeframe,
            COALESCE(sum(dm.unique_users), 0)::bigint as metric_users,
            COALESCE(sum(dm.total_events), 0)::bigint as metric_events,
            COALESCE(sum(dm.views), 0)::bigint as metric_views,
            COALESCE(sum(dm.edits), 0)::bigint as metric_edits,
            COALESCE(sum(dm.searches), 0)::bigint as metric_searches,
            date_trunc('day', dm.day) as metric_period_start
        FROM public.daily_metrics dm
        WHERE dm.dictionary_id = p_dictionary_id
        AND dm.day >= CURRENT_TIMESTAMP - INTERVAL '7 days'
        GROUP BY date_trunc('day', dm.day)
        
        UNION ALL
        
        -- Monthly data (last 30 days)
        SELECT
            'month'::text as metric_timeframe,
            COALESCE(sum(dm.unique_users), 0)::bigint as metric_users,
            COALESCE(sum(dm.total_events), 0)::bigint as metric_events,
            COALESCE(sum(dm.views), 0)::bigint as metric_views,
            COALESCE(sum(dm.edits), 0)::bigint as metric_edits,
            COALESCE(sum(dm.searches), 0)::bigint as metric_searches,
            date_trunc('day', dm.day) as metric_period_start
        FROM public.daily_metrics dm
        WHERE dm.dictionary_id = p_dictionary_id
        AND dm.day >= CURRENT_TIMESTAMP - INTERVAL '30 days'
        GROUP BY date_trunc('day', dm.day)
        
        UNION ALL
        
        -- Yearly data (last 365 days)
        SELECT
            'year'::text as metric_timeframe,
            COALESCE(sum(dm.unique_users), 0)::bigint as metric_users,
            COALESCE(sum(dm.total_events), 0)::bigint as metric_events,
            COALESCE(sum(dm.views), 0)::bigint as metric_views,
            COALESCE(sum(dm.edits), 0)::bigint as metric_edits,
            COALESCE(sum(dm.searches), 0)::bigint as metric_searches,
            date_trunc('day', dm.day) as metric_period_start
        FROM public.daily_metrics dm
        WHERE dm.dictionary_id = p_dictionary_id
        AND dm.day >= CURRENT_TIMESTAMP - INTERVAL '365 days'
        GROUP BY date_trunc('day', dm.day)
    )
    SELECT
        am.metric_timeframe as timeframe,
        am.metric_users as unique_users,
        am.metric_events as total_events,
        am.metric_views as views,
        am.metric_edits as edits,
        am.metric_searches as searches,
        am.metric_period_start as period_start
    FROM aggregated_metrics am
    ORDER BY
        CASE am.metric_timeframe
            WHEN 'day' THEN 1
            WHEN 'week' THEN 2
            WHEN 'month' THEN 3
            WHEN 'year' THEN 4
        END,
        am.metric_period_start
    ORDER BY timeframe, period_start;
END;
$$ LANGUAGE plpgsql;