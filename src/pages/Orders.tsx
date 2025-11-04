import { useState, useEffect } from "react";
import { Plus, FileText, DollarSign, Package } from "lucide-react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { orderSchema } from "@/lib/validationSchemas";

interface Order {
  id: string;
  customer_name: string;
  customer_email: string;
  order_date: string;
  total_amount: number;
  status: string;
  notes: string;
}

export default function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newOrder, setNewOrder] = useState({
    customer_name: "",
    customer_email: "",
    total_amount: "",
    status: "pending",
    notes: ""
  });

  useEffect(() => {
    fetchOrders();
    
    const channel = supabase
      .channel('orders-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        () => fetchOrders()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchOrders = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('order_date', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      // Validate input
      const validationData = {
        customer_name: newOrder.customer_name,
        customer_email: newOrder.customer_email,
        total_amount: parseFloat(newOrder.total_amount) || 0,
        status: newOrder.status,
        notes: newOrder.notes,
      };
      
      const result = orderSchema.safeParse(validationData);
      if (!result.success) {
        toast.error(result.error.errors[0].message);
        return;
      }

      const { error } = await supabase
        .from('orders')
        .insert([{
          user_id: user.id,
          customer_name: result.data.customer_name,
          customer_email: result.data.customer_email,
          total_amount: result.data.total_amount,
          status: result.data.status,
          notes: result.data.notes,
        }]);

      if (error) throw error;

      toast.success("Order created successfully");
      setIsDialogOpen(false);
      setNewOrder({
        customer_name: "",
        customer_email: "",
        total_amount: "",
        status: "pending",
        notes: ""
      });
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error("Failed to create order");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const stats = [
    {
      title: "Total Orders",
      value: orders.length,
      icon: Package,
      description: "All time"
    },
    {
      title: "Pending",
      value: orders.filter(o => o.status === 'pending').length,
      icon: FileText,
      description: "Awaiting processing"
    },
    {
      title: "Total Revenue",
      value: `$${orders.reduce((sum, o) => sum + o.total_amount, 0).toFixed(2)}`,
      icon: DollarSign,
      description: "From all orders"
    }
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
            <p className="text-muted-foreground mt-1">
              Process and manage customer orders in real-time
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Order
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Order</DialogTitle>
                <DialogDescription>
                  Enter the order details below
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateOrder} className="space-y-4">
                <div>
                  <Label htmlFor="customer_name">Customer Name</Label>
                  <Input
                    id="customer_name"
                    required
                    value={newOrder.customer_name}
                    onChange={(e) => setNewOrder({ ...newOrder, customer_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="customer_email">Customer Email</Label>
                  <Input
                    id="customer_email"
                    type="email"
                    value={newOrder.customer_email}
                    onChange={(e) => setNewOrder({ ...newOrder, customer_email: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="total_amount">Total Amount</Label>
                  <Input
                    id="total_amount"
                    type="number"
                    step="0.01"
                    required
                    value={newOrder.total_amount}
                    onChange={(e) => setNewOrder({ ...newOrder, total_amount: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={newOrder.status} onValueChange={(value) => setNewOrder({ ...newOrder, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={newOrder.notes}
                    onChange={(e) => setNewOrder({ ...newOrder, notes: e.target.value })}
                  />
                </div>
                <Button type="submit" className="w-full">Create Order</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {stats.map((stat) => (
            <Card key={stat.title}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                    <p className="text-2xl font-bold mt-2">{stat.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                  </div>
                  <stat.icon className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
            <CardDescription>View and manage all customer orders</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center py-8 text-muted-foreground">Loading orders...</p>
            ) : orders.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No orders yet. Create your first order to get started.</p>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold">{order.customer_name}</h3>
                        <Badge className={getStatusColor(order.status)}>
                          {order.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {order.customer_email}
                      </p>
                      {order.notes && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {order.notes}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">${order.total_amount.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.order_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
