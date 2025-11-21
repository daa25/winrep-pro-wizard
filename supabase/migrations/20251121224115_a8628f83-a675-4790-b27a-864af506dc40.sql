-- Create alert configurations table
CREATE TABLE IF NOT EXISTS public.alert_configurations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  function_name TEXT NOT NULL,
  error_threshold_percent NUMERIC NOT NULL DEFAULT 10,
  time_window_minutes INTEGER NOT NULL DEFAULT 60,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, function_name)
);

-- Enable RLS
ALTER TABLE public.alert_configurations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage own alert configurations"
  ON public.alert_configurations
  FOR ALL
  USING (auth.uid() = user_id);

-- Create rate limit configurations table
CREATE TABLE IF NOT EXISTS public.rate_limit_configurations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  function_name TEXT NOT NULL,
  max_requests INTEGER NOT NULL DEFAULT 60,
  window_minutes INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, function_name)
);

-- Enable RLS
ALTER TABLE public.rate_limit_configurations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage own rate limit configurations"
  ON public.rate_limit_configurations
  FOR ALL
  USING (auth.uid() = user_id);

-- Add update trigger for alert_configurations
CREATE TRIGGER update_alert_configurations_updated_at
  BEFORE UPDATE ON public.alert_configurations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add update trigger for rate_limit_configurations
CREATE TRIGGER update_rate_limit_configurations_updated_at
  BEFORE UPDATE ON public.rate_limit_configurations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();