-- Add dictionary_id to performance_metrics
ALTER TABLE public.performance_metrics
ADD COLUMN dictionary_id uuid REFERENCES public.dictionaries(id);

-- Create index on performance_metrics
CREATE INDEX idx_metrics_dictionary_time 
ON public.performance_metrics (dictionary_id, created_at);

-- Create analytics_events table
CREATE TABLE public.analytics_events (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    dictionary_id uuid REFERENCES public.dictionaries(id) NOT NULL,
    event_type text NOT NULL,
    event_data jsonb DEFAULT '{}'::jsonb,
    user_id uuid REFERENCES auth.users(id),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

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
    searches bigint
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        'daily' as timeframe,
        sum(unique_users) as unique_users,
        sum(total_events) as total_events,
        sum(views) as views,
        sum(edits) as edits,
        sum(searches) as searches
    FROM public.daily_metrics
    WHERE dictionary_id = p_dictionary_id
    AND day BETWEEN p_start_date AND p_end_date;
END;
$$ LANGUAGE plpgsql;