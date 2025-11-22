-- GPS location tracking table
CREATE TABLE public.location_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  account_id UUID REFERENCES public.route_accounts(id),
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  accuracy NUMERIC,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  event_type TEXT NOT NULL CHECK (event_type IN ('arrival', 'departure', 'tracking')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Route performance data for learning
CREATE TABLE public.route_performance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  route_name TEXT NOT NULL,
  day_of_week INTEGER NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  total_distance_miles NUMERIC,
  total_duration_minutes INTEGER,
  stops_completed INTEGER NOT NULL DEFAULT 0,
  traffic_score NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Customer portal users (separate from rep users)
CREATE TABLE public.customer_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_login TIMESTAMP WITH TIME ZONE
);

-- Customer appointments
CREATE TABLE public.customer_appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id),
  rep_user_id UUID NOT NULL,
  requested_date DATE NOT NULL,
  requested_time_slot TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.location_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_appointments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for location_logs
CREATE POLICY "Users can manage own location logs"
ON public.location_logs
FOR ALL
USING (auth.uid() = user_id);

-- RLS Policies for route_performance
CREATE POLICY "Users can manage own route performance"
ON public.route_performance
FOR ALL
USING (auth.uid() = user_id);

-- RLS Policies for customer_users
CREATE POLICY "Customer users can view own profile"
ON public.customer_users
FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Customer users can update own profile"
ON public.customer_users
FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Reps can view their customers' portal users"
ON public.customer_users
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.customers
    WHERE customers.id = customer_users.customer_id
    AND customers.user_id = auth.uid()
  )
);

-- RLS Policies for customer_appointments
CREATE POLICY "Customers can view own appointments"
ON public.customer_appointments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.customer_users
    WHERE customer_users.customer_id = customer_appointments.customer_id
    AND customer_users.id = auth.uid()
  )
);

CREATE POLICY "Customers can create own appointments"
ON public.customer_appointments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.customer_users
    WHERE customer_users.customer_id = customer_appointments.customer_id
    AND customer_users.id = auth.uid()
  )
);

CREATE POLICY "Reps can manage appointments for their customers"
ON public.customer_appointments
FOR ALL
USING (auth.uid() = rep_user_id);

-- Indexes for performance
CREATE INDEX idx_location_logs_user_timestamp ON public.location_logs(user_id, timestamp DESC);
CREATE INDEX idx_location_logs_account ON public.location_logs(account_id);
CREATE INDEX idx_route_performance_user_day ON public.route_performance(user_id, day_of_week);
CREATE INDEX idx_customer_appointments_customer ON public.customer_appointments(customer_id);
CREATE INDEX idx_customer_appointments_rep ON public.customer_appointments(rep_user_id);

-- Trigger for updated_at
CREATE TRIGGER update_customer_appointments_updated_at
BEFORE UPDATE ON public.customer_appointments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();