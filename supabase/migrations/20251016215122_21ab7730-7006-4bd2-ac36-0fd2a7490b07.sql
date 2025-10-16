-- Create customers table to store address data from GPX
CREATE TABLE IF NOT EXISTS public.customers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  address text,
  latitude numeric,
  longitude numeric,
  phone text,
  email text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own customers"
ON public.customers
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own customers"
ON public.customers
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own customers"
ON public.customers
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own customers"
ON public.customers
FOR DELETE
USING (auth.uid() = user_id);

-- Managers can view all customers
CREATE POLICY "Managers can view all customers"
ON public.customers
FOR SELECT
USING (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_customers_updated_at
BEFORE UPDATE ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();