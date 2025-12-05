import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Navigation, Clock, MapPin, Loader2, Plus, X, GripVertical, Route, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SearchableCombobox, ComboboxOption } from "@/components/ui/searchable-combobox";

interface Stop {
  id: string;
  address: string;
  name?: string;
  customerId?: string;
}

interface OptimizedRoute {
  totalDistance: number;
  totalTime: number;
  optimizedOrder: number[];
  legs: {
    from: string;
    to: string;
    distance: number;
    duration: number;
  }[];
  googleMapsUrl?: string;
}

export default function RouteOptimization() {
  const [stops, setStops] = useState<Stop[]>([
    { id: crypto.randomUUID(), address: "", name: "Start" },
  ]);
  const [routeInfo, setRouteInfo] = useState<OptimizedRoute | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Fetch customers for dropdown
  const { data: customers = [] } = useQuery({
    queryKey: ["customers-for-route"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("customers")
        .select("id, name, street, city, state, zip_code")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("name");
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch route accounts for dropdown
  const { data: routeAccounts = [] } = useQuery({
    queryKey: ["route-accounts-for-route"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("route_accounts")
        .select("id, name, address, region")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("name");
      
      if (error) throw error;
      return data || [];
    },
  });

  const customerOptions: ComboboxOption[] = customers.map((c) => ({
    value: c.id,
    label: c.name,
    sublabel: [c.street, c.city, c.state].filter(Boolean).join(", "),
  }));

  const routeAccountOptions: ComboboxOption[] = routeAccounts.map((r) => ({
    value: r.id,
    label: r.name,
    sublabel: r.address,
  }));

  const allLocationOptions: ComboboxOption[] = [
    ...customerOptions.map(o => ({ ...o, value: `customer-${o.value}` })),
    ...routeAccountOptions.map(o => ({ ...o, value: `account-${o.value}` })),
  ];

  const addStop = () => {
    setStops([...stops, { id: crypto.randomUUID(), address: "" }]);
  };

  const removeStop = (id: string) => {
    if (stops.length <= 2) {
      toast({
        title: "Minimum stops required",
        description: "You need at least 2 stops for a route",
        variant: "destructive",
      });
      return;
    }
    setStops(stops.filter((s) => s.id !== id));
  };

  const updateStop = (id: string, updates: Partial<Stop>) => {
    setStops(stops.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const handleLocationSelect = (stopId: string, selectedValue: string) => {
    if (selectedValue.startsWith("customer-")) {
      const customerId = selectedValue.replace("customer-", "");
      const customer = customers.find((c) => c.id === customerId);
      if (customer) {
        const address = [customer.street, customer.city, customer.state, customer.zip_code]
          .filter(Boolean)
          .join(", ");
        updateStop(stopId, { address, name: customer.name, customerId });
      }
    } else if (selectedValue.startsWith("account-")) {
      const accountId = selectedValue.replace("account-", "");
      const account = routeAccounts.find((r) => r.id === accountId);
      if (account) {
        updateStop(stopId, { address: account.address, name: account.name });
      }
    }
  };

  const optimizeRoute = async () => {
    const validStops = stops.filter((s) => s.address.trim());
    
    if (validStops.length < 2) {
      toast({
        title: "Not enough stops",
        description: "Please add at least 2 stops with addresses",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("optimize-route", {
        body: {
          stops: validStops.map((s) => ({
            address: s.address,
            name: s.name || s.address,
          })),
        },
      });

      if (error) throw error;

      setRouteInfo(data);
      toast({
        title: "Route Optimized",
        description: `Found the most efficient route for ${validStops.length} stops`,
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

  const openInGoogleMaps = () => {
    const validStops = stops.filter((s) => s.address.trim());
    if (validStops.length < 2) return;

    const origin = encodeURIComponent(validStops[0].address);
    const destination = encodeURIComponent(validStops[validStops.length - 1].address);
    const waypoints = validStops
      .slice(1, -1)
      .map((s) => encodeURIComponent(s.address))
      .join("|");

    let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;
    if (waypoints) {
      url += `&waypoints=${waypoints}`;
    }
    url += "&travelmode=driving";

    window.open(url, "_blank");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Route Optimization</h1>
        <p className="text-muted-foreground">
          Add multiple stops and optimize your route based on traffic and location
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Route className="h-5 w-5" />
            Route Stops
          </CardTitle>
          <CardDescription>
            Add stops manually or select from your customers and accounts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {stops.map((stop, index) => (
            <div key={stop.id} className="flex items-start gap-3 p-3 border rounded-lg bg-muted/30">
              <div className="flex items-center gap-2 pt-2">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <Badge variant="outline" className="w-8 h-8 rounded-full flex items-center justify-center p-0">
                  {index + 1}
                </Badge>
              </div>
              
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">
                    {index === 0 ? "Start Location" : index === stops.length - 1 && stops.length > 1 ? "Final Destination" : `Stop ${index}`}
                  </Label>
                  {stop.name && stop.name !== stop.address && (
                    <Badge variant="secondary" className="text-xs">{stop.name}</Badge>
                  )}
                </div>
                
                <div className="grid gap-2 md:grid-cols-2">
                  <SearchableCombobox
                    options={allLocationOptions}
                    placeholder="Select customer or account..."
                    searchPlaceholder="Search locations..."
                    emptyText="No locations found"
                    onValueChange={(value) => handleLocationSelect(stop.id, value)}
                  />
                  <Input
                    placeholder="Or enter address manually..."
                    value={stop.address}
                    onChange={(e) => updateStop(stop.id, { address: e.target.value, name: undefined })}
                  />
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="mt-6"
                onClick={() => removeStop(stop.id)}
                disabled={stops.length <= 1}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}

          <Button variant="outline" onClick={addStop} className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            Add Stop
          </Button>

          <div className="flex gap-2 pt-4">
            <Button onClick={optimizeRoute} disabled={loading} className="flex-1">
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
            <Button variant="outline" onClick={openInGoogleMaps} disabled={stops.filter(s => s.address.trim()).length < 2}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Open in Maps
            </Button>
          </div>
        </CardContent>
      </Card>

      {routeInfo && (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Distance</CardTitle>
                <MapPin className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{routeInfo.totalDistance.toFixed(1)} mi</div>
                <p className="text-xs text-muted-foreground">Optimized route</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Estimated Time</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.floor(routeInfo.totalTime / 60)}h {Math.round(routeInfo.totalTime % 60)}m
                </div>
                <p className="text-xs text-muted-foreground">Including traffic</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Route className="h-5 w-5" />
                Optimized Route Order
              </CardTitle>
              <CardDescription>
                Your stops have been reordered for the most efficient route
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {routeInfo.legs.map((leg, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                    <Badge className="w-8 h-8 rounded-full flex items-center justify-center p-0">
                      {index + 1}
                    </Badge>
                    <div className="flex-1">
                      <div className="font-medium">{leg.from}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <span>→ {leg.to}</span>
                        <Badge variant="outline" className="text-xs">
                          {leg.distance.toFixed(1)} mi • {Math.round(leg.duration)} min
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
