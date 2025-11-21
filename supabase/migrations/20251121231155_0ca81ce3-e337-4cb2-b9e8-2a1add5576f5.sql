-- Add business name and priority score fields to route_accounts
ALTER TABLE public.route_accounts 
ADD COLUMN IF NOT EXISTS business_name TEXT,
ADD COLUMN IF NOT EXISTS priority_score NUMERIC DEFAULT 1.0;

-- Create visit history table for learning
CREATE TABLE IF NOT EXISTS public.route_visit_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  account_id UUID NOT NULL REFERENCES public.route_accounts(id) ON DELETE CASCADE,
  visit_date DATE NOT NULL,
  order_amount NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.route_visit_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage own visit history"
  ON public.route_visit_history
  FOR ALL
  USING (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX idx_visit_history_account_date ON public.route_visit_history(account_id, visit_date DESC);

-- Function to update priority scores based on visit history
CREATE OR REPLACE FUNCTION public.update_account_priority_score(p_account_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_score NUMERIC;
  v_avg_order NUMERIC;
  v_normalized NUMERIC;
  v_new_score NUMERIC;
BEGIN
  -- Get current score
  SELECT priority_score INTO v_old_score
  FROM public.route_accounts
  WHERE id = p_account_id;

  -- Calculate average order amount from last 10 visits
  SELECT AVG(order_amount) INTO v_avg_order
  FROM (
    SELECT order_amount
    FROM public.route_visit_history
    WHERE account_id = p_account_id
    ORDER BY visit_date DESC
    LIMIT 10
  ) recent_visits;

  -- Normalize: between 1 and 3 (500 = baseline)
  v_normalized := 1.0 + LEAST(COALESCE(v_avg_order, 0) / 500.0, 2.0);

  -- Weighted average: 80% old score + 20% new normalized value
  v_new_score := 0.8 * COALESCE(v_old_score, 1.0) + 0.2 * v_normalized;

  -- Update the account
  UPDATE public.route_accounts
  SET priority_score = v_new_score
  WHERE id = p_account_id;

  RETURN v_new_score;
END;
$$;