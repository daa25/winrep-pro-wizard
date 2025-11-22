import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Navigation, MapPin, Phone, CheckCircle, ArrowLeft, Wifi, WifiOff, Locate } from "lucide-react";
import { format, getISOWeek } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useGPSTracking } from "@/hooks/useGPSTracking";

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export default function MobileDailyRoute() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [cachedRoute, setCachedRoute] = useState<any>(null);
  const [routeStartTime] = useState(new Date());
  const { position, tracking, startTracking, stopTracking, logLocation } = useGPSTracking();

  const today = new Date();
  const dayOfWeek = WEEKDAYS[today.getDay() - 1];
  const weekNumber = getISOWeek(today);
  const isWeekA = weekNumber % 2 === 1;

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast({ title: "Back online", description: "Route data will refresh" });
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast({ 
        title: "Offline mode", 
        description: "Using cached route data",
        variant: "destructive" 
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast]);

  const { data: latestRoute, isLoading } = useQuery({
    queryKey: ['mobile-daily-route'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weekly_routes')
        .select('*')
        .order('week_start_date', { ascending: false })
        .limit(1)
        .single();
      
      if (error) throw error;
      
      // Cache the route in localStorage for offline access
      if (data) {
        localStorage.setItem('cached_route', JSON.stringify(data));
        setCachedRoute(data);
      }
      
      return data;
    },
    enabled: isOnline,
  });

  // Load cached route if offline
  useEffect(() => {
    if (!isOnline && !latestRoute) {
      const cached = localStorage.getItem('cached_route');
      if (cached) {
        setCachedRoute(JSON.parse(cached));
      }
    }
  }, [isOnline, latestRoute]);

  const routeData = latestRoute || cachedRoute;
  const weekKey = isWeekA ? 'weekA' : 'weekB';
  const todayRoute = routeData?.routes?.[weekKey]?.[dayOfWeek];
  const stops = todayRoute?.stops || [];
  const mapsUrl = todayRoute?.googleRoute;

  const handleOpenMaps = () => {
    if (mapsUrl) {
      window.open(mapsUrl, '_blank');
    } else {
      toast({
        title: "Navigation unavailable",
        description: "Route URL not available offline",
        variant: "destructive",
      });
    }
  };

  const handleCallCustomer = (phone: string) => {
    if (phone) {
      window.location.href = `tel:${phone}`;
    }
  };

  const logVisitMutation = useMutation({
    mutationFn: async (stop: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Find matching route account
      const { data: account } = await supabase
        .from('route_accounts')
        .select('id')
        .eq('user_id', user.id)
        .ilike('name', `%${stop.name}%`)
        .single();

      const { error } = await supabase.from('route_visit_history').insert({
        user_id: user.id,
        account_id: account?.id || null,
        visit_date: format(today, 'yyyy-MM-dd'),
        notes: `Visited from mobile route on ${format(today, 'PPP')}`,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visit-history'] });
      toast({ title: "Visit logged", description: "Successfully recorded visit" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to log visit", variant: "destructive" });
    },
  });

  // Log route performance when component unmounts
  useEffect(() => {
    return () => {
      if (stops.length > 0) {
        (async () => {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          await supabase.from('route_performance').insert({
            user_id: user.id,
            route_name: `${dayOfWeek} - Week ${isWeekA ? 'A' : 'B'}`,
            day_of_week: today.getDay() - 1,
            start_time: routeStartTime.toISOString(),
            end_time: new Date().toISOString(),
            stops_completed: stops.length,
            total_duration_minutes: Math.round((Date.now() - routeStartTime.getTime()) / 60000),
          });
        })();
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="flex items-center justify-between p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="text-center flex-1">
            <h1 className="text-lg font-bold">Today's Route</h1>
            <p className="text-xs text-muted-foreground">
              {format(today, 'EEEE, MMM d')} • Week {isWeekA ? 'A' : 'B'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={tracking ? "destructive" : "outline"}
              size="sm"
              onClick={tracking ? stopTracking : startTracking}
            >
              <Locate className="h-4 w-4 mr-1" />
              {tracking ? "Stop GPS" : "GPS"}
            </Button>
            <div className="w-8 flex justify-end">
              {isOnline ? (
                <Wifi className="h-5 w-5 text-success" />
              ) : (
                <WifiOff className="h-5 w-5 text-destructive" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* GPS Position */}
      {position && (
        <div className="px-4 py-2 bg-muted/30 border-b">
          <div className="flex items-center gap-2 text-xs">
            <Locate className="h-3 w-3 text-green-600" />
            <span className="font-mono">{position.latitude.toFixed(6)}, {position.longitude.toFixed(6)}</span>
            <Badge variant="secondary" className="text-xs">±{Math.round(position.accuracy)}m</Badge>
          </div>
        </div>
      )}

      {/* Status Bar */}
      <div className="p-4 bg-muted/50">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="gap-1">
            <MapPin className="h-3 w-3" />
            {stops.length} stops
          </Badge>
          {!isOnline && (
            <Badge variant="secondary" className="gap-1">
              <WifiOff className="h-3 w-3" />
              Offline Mode
            </Badge>
          )}
        </div>
      </div>

      {/* Navigation Button */}
      <div className="p-4">
        <Button 
          onClick={handleOpenMaps} 
          className="w-full gap-2 h-12"
          disabled={!mapsUrl}
        >
          <Navigation className="h-5 w-5" />
          Start Full Route Navigation
        </Button>
      </div>

      {/* Stops List */}
      <div className="space-y-3 px-4">
        {stops.map((stop: any, idx: number) => (
          <Card key={idx} className="overflow-hidden">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold">{stop.name}</h3>
                  <p className="text-sm text-muted-foreground">{stop.address}</p>
                  {stop.city && (
                    <p className="text-xs text-muted-foreground">{stop.city}</p>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={() => {
                    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(stop.address)}`;
                    window.open(url, '_blank');
                  }}
                >
                  <Navigation className="h-4 w-4" />
                  Navigate
                </Button>
                {stop.phone && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2"
                    onClick={() => handleCallCustomer(stop.phone)}
                  >
                    <Phone className="h-4 w-4" />
                    Call
                  </Button>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => logLocation(null, 'arrival')}
                  disabled={!position}
                  className="flex-1"
                >
                  Arrive
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => logLocation(null, 'departure')}
                  disabled={!position}
                  className="flex-1"
                >
                  Depart
                </Button>
                <Button
                  size="sm"
                  variant="default"
                  className="flex-1 gap-2"
                  onClick={() => logVisitMutation.mutate(stop)}
                  disabled={logVisitMutation.isPending}
                >
                  <CheckCircle className="h-4 w-4" />
                  Log Visit
                </Button>
              </div>

              {stop.notes && (
                <div className="text-xs text-muted-foreground border-t pt-2">
                  <strong>Notes:</strong> {stop.notes}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {stops.length === 0 && (
        <div className="p-8 text-center text-muted-foreground">
          <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No stops scheduled for today</p>
        </div>
      )}
    </div>
  );
}
