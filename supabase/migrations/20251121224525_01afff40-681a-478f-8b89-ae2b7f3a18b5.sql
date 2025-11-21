-- Create accounts table for routing
CREATE TABLE IF NOT EXISTS public.route_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  region TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  frequency TEXT NOT NULL DEFAULT 'weekly',
  tags JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.route_accounts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage own route accounts"
  ON public.route_accounts
  FOR ALL
  USING (auth.uid() = user_id);

-- Create weekly routes table
CREATE TABLE IF NOT EXISTS public.weekly_routes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  week_number INTEGER NOT NULL,
  week_start_date DATE NOT NULL,
  origin_address TEXT NOT NULL DEFAULT 'Rockridge Rd, Lakeland FL',
  routes JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_start_date)
);

-- Enable RLS
ALTER TABLE public.weekly_routes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage own weekly routes"
  ON public.weekly_routes
  FOR ALL
  USING (auth.uid() = user_id);

-- Add update triggers
CREATE TRIGGER update_route_accounts_updated_at
  BEFORE UPDATE ON public.route_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_weekly_routes_updated_at
  BEFORE UPDATE ON public.weekly_routes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();