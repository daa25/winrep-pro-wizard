-- Create table for edge function logs
CREATE TABLE IF NOT EXISTS public.edge_function_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  function_name TEXT NOT NULL,
  request_path TEXT,
  method TEXT,
  status_code INTEGER,
  response_time_ms INTEGER,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for efficient querying
CREATE INDEX idx_edge_function_logs_user_id ON public.edge_function_logs(user_id);
CREATE INDEX idx_edge_function_logs_function_name ON public.edge_function_logs(function_name);
CREATE INDEX idx_edge_function_logs_created_at ON public.edge_function_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.edge_function_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own logs
CREATE POLICY "Users can view their own function logs"
  ON public.edge_function_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Service role can insert logs (edge functions use service role)
CREATE POLICY "Service role can insert logs"
  ON public.edge_function_logs
  FOR INSERT
  WITH CHECK (true);

-- Create table for rate limiting
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  function_name TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create unique index for efficient rate limit checking
CREATE UNIQUE INDEX idx_rate_limits_user_function ON public.rate_limits(user_id, function_name);

-- Enable RLS
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can manage rate limits
CREATE POLICY "Service role can manage rate limits"
  ON public.rate_limits
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Function to clean up old logs (older than 30 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.edge_function_logs
  WHERE created_at < now() - interval '30 days';
END;
$$;

-- Function to check and update rate limit
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_user_id UUID,
  p_function_name TEXT,
  p_max_requests INTEGER DEFAULT 60,
  p_window_minutes INTEGER DEFAULT 1
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_count INTEGER;
  v_window_start TIMESTAMPTZ;
BEGIN
  -- Get current rate limit record
  SELECT request_count, window_start
  INTO v_current_count, v_window_start
  FROM public.rate_limits
  WHERE user_id = p_user_id 
    AND function_name = p_function_name;
  
  -- If no record exists or window expired, create/reset
  IF NOT FOUND OR v_window_start < now() - (p_window_minutes || ' minutes')::interval THEN
    INSERT INTO public.rate_limits (user_id, function_name, request_count, window_start)
    VALUES (p_user_id, p_function_name, 1, now())
    ON CONFLICT (user_id, function_name)
    DO UPDATE SET 
      request_count = 1,
      window_start = now(),
      updated_at = now();
    RETURN TRUE;
  END IF;
  
  -- Check if limit exceeded
  IF v_current_count >= p_max_requests THEN
    RETURN FALSE;
  END IF;
  
  -- Increment counter
  UPDATE public.rate_limits
  SET request_count = request_count + 1,
      updated_at = now()
  WHERE user_id = p_user_id 
    AND function_name = p_function_name;
  
  RETURN TRUE;
END;
$$;