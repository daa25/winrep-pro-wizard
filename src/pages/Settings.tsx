import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, User, Bell, Link } from "lucide-react";
import winzerLogo from "@/assets/winzer-logo.png";

const Settings = () => {
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [territory, setTerritory] = useState("");

  // Fetch current user profile
  const { data: profile, isLoading } = useQuery({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return { ...data, authEmail: user.email };
    },
  });

  // Populate form when profile loads
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setEmail(profile.email || profile.authEmail || '');
      setPhone(profile.phone || '');
      setTerritory(profile.territory || '');
    }
  }, [profile]);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          email: email,
          phone: phone,
          territory: territory,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      toast.success("Profile updated successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update profile");
    },
  });

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate();
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground mt-2">
              Manage your account and application preferences
            </p>
          </div>
          <img src={winzerLogo} alt="Winzer" className="h-10 w-auto opacity-80 hidden md:block" />
        </div>

        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList className="shadow-card">
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="integration" className="gap-2">
              <Link className="h-4 w-4" />
              Integration
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4 animate-fade-in">
            <Card className="hover-lift">
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your personal information and preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <form onSubmit={handleSaveProfile} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input 
                        id="name" 
                        placeholder="Enter your name" 
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="shadow-inner-light"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input 
                        id="email" 
                        type="email" 
                        placeholder="Enter your email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="shadow-inner-light"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input 
                        id="phone" 
                        type="tel" 
                        placeholder="Enter your phone number" 
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="shadow-inner-light"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="territory">Territory</Label>
                      <Input 
                        id="territory" 
                        placeholder="Your sales territory" 
                        value={territory}
                        onChange={(e) => setTerritory(e.target.value)}
                        className="shadow-inner-light"
                      />
                    </div>
                    <Separator />
                    <Button 
                      type="submit"
                      disabled={updateProfileMutation.isPending}
                      className="glow-button"
                    >
                      {updateProfileMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Save Changes
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4 animate-fade-in">
            <Card className="hover-lift">
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>
                  Choose what notifications you want to receive
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive email updates about your account activity
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Sales Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified when deals are closed
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Performance Reports</Label>
                    <p className="text-sm text-muted-foreground">
                      Weekly performance summary emails
                    </p>
                  </div>
                  <Switch />
                </div>
                <Separator />
                <Button className="glow-button">Save Preferences</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="integration" className="space-y-4 animate-fade-in">
            <Card className="hover-lift">
              <CardHeader>
                <CardTitle>Pepperi Integration</CardTitle>
                <CardDescription>
                  Connect your Pepperi account to sync data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="pepperi-email">Pepperi Email</Label>
                  <Input 
                    id="pepperi-email" 
                    type="email" 
                    placeholder="Enter your Pepperi email"
                    className="shadow-inner-light"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pepperi-token">API Token</Label>
                  <Input 
                    id="pepperi-token" 
                    type="password" 
                    placeholder="Enter your API token"
                    className="shadow-inner-light"
                  />
                </div>
                <Separator />
                <div className="flex gap-2">
                  <Button className="glow-button">Connect Pepperi</Button>
                  <Button variant="outline">Test Connection</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Settings;
