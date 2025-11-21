-- Fix search path warning
CREATE OR REPLACE FUNCTION public.update_account_priority_score(p_account_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_score NUMERIC;
  v_avg_order NUMERIC;
  v_normalized NUMERIC;
  v_new_score NUMERIC;
BEGIN
  SELECT priority_score INTO v_old_score
  FROM route_accounts
  WHERE id = p_account_id;

  SELECT AVG(order_amount) INTO v_avg_order
  FROM (
    SELECT order_amount
    FROM route_visit_history
    WHERE account_id = p_account_id
    ORDER BY visit_date DESC
    LIMIT 10
  ) recent_visits;

  v_normalized := 1.0 + LEAST(COALESCE(v_avg_order, 0) / 500.0, 2.0);
  v_new_score := 0.8 * COALESCE(v_old_score, 1.0) + 0.2 * v_normalized;

  UPDATE route_accounts
  SET priority_score = v_new_score
  WHERE id = p_account_id;

  RETURN v_new_score;
END;
$$;