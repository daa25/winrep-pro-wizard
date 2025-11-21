import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, DollarSign, MapPin, Clock } from "lucide-react";
import { startOfWeek, endOfWeek, format } from "date-fns";

export default function WeeklyPerformanceReport() {
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

  const { data: visits, isLoading } = useQuery({
    queryKey: ['weekly-performance', format(weekStart, 'yyyy-MM-dd')],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('route_visit_history')
        .select('*')
        .eq('user_id', user.user.id)
        .gte('visit_date', format(weekStart, 'yyyy-MM-dd'))
        .lte('visit_date', format(weekEnd, 'yyyy-MM-dd'));
      
      if (error) throw error;
      return data || [];
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>This Week's Performance</CardTitle>
          <CardDescription>Loading metrics...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const totalVisits = visits?.length || 0;
  const totalRevenue = visits?.reduce((sum, v) => sum + (v.order_amount || 0), 0) || 0;
  const avgOrderValue = totalVisits > 0 ? totalRevenue / totalVisits : 0;
  const targetVisits = 25; // 5 days × 5 stops per day
  const completionRate = Math.min((totalVisits / targetVisits) * 100, 100);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          This Week's Performance
        </CardTitle>
        <CardDescription>
          {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              Total Visits
            </div>
            <p className="text-3xl font-bold">{totalVisits}</p>
            <Progress value={completionRate} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {completionRate.toFixed(0)}% of target ({targetVisits})
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              Total Revenue
            </div>
            <p className="text-3xl font-bold">${totalRevenue.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">
              Avg: ${avgOrderValue.toFixed(0)} per visit
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Efficiency Score</span>
            <span className="font-medium">
              {totalVisits > 0 ? Math.min((avgOrderValue / 500) * 100, 100).toFixed(0) : 0}%
            </span>
          </div>
          <Progress 
            value={totalVisits > 0 ? Math.min((avgOrderValue / 500) * 100, 100) : 0} 
            className="h-2" 
          />
          <p className="text-xs text-muted-foreground">
            Based on average order value vs. target ($500)
          </p>
        </div>

        {visits && visits.length > 0 && (
          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-2">Recent Visits</p>
            <div className="space-y-1">
              {visits.slice(-3).reverse().map((visit) => (
                <div key={visit.id} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {format(new Date(visit.visit_date), 'MMM d')}
                  </span>
                  <span className="font-medium">${visit.order_amount?.toLocaleString() || 0}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
