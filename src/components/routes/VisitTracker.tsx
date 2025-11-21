import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface RouteAccount {
  id: string;
  business_name: string | null;
  name: string;
  priority_score: number;
}

export default function VisitTracker() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [visitDate, setVisitDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [orderAmount, setOrderAmount] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const { data: accounts } = useQuery({
    queryKey: ['route-accounts-for-visit'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('route_accounts')
        .select('id, business_name, name, priority_score')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data as RouteAccount[];
    },
  });

  const { data: recentVisits } = useQuery({
    queryKey: ['recent-visits'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('route_visit_history')
        .select(`
          *,
          route_accounts (
            id,
            business_name,
            name,
            priority_score
          )
        `)
        .order('visit_date', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data;
    },
  });

  const recordVisitMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Insert visit record
      const { error: insertError } = await supabase
        .from('route_visit_history')
        .insert({
          user_id: user.id,
          account_id: selectedAccountId,
          visit_date: visitDate,
          order_amount: parseFloat(orderAmount) || 0,
          notes: notes || null,
        });

      if (insertError) throw insertError;

      // Update priority score using database function
      const { error: updateError } = await supabase.rpc('update_account_priority_score', {
        p_account_id: selectedAccountId,
      });

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recent-visits'] });
      queryClient.invalidateQueries({ queryKey: ['route-accounts-for-visit'] });
      queryClient.invalidateQueries({ queryKey: ['route-accounts'] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "Visit recorded and priority updated!" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setSelectedAccountId("");
    setVisitDate(new Date().toISOString().split('T')[0]);
    setOrderAmount("");
    setNotes("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccountId) {
      toast({ title: "Please select an account", variant: "destructive" });
      return;
    }
    recordVisitMutation.mutate();
  };

  const getPriorityColor = (score: number) => {
    if (score >= 2.0) return "destructive";
    if (score >= 1.5) return "default";
    return "secondary";
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            <CardTitle>Visit Tracker & Priority Learning</CardTitle>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="mr-2 h-4 w-4" />
                Record Visit
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record Customer Visit</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Account</Label>
                  <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select account..." />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts?.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.business_name || account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Visit Date</Label>
                  <Input
                    type="date"
                    value={visitDate}
                    onChange={(e) => setVisitDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Order Amount ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={orderAmount}
                    onChange={(e) => setOrderAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Notes (optional)</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any special notes about this visit..."
                  />
                </div>
                <Button type="submit" className="w-full" disabled={recordVisitMutation.isPending}>
                  {recordVisitMutation.isPending ? "Recording..." : "Record Visit"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            <p><strong>How Priority Learning Works:</strong></p>
            <p className="mt-1">System tracks order values and automatically adjusts account priorities. Higher-value accounts gradually move up in route scheduling.</p>
          </div>

          {recentVisits && recentVisits.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Recent Visits</h4>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {recentVisits.map((visit: any) => (
                  <div key={visit.id} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h5 className="font-medium">
                            {visit.route_accounts?.business_name || visit.route_accounts?.name}
                          </h5>
                          <Badge variant={getPriorityColor(visit.route_accounts?.priority_score || 1.0)}>
                            Priority: {visit.route_accounts?.priority_score?.toFixed(2)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(visit.visit_date).toLocaleDateString()} • ${visit.order_amount?.toFixed(2) || '0.00'}
                        </p>
                        {visit.notes && (
                          <p className="text-xs text-muted-foreground mt-1">{visit.notes}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
