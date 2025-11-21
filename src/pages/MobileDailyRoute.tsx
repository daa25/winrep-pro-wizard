import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Navigation, MapPin, Phone, CheckCircle, ArrowLeft, Wifi, WifiOff } from "lucide-react";
import { format, getISOWeek } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export default function MobileDailyRoute() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [cachedRoute, setCachedRoute] = useState<any>(null);
  
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
          <div className="w-10 flex justify-end">
            {isOnline ? (
              <Wifi className="h-5 w-5 text-success" />
            ) : (
              <WifiOff className="h-5 w-5 text-destructive" />
            )}
          </div>
        </div>
      </div>

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
                    className="flex-1 gap-2"
                    onClick={() => handleCallCustomer(stop.phone)}
                  >
                    <Phone className="h-4 w-4" />
                    Call
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="default"
                  className="gap-2"
                  onClick={() => {
                    toast({
                      title: "Visit logged",
                      description: `Marked ${stop.name} as visited`,
                    });
                  }}
                >
                  <CheckCircle className="h-4 w-4" />
                  Done
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
