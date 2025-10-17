-- Add Pepperi-style fields to customers table
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS external_id text,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active',
ADD COLUMN IF NOT EXISTS discount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS price_list text DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS street text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS state text,
ADD COLUMN IF NOT EXISTS zip_code text;

-- Create products/items table (Pepperi's core catalog)
CREATE TABLE IF NOT EXISTS public.products (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  external_id text NOT NULL,
  name text NOT NULL,
  long_description text,
  price numeric NOT NULL DEFAULT 0,
  unit_of_measure text DEFAULT 'each',
  category text,
  hidden boolean DEFAULT false,
  inventory integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own products"
ON public.products FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own products"
ON public.products FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own products"
ON public.products FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own products"
ON public.products FOR DELETE
USING (auth.uid() = user_id);

CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enhance orders table with Pepperi fields
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS external_id text,
ADD COLUMN IF NOT EXISTS reference text,
ADD COLUMN IF NOT EXISTS type text DEFAULT 'sales',
ADD COLUMN IF NOT EXISTS sub_type text,
ADD COLUMN IF NOT EXISTS sub_total numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_total numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS quantities_total numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS delivery_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS remark text;

-- Update order_items with Pepperi fields
ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS line_number integer,
ADD COLUMN IF NOT EXISTS unit_price_after_discount numeric,
ADD COLUMN IF NOT EXISTS product_id uuid;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_products_user_id ON public.products(user_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_external_id ON public.products(external_id);
CREATE INDEX IF NOT EXISTS idx_customers_external_id ON public.customers(external_id);