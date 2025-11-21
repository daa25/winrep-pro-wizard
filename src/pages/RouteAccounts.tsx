import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, MapPin } from "lucide-react";

interface RouteAccount {
  id: string;
  name: string;
  address: string;
  region: string;
  priority: string;
  frequency: string;
  tags: string[];
  notes: string | null;
  is_active: boolean;
}

export default function RouteAccounts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<RouteAccount | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    region: "Lakeland",
    priority: "medium",
    frequency: "weekly",
    tags: [] as string[],
    notes: "",
  });

  const { data: accounts, isLoading } = useQuery({
    queryKey: ['route-accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('route_accounts')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data as RouteAccount[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (editingAccount) {
        const { error } = await supabase
          .from('route_accounts')
          .update(data)
          .eq('id', editingAccount.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('route_accounts')
          .insert({ ...data, user_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['route-accounts'] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: editingAccount ? "Account updated" : "Account created" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('route_accounts')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['route-accounts'] });
      toast({ title: "Account deleted" });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      address: "",
      region: "Lakeland",
      priority: "medium",
      frequency: "weekly",
      tags: [],
      notes: "",
    });
    setEditingAccount(null);
  };

  const handleEdit = (account: RouteAccount) => {
    setEditingAccount(account);
    setFormData({
      name: account.name,
      address: account.address,
      region: account.region,
      priority: account.priority,
      frequency: account.frequency,
      tags: account.tags || [],
      notes: account.notes || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const toggleTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  const groupedByRegion = accounts?.reduce((acc, account) => {
    if (!acc[account.region]) acc[account.region] = [];
    acc[account.region].push(account);
    return acc;
  }, {} as Record<string, RouteAccount[]>);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <MapPin className="h-8 w-8" />
              Route Accounts
            </h1>
            <p className="text-muted-foreground">
              Manage accounts for weekly route scheduling
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="mr-2 h-4 w-4" />
                Add Account
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingAccount ? "Edit Account" : "Add New Account"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Business Name (optional)</Label>
                    <Input
                      placeholder="e.g., DTE Mt Dora"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Address</Label>
                    <Input
                      required
                      placeholder="e.g., 15607 SW 13th Cir, Ocala, FL"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Region</Label>
                    <Select value={formData.region} onValueChange={(value) => setFormData({ ...formData, region: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Lakeland">Lakeland</SelectItem>
                        <SelectItem value="HainesCity">Haines City</SelectItem>
                        <SelectItem value="Tampa">Tampa</SelectItem>
                        <SelectItem value="Orlando">Orlando</SelectItem>
                        <SelectItem value="Villages">Villages</SelectItem>
                        <SelectItem value="Ocala">Ocala</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Frequency</Label>
                    <Select value={formData.frequency} onValueChange={(value) => setFormData({ ...formData, frequency: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="biweekly">Biweekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Tags</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={formData.tags.includes('firstStop') ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleTag('firstStop')}
                    >
                      First Stop
                    </Button>
                    <Button
                      type="button"
                      variant={formData.tags.includes('lastStop') ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleTag('lastStop')}
                    >
                      Last Stop
                    </Button>
                    <Button
                      type="button"
                      variant={formData.tags.includes('julietFalls') ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleTag('julietFalls')}
                    >
                      Juliet Falls
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
                  {editingAccount ? "Update Account" : "Create Account"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {groupedByRegion && Object.entries(groupedByRegion).map(([region, accounts]) => (
          <Card key={region}>
            <CardHeader>
              <CardTitle>{region}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {accounts.map((account) => (
                  <div key={account.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{account.name}</h4>
                        {account.tags && account.tags.length > 0 && (
                          <div className="flex gap-1">
                            {account.tags.map(tag => (
                              <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{account.address}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">{account.frequency}</Badge>
                        <Badge variant={
                          account.priority === 'high' ? 'destructive' :
                          account.priority === 'low' ? 'outline' : 'secondary'
                        } className="text-xs">
                          {account.priority}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(account)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteMutation.mutate(account.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </Layout>
  );
}
