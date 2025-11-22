import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Package, Clock, CheckCircle2 } from 'lucide-react';

export default function CustomerPortal() {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [timeSlot, setTimeSlot] = useState('');
  const [notes, setNotes] = useState('');
  const queryClient = useQueryClient();

  const { data: customerUser } = useQuery({
    queryKey: ['customer-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data } = await supabase
        .from('customer_users')
        .select('*, customers(*)')
        .eq('id', user.id)
        .single();
      return data;
    },
  });

  const { data: appointments } = useQuery({
    queryKey: ['customer-appointments'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data } = await supabase
        .from('customer_appointments')
        .select('*')
        .eq('customer_id', customerUser?.customer_id)
        .order('requested_date', { ascending: false });
      return data || [];
    },
    enabled: !!customerUser,
  });

  const { data: orders } = useQuery({
    queryKey: ['customer-orders'],
    queryFn: async () => {
      const { data } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('customer_name', customerUser?.customers?.name)
        .order('order_date', { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!customerUser,
  });

  const requestAppointmentMutation = useMutation({
    mutationFn: async () => {
      if (!selectedDate || !timeSlot || !customerUser) {
        throw new Error('Missing required fields');
      }

      const { error } = await supabase.from('customer_appointments').insert({
        customer_id: customerUser.customer_id,
        rep_user_id: customerUser.customers.user_id,
        requested_date: format(selectedDate, 'yyyy-MM-dd'),
        requested_time_slot: timeSlot,
        notes,
        status: 'pending',
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-appointments'] });
      toast.success('Appointment request submitted');
      setSelectedDate(undefined);
      setTimeSlot('');
      setNotes('');
    },
    onError: () => {
      toast.error('Failed to request appointment');
    },
  });

  const statusColors = {
    pending: 'text-yellow-600',
    confirmed: 'text-blue-600',
    completed: 'text-green-600',
    cancelled: 'text-red-600',
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Customer Portal</h1>
          <p className="text-muted-foreground">
            Welcome back, {customerUser?.customers?.name}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Request Appointment */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Request Appointment
              </CardTitle>
              <CardDescription>Schedule a visit from your sales rep</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => date < new Date()}
                className="rounded-md border"
              />
              
              <Select value={timeSlot} onValueChange={setTimeSlot}>
                <SelectTrigger>
                  <SelectValue placeholder="Select time slot" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="morning">Morning (9 AM - 12 PM)</SelectItem>
                  <SelectItem value="afternoon">Afternoon (12 PM - 3 PM)</SelectItem>
                  <SelectItem value="evening">Evening (3 PM - 5 PM)</SelectItem>
                </SelectContent>
              </Select>

              <Textarea
                placeholder="Add any special requests or notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />

              <Button
                className="w-full"
                onClick={() => requestAppointmentMutation.mutate()}
                disabled={!selectedDate || !timeSlot || requestAppointmentMutation.isPending}
              >
                {requestAppointmentMutation.isPending ? 'Submitting...' : 'Request Appointment'}
              </Button>
            </CardContent>
          </Card>

          {/* Appointments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Your Appointments
              </CardTitle>
              <CardDescription>Upcoming and past appointments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {appointments?.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No appointments yet</p>
                ) : (
                  appointments?.map((apt) => (
                    <div key={apt.id} className="border rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{format(new Date(apt.requested_date), 'PPP')}</p>
                          <p className="text-sm text-muted-foreground capitalize">{apt.requested_time_slot}</p>
                        </div>
                        <span className={`text-sm font-medium capitalize ${statusColors[apt.status as keyof typeof statusColors]}`}>
                          {apt.status}
                        </span>
                      </div>
                      {apt.notes && <p className="text-sm mt-2">{apt.notes}</p>}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Order History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Recent Orders
            </CardTitle>
            <CardDescription>Your order history</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {orders?.length === 0 ? (
                <p className="text-muted-foreground text-sm">No orders yet</p>
              ) : (
                orders?.map((order) => (
                  <div key={order.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium">Order #{order.id.slice(0, 8)}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(order.order_date), 'PPP')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">${order.total_amount}</p>
                        <span className="text-sm text-muted-foreground capitalize">{order.status}</span>
                      </div>
                    </div>
                    <div className="text-sm space-y-1">
                      {order.order_items?.map((item: any) => (
                        <div key={item.id} className="flex justify-between">
                          <span>{item.product_name}</span>
                          <span className="text-muted-foreground">x{item.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
