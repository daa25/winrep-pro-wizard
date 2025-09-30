import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Navigation, Fuel, DollarSign, Clock, MapPin, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface GasStation {
  name: string;
  address: string;
  price: number;
  distance: number;
  savings: number;
}

interface RouteInfo {
  totalDistance: number;
  totalTime: number;
  gasStations: GasStation[];
  estimatedCost: number;
}

export default function RouteOptimization() {
  const [startLocation, setStartLocation] = useState("");
  const [endLocation, setEndLocation] = useState("");
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const optimizeRoute = async () => {
    if (!startLocation.trim() || !endLocation.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide both start and end locations",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("optimize-route", {
        body: {
          startLocation,
          endLocation,
        },
      });

      if (error) throw error;

      setRouteInfo(data);
      toast({
        title: "Route Optimized",
        description: "Found the best route with cheapest gas prices",
      });
    } catch (error) {
      console.error("Error optimizing route:", error);
      toast({
        title: "Error",
        description: "Failed to optimize route. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Route Optimization</h1>
        <p className="text-muted-foreground">
          Find the best route with cheapest gas stations along the way
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Route Details</CardTitle>
          <CardDescription>Enter your start and end locations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="start">Start Location</Label>
            <Input
              id="start"
              placeholder="e.g., Los Angeles, CA"
              value={startLocation}
              onChange={(e) => setStartLocation(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="end">End Location</Label>
            <Input
              id="end"
              placeholder="e.g., San Francisco, CA"
              value={endLocation}
              onChange={(e) => setEndLocation(e.target.value)}
            />
          </div>

          <Button onClick={optimizeRoute} disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Optimizing Route...
              </>
            ) : (
              <>
                <Navigation className="mr-2 h-4 w-4" />
                Optimize Route
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {routeInfo && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Distance</CardTitle>
                <MapPin className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{routeInfo.totalDistance} mi</div>
                <p className="text-xs text-muted-foreground">Optimized route</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Estimated Time</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{routeInfo.totalTime} hrs</div>
                <p className="text-xs text-muted-foreground">Including stops</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Estimated Cost</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${routeInfo.estimatedCost}</div>
                <p className="text-xs text-muted-foreground">Total gas cost</p>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <Fuel className="h-6 w-6" />
              Gas Stations Along Route
            </h2>
            {routeInfo.gasStations.map((station, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle>{station.name}</CardTitle>
                      <CardDescription>{station.address}</CardDescription>
                    </div>
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      ${station.price}/gal
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-muted-foreground">
                        {station.distance} miles from start
                      </span>
                      {station.savings > 0 && (
                        <Badge variant="outline" className="text-green-600">
                          Save ${station.savings.toFixed(2)}
                        </Badge>
                      )}
                    </div>
                    <Button variant="outline" size="sm">
                      <Navigation className="mr-2 h-4 w-4" />
                      Navigate
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
