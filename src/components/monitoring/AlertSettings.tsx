import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Bell } from "lucide-react";

interface AlertConfig {
  id: string;
  function_name: string;
  error_threshold_percent: number;
  time_window_minutes: number;
  is_enabled: boolean;
}

export default function AlertSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingFunction, setEditingFunction] = useState<string | null>(null);
  const [threshold, setThreshold] = useState<number>(10);
  const [timeWindow, setTimeWindow] = useState<number>(60);

  const { data: configs } = useQuery({
    queryKey: ['alert-configs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alert_configurations')
        .select('*')
        .order('function_name');
      
      if (error) throw error;
      return data as AlertConfig[];
    },
  });

  const { data: logs } = useQuery({
    queryKey: ['edge-function-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('edge_function_logs')
        .select('function_name')
        .order('function_name');
      
      if (error) throw error;
      return data;
    },
  });

  const uniqueFunctions = [...new Set(logs?.map(log => log.function_name) || [])];

  const saveMutation = useMutation({
    mutationFn: async ({ functionName, data }: { functionName: string; data: Partial<AlertConfig> }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('alert_configurations')
        .upsert({
          user_id: user.id,
          function_name: functionName,
          ...data,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-configs'] });
      setEditingFunction(null);
      toast({ title: "Alert configuration saved" });
    },
    onError: () => {
      toast({ title: "Failed to save configuration", variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isEnabled }: { id: string; isEnabled: boolean }) => {
      const { error } = await supabase
        .from('alert_configurations')
        .update({ is_enabled: isEnabled })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-configs'] });
      toast({ title: "Alert configuration updated" });
    },
  });

  const handleSave = (functionName: string) => {
    saveMutation.mutate({
      functionName,
      data: {
        error_threshold_percent: threshold,
        time_window_minutes: timeWindow,
        is_enabled: true,
      },
    });
  };

  const getConfigForFunction = (functionName: string) => {
    return configs?.find(c => c.function_name === functionName);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          <CardTitle>Error Alert Settings</CardTitle>
        </div>
        <CardDescription>
          Configure alerts to be notified when error rates exceed thresholds
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {uniqueFunctions.map((functionName) => {
          const config = getConfigForFunction(functionName);
          const isEditing = editingFunction === functionName;

          return (
            <div key={functionName} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">{functionName}</h4>
                {config && (
                  <Switch
                    checked={config.is_enabled}
                    onCheckedChange={(checked) =>
                      toggleMutation.mutate({ id: config.id, isEnabled: checked })
                    }
                  />
                )}
              </div>

              {isEditing || !config ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Error Threshold (%)</Label>
                      <Input
                        type="number"
                        min="1"
                        max="100"
                        value={threshold}
                        onChange={(e) => setThreshold(Number(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Time Window (minutes)</Label>
                      <Input
                        type="number"
                        min="1"
                        value={timeWindow}
                        onChange={(e) => setTimeWindow(Number(e.target.value))}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleSave(functionName)}>
                      Save
                    </Button>
                    {config && (
                      <Button size="sm" variant="outline" onClick={() => setEditingFunction(null)}>
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Alert when errors exceed {config.error_threshold_percent}% in {config.time_window_minutes} minutes</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingFunction(functionName);
                      setThreshold(config.error_threshold_percent);
                      setTimeWindow(config.time_window_minutes);
                    }}
                  >
                    Edit
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
