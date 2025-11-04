import { useState, useEffect } from "react";
import { Plus, Receipt, Upload, DollarSign } from "lucide-react";
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
import { receiptSchema } from "@/lib/validationSchemas";

interface ReceiptData {
  id: string;
  receipt_number: string;
  receipt_date: string;
  amount: number;
  payment_method: string;
  notes: string;
  receipt_image_url: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export default function Receipts() {
  const { user } = useAuth();
  const [receipts, setReceipts] = useState<ReceiptData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newReceipt, setNewReceipt] = useState({
    receipt_number: "",
    amount: "",
    payment_method: "",
    notes: ""
  });

  useEffect(() => {
    fetchReceipts();
    
    const channel = supabase
      .channel('receipts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'receipts'
        },
        () => fetchReceipts()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchReceipts = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('receipts')
        .select('*')
        .eq('user_id', user.id)
        .order('receipt_date', { ascending: false });

      if (error) throw error;
      setReceipts(data || []);
    } catch (error) {
      console.error('Error fetching receipts:', error);
      toast.error("Failed to load receipts");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      // Validate input
      const validationData = {
        receipt_number: newReceipt.receipt_number,
        amount: parseFloat(newReceipt.amount) || 0,
        payment_method: newReceipt.payment_method,
        notes: newReceipt.notes,
      };
      
      const result = receiptSchema.safeParse(validationData);
      if (!result.success) {
        toast.error(result.error.errors[0].message);
        return;
      }

      const { error } = await supabase
        .from('receipts')
        .insert([{
          user_id: user.id,
          receipt_number: result.data.receipt_number,
          amount: result.data.amount,
          payment_method: result.data.payment_method,
          notes: result.data.notes,
        }]);

      if (error) throw error;

      toast.success("Receipt created successfully");
      setIsDialogOpen(false);
      setNewReceipt({
        receipt_number: "",
        amount: "",
        payment_method: "",
        notes: ""
      });
    } catch (error) {
      console.error('Error creating receipt:', error);
      toast.error("Failed to create receipt");
    }
  };

  const totalAmount = receipts.reduce((sum, r) => sum + r.amount, 0);

  const stats = [
    {
      title: "Total Receipts",
      value: receipts.length,
      icon: Receipt,
      description: "All time"
    },
    {
      title: "Total Captured",
      value: `$${totalAmount.toFixed(2)}`,
      icon: DollarSign,
      description: "Total amount"
    }
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Receipts</h1>
            <p className="text-muted-foreground mt-1">
              Capture and manage payment receipts
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Receipt
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Capture Receipt</DialogTitle>
                <DialogDescription>
                  Record a payment receipt
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateReceipt} className="space-y-4">
                <div>
                  <Label htmlFor="receipt_number">Receipt Number</Label>
                  <Input
                    id="receipt_number"
                    required
                    value={newReceipt.receipt_number}
                    onChange={(e) => setNewReceipt({ ...newReceipt, receipt_number: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    required
                    value={newReceipt.amount}
                    onChange={(e) => setNewReceipt({ ...newReceipt, amount: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="payment_method">Payment Method</Label>
                  <Input
                    id="payment_method"
                    placeholder="e.g., Cash, Card, Check"
                    value={newReceipt.payment_method}
                    onChange={(e) => setNewReceipt({ ...newReceipt, payment_method: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={newReceipt.notes}
                    onChange={(e) => setNewReceipt({ ...newReceipt, notes: e.target.value })}
                  />
                </div>
                <Button type="submit" className="w-full">Save Receipt</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
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
            <CardTitle>All Receipts</CardTitle>
            <CardDescription>View all captured receipts</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center py-8 text-muted-foreground">Loading receipts...</p>
            ) : receipts.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No receipts yet. Capture your first receipt to get started.</p>
            ) : (
              <div className="space-y-4">
                {receipts.map((receipt) => (
                  <div key={receipt.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                    <div className="flex-1">
                      <h3 className="font-semibold">Receipt #{receipt.receipt_number}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {receipt.payment_method}
                      </p>
                      {receipt.notes && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {receipt.notes}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">${receipt.amount.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(receipt.receipt_date).toLocaleDateString()}
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
