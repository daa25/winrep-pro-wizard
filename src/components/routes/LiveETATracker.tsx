import { useEffect, useState, useCallback } from 'react';
import { Clock, Navigation2, AlertTriangle, RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { format, addMinutes } from 'date-fns';

interface Stop {
  id: string;
  address: string;
  name?: string;
  lat?: number;
  lng?: number;
  duration?: number;
}

interface LegInfo {
  from: string;
  to: string;
  distance: number;
  duration: number;
}

interface LiveETATrackerProps {
  stops: Stop[];
  routeInfo: {
    totalDistance: number;
    totalTime: number;
    legs: LegInfo[];
  } | null;
  departureTime: string;
  defaultStopDuration: number;
  onETAsUpdated?: (etas: StopETA[]) => void;
}

export interface StopETA {
  stopId: string;
  originalETA: Date;
  liveETA: Date;
  delay: number; // in minutes, positive = late, negative = early
  trafficCondition: 'light' | 'moderate' | 'heavy';
  completed: boolean;
}

// Simulate traffic conditions based on time of day
const getTrafficMultiplier = (hour: number): { multiplier: number; condition: 'light' | 'moderate' | 'heavy' } => {
  // Rush hours: 7-9 AM and 4-7 PM
  if ((hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 19)) {
    return { multiplier: 1.3 + Math.random() * 0.3, condition: 'heavy' };
  }
  // Moderate traffic: 10 AM - 4 PM
  if (hour >= 10 && hour <= 16) {
    return { multiplier: 1.1 + Math.random() * 0.15, condition: 'moderate' };
  }
  // Light traffic: early morning, evening, night
  return { multiplier: 1.0 + Math.random() * 0.1, condition: 'light' };
};

export function LiveETATracker({ 
  stops, 
  routeInfo, 
  departureTime, 
  defaultStopDuration,
  onETAsUpdated 
}: LiveETATrackerProps) {
  const [etas, setEtas] = useState<StopETA[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentStopIndex, setCurrentStopIndex] = useState(0);

  const calculateETAs = useCallback(() => {
    if (!routeInfo?.legs || stops.length === 0) return [];

    const [hours, minutes] = departureTime.split(':').map(Number);
    let currentTime = new Date();
    currentTime.setHours(hours, minutes, 0, 0);

    const newETAs: StopETA[] = [];
    let cumulativeDelay = 0;

    stops.forEach((stop, index) => {
      if (index === 0) {
        // First stop is the starting point
        newETAs.push({
          stopId: stop.id,
          originalETA: new Date(currentTime),
          liveETA: new Date(currentTime),
          delay: 0,
          trafficCondition: 'light',
          completed: index < currentStopIndex,
        });
        return;
      }

      const leg = routeInfo.legs[index - 1];
      if (!leg) return;

      // Calculate original ETA
      const originalDuration = leg.duration;
      const originalETA = addMinutes(currentTime, originalDuration);

      // Apply traffic conditions
      const currentHour = currentTime.getHours();
      const traffic = getTrafficMultiplier(currentHour);
      const adjustedDuration = originalDuration * traffic.multiplier;
      
      // Add some random variation to simulate real-time changes
      const variation = (Math.random() - 0.5) * 5; // ±2.5 minutes random variation
      const delay = (adjustedDuration - originalDuration) + variation + cumulativeDelay;
      
      const liveETA = addMinutes(originalETA, delay);

      // Add stop duration
      const stopDuration = stop.duration || defaultStopDuration;
      
      newETAs.push({
        stopId: stop.id,
        originalETA,
        liveETA,
        delay: Math.round(delay),
        trafficCondition: traffic.condition,
        completed: index < currentStopIndex,
      });

      // Update current time for next iteration
      currentTime = addMinutes(liveETA, stopDuration);
      cumulativeDelay = delay * 0.5; // Delays tend to compound but also can be recovered
    });

    return newETAs;
  }, [stops, routeInfo, departureTime, defaultStopDuration, currentStopIndex]);

  // Initial calculation and periodic updates
  useEffect(() => {
    const newETAs = calculateETAs();
    setEtas(newETAs);
    onETAsUpdated?.(newETAs);

    // Update every 30 seconds
    const interval = setInterval(() => {
      setIsUpdating(true);
      setTimeout(() => {
        const updatedETAs = calculateETAs();
        setEtas(updatedETAs);
        setLastUpdate(new Date());
        setIsUpdating(false);
        onETAsUpdated?.(updatedETAs);
      }, 500);
    }, 30000);

    return () => clearInterval(interval);
  }, [calculateETAs, onETAsUpdated]);

  const refreshETAs = () => {
    setIsUpdating(true);
    setTimeout(() => {
      const newETAs = calculateETAs();
      setEtas(newETAs);
      setLastUpdate(new Date());
      setIsUpdating(false);
      onETAsUpdated?.(newETAs);
    }, 500);
  };

  if (!routeInfo || etas.length === 0) return null;

  const totalDelay = etas.reduce((sum, eta) => sum + Math.max(0, eta.delay), 0);
  const averageCondition = etas.reduce((acc, eta) => {
    if (eta.trafficCondition === 'heavy') return 'heavy';
    if (eta.trafficCondition === 'moderate' && acc !== 'heavy') return 'moderate';
    return acc;
  }, 'light' as 'light' | 'moderate' | 'heavy');

  return (
    <Card>
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Navigation2 className="h-4 w-4" />
            Live ETA Updates
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge 
              variant={averageCondition === 'heavy' ? 'destructive' : averageCondition === 'moderate' ? 'secondary' : 'outline'}
              className="text-xs"
            >
              {averageCondition} traffic
            </Badge>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6"
              onClick={refreshETAs}
              disabled={isUpdating}
            >
              <RefreshCw className={cn("h-3 w-3", isUpdating && "animate-spin")} />
            </Button>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          Last updated: {format(lastUpdate, 'h:mm:ss a')}
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-2">
        {/* Overall delay indicator */}
        {totalDelay > 0 && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <span className="text-xs">
              Estimated total delay: <span className="font-semibold">+{totalDelay} min</span>
            </span>
          </div>
        )}

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span>Route Progress</span>
            <span className="text-muted-foreground">{currentStopIndex}/{stops.length - 1} stops</span>
          </div>
          <Progress 
            value={(currentStopIndex / Math.max(1, stops.length - 1)) * 100} 
            className="h-2"
          />
        </div>

        {/* ETA list */}
        <div className="space-y-1 max-h-[200px] overflow-y-auto">
          {etas.map((eta, index) => {
            const stop = stops.find(s => s.id === eta.stopId);
            if (!stop || index === 0) return null;

            const DelayIcon = eta.delay > 0 ? TrendingUp : eta.delay < 0 ? TrendingDown : Minus;
            const delayColor = eta.delay > 5 ? 'text-red-500' : eta.delay < 0 ? 'text-green-500' : 'text-muted-foreground';

            return (
              <div 
                key={eta.stopId}
                className={cn(
                  "flex items-center justify-between p-2 rounded-lg text-xs",
                  eta.completed ? "bg-green-500/10" : "bg-accent/50",
                  index === currentStopIndex && "ring-1 ring-primary"
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                    eta.completed ? "bg-green-500 text-white" : "bg-primary text-primary-foreground"
                  )}>
                    {index}
                  </div>
                  <span className="truncate font-medium">{stop.name || `Stop ${index}`}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="text-right">
                    <div className="font-mono">{format(eta.liveETA, 'h:mm a')}</div>
                    {eta.delay !== 0 && (
                      <div className={cn("flex items-center gap-0.5", delayColor)}>
                        <DelayIcon className="h-3 w-3" />
                        <span>{eta.delay > 0 ? '+' : ''}{eta.delay}m</span>
                      </div>
                    )}
                  </div>
                  <TrafficIndicator condition={eta.trafficCondition} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Mark stop completed button */}
        {currentStopIndex < stops.length - 1 && (
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full"
            onClick={() => setCurrentStopIndex(prev => Math.min(prev + 1, stops.length - 1))}
          >
            Mark Stop {currentStopIndex + 1} Complete
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function TrafficIndicator({ condition }: { condition: 'light' | 'moderate' | 'heavy' }) {
  const colors = {
    light: 'bg-green-500',
    moderate: 'bg-yellow-500',
    heavy: 'bg-red-500',
  };

  return (
    <div className="flex gap-0.5" title={`${condition} traffic`}>
      <div className={cn("w-1 h-3 rounded-full", colors.light)} />
      <div className={cn("w-1 h-3 rounded-full", condition !== 'light' ? colors.moderate : 'bg-muted')} />
      <div className={cn("w-1 h-3 rounded-full", condition === 'heavy' ? colors.heavy : 'bg-muted')} />
    </div>
  );
}

export function ETABadge({ eta }: { eta: StopETA }) {
  const DelayIcon = eta.delay > 0 ? TrendingUp : eta.delay < 0 ? TrendingDown : Clock;
  const color = eta.delay > 5 ? 'text-red-500' : eta.delay < 0 ? 'text-green-500' : 'text-muted-foreground';

  return (
    <Badge variant="outline" className="text-xs gap-1">
      <DelayIcon className={cn("h-3 w-3", color)} />
      <span>{format(eta.liveETA, 'h:mm a')}</span>
      {eta.delay !== 0 && (
        <span className={color}>({eta.delay > 0 ? '+' : ''}{eta.delay}m)</span>
      )}
    </Badge>
  );
}
