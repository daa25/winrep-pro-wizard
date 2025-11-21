import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Loader2 } from "lucide-react";

export default function WeeklyScheduler() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [weekNumber, setWeekNumber] = useState<number>(1);
  const [weekStartDate, setWeekStartDate] = useState<string>("");
  const [originAddress, setOriginAddress] = useState<string>("Rockridge Rd, Lakeland FL");

  const generateMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('generate-weekly-routes', {
        body: {
          weekNumber,
          weekStartDate,
          originAddress,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-routes'] });
      toast({ title: "Weekly routes generated successfully!" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to generate routes",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleGenerate = () => {
    if (!weekStartDate) {
      toast({
        title: "Please select a week start date",
        variant: "destructive",
      });
      return;
    }
    generateMutation.mutate();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          <CardTitle>Generate Weekly Routes</CardTitle>
        </div>
        <CardDescription>
          Create optimized weekly routes following all sales rep rules
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Week Number</Label>
            <Input
              type="number"
              min="1"
              max="53"
              value={weekNumber}
              onChange={(e) => setWeekNumber(Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label>Week Start Date</Label>
            <Input
              type="date"
              value={weekStartDate}
              onChange={(e) => setWeekStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Origin Address</Label>
            <Input
              value={originAddress}
              onChange={(e) => setOriginAddress(e.target.value)}
            />
          </div>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={generateMutation.isPending}
          className="w-full"
        >
          {generateMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating Routes...
            </>
          ) : (
            "Generate Weekly Routes"
          )}
        </Button>

        <div className="text-sm text-muted-foreground space-y-1">
          <p><strong>Rules Applied:</strong></p>
          <ul className="list-disc list-inside space-y-1">
            <li>1 flex day per week</li>
            <li>Juliet Falls every other Thursday</li>
            <li>Villages only in Weeks 1 & 2</li>
            <li>BayCare Winter Haven 2x monthly</li>
            <li>Celebration Golf = FIRST stop Orlando</li>
            <li>Mystic Dunes = LAST stop Orlando</li>
            <li>15th & 30th/31st = Half-days (local only)</li>
            <li>Friday = Early stop, no Tampa/DTE</li>
            <li>5-7 stops per day max</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
