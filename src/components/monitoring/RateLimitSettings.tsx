import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Shield } from "lucide-react";

interface RateLimitConfig {
  id: string;
  function_name: string;
  max_requests: number;
  window_minutes: number;
}

export default function RateLimitSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingFunction, setEditingFunction] = useState<string | null>(null);
  const [maxRequests, setMaxRequests] = useState<number>(60);
  const [windowMinutes, setWindowMinutes] = useState<number>(1);

  const { data: configs } = useQuery({
    queryKey: ['rate-limit-configs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rate_limit_configurations')
        .select('*')
        .order('function_name');
      
      if (error) throw error;
      return data as RateLimitConfig[];
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
    mutationFn: async ({ functionName, data }: { functionName: string; data: Partial<RateLimitConfig> }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('rate_limit_configurations')
        .upsert({
          user_id: user.id,
          function_name: functionName,
          ...data,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rate-limit-configs'] });
      setEditingFunction(null);
      toast({ title: "Rate limit configuration saved" });
    },
    onError: () => {
      toast({ title: "Failed to save configuration", variant: "destructive" });
    },
  });

  const handleSave = (functionName: string) => {
    saveMutation.mutate({
      functionName,
      data: {
        max_requests: maxRequests,
        window_minutes: windowMinutes,
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
          <Shield className="h-5 w-5" />
          <CardTitle>Rate Limit Configuration</CardTitle>
        </div>
        <CardDescription>
          Configure rate limits for each edge function to prevent abuse
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
              </div>

              {isEditing || !config ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Max Requests</Label>
                      <Input
                        type="number"
                        min="1"
                        value={maxRequests}
                        onChange={(e) => setMaxRequests(Number(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Window (minutes)</Label>
                      <Input
                        type="number"
                        min="1"
                        value={windowMinutes}
                        onChange={(e) => setWindowMinutes(Number(e.target.value))}
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
                  <span>{config.max_requests} requests per {config.window_minutes} minute(s)</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingFunction(functionName);
                      setMaxRequests(config.max_requests);
                      setWindowMinutes(config.window_minutes);
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
