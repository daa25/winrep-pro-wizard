-- Fix: Sales reports lack deletion protection
-- Add UPDATE and DELETE policies to prevent data loss

-- Prevent users from modifying historical sales reports
CREATE POLICY "Prevent sales report modifications"
ON public.sales_reports
FOR UPDATE
USING (false);

-- Prevent users from deleting historical sales reports
CREATE POLICY "Prevent sales report deletion"
ON public.sales_reports
FOR DELETE
USING (false);

-- Fix: Managers can access all customer contact data
-- Implement territory-based access for managers while keeping admin full access

-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Managers can view all customers" ON public.customers;

-- Create new territory-scoped policy for managers
CREATE POLICY "Territory-based customer access"
ON public.customers
FOR SELECT
USING (
  -- Users can view their own customers
  auth.uid() = user_id 
  OR
  -- Managers can view customers in their territory
  (
    public.has_role(auth.uid(), 'manager'::app_role) 
    AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND territory IS NOT NULL
      AND territory = customers.city
    )
  )
  OR
  -- Admins can view all customers
  public.has_role(auth.uid(), 'admin'::app_role)
);