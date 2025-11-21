import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation, Clock, CheckCircle } from "lucide-react";
import { format, startOfWeek, getISOWeek } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export default function TodaysRouteWidget() {
  const { toast } = useToast();
  const today = new Date();
  const dayOfWeek = WEEKDAYS[today.getDay() - 1]; // Monday = 0
  const weekNumber = getISOWeek(today);
  const isWeekA = weekNumber % 2 === 1;
  
  const { data: latestRoute, isLoading } = useQuery({
    queryKey: ['todays-route'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weekly_routes')
        .select('*')
        .order('week_start_date', { ascending: false })
        .limit(1)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Today's Route
          </CardTitle>
          <CardDescription>Loading today's schedule...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!latestRoute || !dayOfWeek) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Today's Route
          </CardTitle>
          <CardDescription>No route scheduled for today (Weekend)</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const weekKey = isWeekA ? 'weekA' : 'weekB';
  const todayRoute = latestRoute.routes?.[weekKey]?.[dayOfWeek];
  
  if (!todayRoute) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Today's Route
          </CardTitle>
          <CardDescription>No stops scheduled for today</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const stops = todayRoute.stops || [];
  const mapsUrl = todayRoute.googleRoute;

  const handleOpenMaps = () => {
    if (mapsUrl) {
      window.open(mapsUrl, '_blank');
      toast({
        title: "Opening route in Google Maps",
        description: `${stops.length} stops on your route today`,
      });
    }
  };

  const handleTrackVisit = () => {
    toast({
      title: "Visit tracking",
      description: "Navigate to Route Accounts to log visit details",
    });
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Today's Route
            </CardTitle>
            <CardDescription>
              {format(today, 'EEEE, MMMM d')} • Week {isWeekA ? 'A' : 'B'}
            </CardDescription>
          </div>
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            {stops.length} stops
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {stops.slice(0, 3).map((stop: any, idx: number) => (
            <div key={idx} className="flex items-start gap-3 p-2 rounded-lg bg-muted/50">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{stop.name}</p>
                <p className="text-xs text-muted-foreground truncate">{stop.address}</p>
              </div>
            </div>
          ))}
          {stops.length > 3 && (
            <p className="text-xs text-muted-foreground text-center py-2">
              +{stops.length - 3} more stops
            </p>
          )}
        </div>
        
        <div className="flex gap-2">
          <Button onClick={handleOpenMaps} className="flex-1 gap-2">
            <Navigation className="h-4 w-4" />
            Start Navigation
          </Button>
          <Button onClick={handleTrackVisit} variant="outline" className="gap-2">
            <CheckCircle className="h-4 w-4" />
            Track
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
