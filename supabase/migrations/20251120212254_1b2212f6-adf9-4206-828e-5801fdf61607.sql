-- Create route_templates table for Week A/Week B schedules
CREATE TABLE public.route_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  route_name TEXT NOT NULL,
  week_type TEXT NOT NULL CHECK (week_type IN ('A', 'B')),
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  sequence_order INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create route_template_customers junction table
CREATE TABLE public.route_template_customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  route_template_id UUID NOT NULL REFERENCES public.route_templates(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  stop_order INTEGER NOT NULL DEFAULT 0,
  estimated_duration_minutes INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(route_template_id, customer_id)
);

-- Create sms_notifications table
CREATE TABLE public.sms_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  phone_number TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'delivered')),
  twilio_sid TEXT,
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create follow_up_tasks table
CREATE TABLE public.follow_up_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  task_type TEXT NOT NULL CHECK (task_type IN ('call', 'email', 'sms', 'visit', 'other')),
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled', 'overdue')),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.route_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_template_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_up_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for route_templates
CREATE POLICY "Users can view own route templates"
  ON public.route_templates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own route templates"
  ON public.route_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own route templates"
  ON public.route_templates FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own route templates"
  ON public.route_templates FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for route_template_customers
CREATE POLICY "Users can view own route template customers"
  ON public.route_template_customers FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.route_templates 
    WHERE route_templates.id = route_template_customers.route_template_id 
    AND route_templates.user_id = auth.uid()
  ));

CREATE POLICY "Users can create own route template customers"
  ON public.route_template_customers FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.route_templates 
    WHERE route_templates.id = route_template_customers.route_template_id 
    AND route_templates.user_id = auth.uid()
  ));

CREATE POLICY "Users can update own route template customers"
  ON public.route_template_customers FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.route_templates 
    WHERE route_templates.id = route_template_customers.route_template_id 
    AND route_templates.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete own route template customers"
  ON public.route_template_customers FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.route_templates 
    WHERE route_templates.id = route_template_customers.route_template_id 
    AND route_templates.user_id = auth.uid()
  ));

-- RLS Policies for sms_notifications
CREATE POLICY "Users can view own sms notifications"
  ON public.sms_notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own sms notifications"
  ON public.sms_notifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sms notifications"
  ON public.sms_notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for follow_up_tasks
CREATE POLICY "Users can view own follow up tasks"
  ON public.follow_up_tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own follow up tasks"
  ON public.follow_up_tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own follow up tasks"
  ON public.follow_up_tasks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own follow up tasks"
  ON public.follow_up_tasks FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_route_templates_user_week ON public.route_templates(user_id, week_type, day_of_week);
CREATE INDEX idx_route_template_customers_template ON public.route_template_customers(route_template_id);
CREATE INDEX idx_sms_notifications_user_status ON public.sms_notifications(user_id, status);
CREATE INDEX idx_follow_up_tasks_user_due ON public.follow_up_tasks(user_id, due_date);
CREATE INDEX idx_follow_up_tasks_status ON public.follow_up_tasks(status);

-- Trigger for updating updated_at timestamp
CREATE TRIGGER update_route_templates_updated_at
  BEFORE UPDATE ON public.route_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_follow_up_tasks_updated_at
  BEFORE UPDATE ON public.follow_up_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();