import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Navigation, Clock, MapPin, Loader2, Plus, X, GripVertical, Route, ExternalLink, Map, Save, ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SearchableCombobox, ComboboxOption } from "@/components/ui/searchable-combobox";
import RouteMap from "@/components/routes/RouteMap";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Stop {
  id: string;
  address: string;
  name?: string;
  customerId?: string;
  lat?: number;
  lng?: number;
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

interface SortableStopProps {
  stop: Stop;
  index: number;
  stopsLength: number;
  allLocationOptions: ComboboxOption[];
  onLocationSelect: (stopId: string, value: string) => void;
  onUpdateStop: (id: string, updates: Partial<Stop>) => void;
  onRemoveStop: (id: string) => void;
  isGeocoding: boolean;
}

function SortableStop({ stop, index, stopsLength, allLocationOptions, onLocationSelect, onUpdateStop, onRemoveStop, isGeocoding }: SortableStopProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stop.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getStopColor = () => {
    if (index === 0) return "bg-green-500";
    if (index === stopsLength - 1 && stopsLength > 1) return "bg-red-500";
    return "bg-blue-500";
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-3 p-3 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
    >
      <div className="flex items-center gap-2 pt-2">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing touch-none"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground hover:text-foreground" />
        </button>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${getStopColor()}`}>
          {index + 1}
        </div>
      </div>
      
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium">
            {index === 0 ? "Start" : index === stopsLength - 1 && stopsLength > 1 ? "End" : `Stop ${index}`}
          </Label>
          {stop.name && stop.name !== stop.address && (
            <Badge variant="secondary" className="text-xs">{stop.name}</Badge>
          )}
        </div>
        
        <div className="grid gap-2">
          <SearchableCombobox
            options={allLocationOptions}
            placeholder="Select customer or account..."
            searchPlaceholder="Search locations..."
            emptyText="No locations found"
            onValueChange={(value) => onLocationSelect(stop.id, value)}
          />
          <Input
            placeholder="Or enter address manually..."
            value={stop.address}
            onChange={(e) => onUpdateStop(stop.id, { address: e.target.value, name: undefined, lat: undefined, lng: undefined })}
            className="text-sm"
          />
        </div>

        {/* Coordinates display */}
        {stop.lat && stop.lng ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span>{stop.lat.toFixed(6)}, {stop.lng.toFixed(6)}</span>
          </div>
        ) : stop.address && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {isGeocoding ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Getting coordinates...</span>
              </>
            ) : (
              <>
                <MapPin className="h-3 w-3" />
                <span>Enter address to see on map</span>
              </>
            )}
          </div>
        )}
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="mt-6"
        onClick={() => onRemoveStop(stop.id)}
        disabled={stopsLength <= 1}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

export default function RouteOptimization() {
  const [stops, setStops] = useState<Stop[]>([
    { id: crypto.randomUUID(), address: "", name: "Start" },
  ]);
  const [routeInfo, setRouteInfo] = useState<OptimizedRoute | null>(null);
  const [loading, setLoading] = useState(false);
  const [geocodingStops, setGeocodingStops] = useState<Set<string>>(new Set());
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [showDirections, setShowDirections] = useState(true);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Geocode addresses when they change
  useEffect(() => {
    const geocodeStops = async () => {
      for (const stop of stops) {
        if (stop.address && stop.address.trim().length > 5 && !stop.lat && !geocodingStops.has(stop.id)) {
          setGeocodingStops(prev => new Set(prev).add(stop.id));
          
          try {
            const { data, error } = await supabase.functions.invoke("geocode-address", {
              body: { address: stop.address },
            });
            
            if (!error && data?.lat && data?.lng) {
              setStops(prev => prev.map(s => 
                s.id === stop.id ? { ...s, lat: data.lat, lng: data.lng } : s
              ));
            }
          } catch (err) {
            console.error("Geocoding error:", err);
          } finally {
            setGeocodingStops(prev => {
              const next = new Set(prev);
              next.delete(stop.id);
              return next;
            });
          }
        }
      }
    };

    const debounce = setTimeout(geocodeStops, 1000);
    return () => clearTimeout(debounce);
  }, [stops]);

  // Fetch customers for dropdown
  const { data: customers = [] } = useQuery({
    queryKey: ["customers-for-route"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("customers")
        .select("id, name, street, city, state, zip_code, latitude, longitude")
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
    if (stops.length <= 1) {
      toast({
        title: "Minimum stops required",
        description: "You need at least 1 stop",
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
        updateStop(stopId, { 
          address, 
          name: customer.name, 
          customerId,
          lat: customer.latitude || undefined,
          lng: customer.longitude || undefined,
        });
      }
    } else if (selectedValue.startsWith("account-")) {
      const accountId = selectedValue.replace("account-", "");
      const account = routeAccounts.find((r) => r.id === accountId);
      if (account) {
        updateStop(stopId, { 
          address: account.address, 
          name: account.name,
          lat: undefined,
          lng: undefined,
        });
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setStops((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
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

  const handleMapStopClick = (stopId: string) => {
    // Could scroll to the stop in the list
    const element = document.getElementById(`stop-${stopId}`);
    element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <div className="h-[calc(100vh-8rem)]">
      <div className="mb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Map className="h-6 w-6" />
          Route Planner
        </h1>
        <p className="text-sm text-muted-foreground">
          Add stops to plan your route. Drag to reorder.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[calc(100%-4rem)]">
        {/* Left Panel - Stops List */}
        <div className="flex flex-col gap-4 overflow-hidden">
          <Card className="flex-1 overflow-hidden flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Route className="h-5 w-5" />
                Stops ({stops.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto space-y-3 pb-4">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={stops.map(s => s.id)} strategy={verticalListSortingStrategy}>
                  {stops.map((stop, index) => (
                    <div key={stop.id} id={`stop-${stop.id}`}>
                      <SortableStop
                        stop={stop}
                        index={index}
                        stopsLength={stops.length}
                        allLocationOptions={allLocationOptions}
                        onLocationSelect={handleLocationSelect}
                        onUpdateStop={updateStop}
                        onRemoveStop={removeStop}
                        isGeocoding={geocodingStops.has(stop.id)}
                      />
                    </div>
                  ))}
                </SortableContext>
              </DndContext>

              <Button variant="outline" onClick={addStop} className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Add Stop
              </Button>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button onClick={optimizeRoute} disabled={loading} className="flex-1">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Optimizing...
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
              Google Maps
            </Button>
          </div>

          {/* Save as Template */}
          <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full" disabled={stops.filter(s => s.address.trim()).length < 2}>
                <Save className="mr-2 h-4 w-4" />
                Save as Template
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Save Route Template</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Template Name</Label>
                  <Input
                    placeholder="e.g., Monday Downtown Route"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                  />
                </div>
                <div className="text-sm text-muted-foreground">
                  This will save {stops.filter(s => s.address.trim()).length} stops to your optimized routes.
                </div>
                <Button 
                  className="w-full" 
                  onClick={async () => {
                    if (!templateName.trim()) {
                      toast({ title: "Enter a name", variant: "destructive" });
                      return;
                    }
                    try {
                      const { data: { user } } = await supabase.auth.getUser();
                      if (!user) throw new Error("Not authenticated");
                      
                      const validStops = stops.filter(s => s.address.trim());
                      const { error } = await supabase.from("optimized_routes").insert({
                        user_id: user.id,
                        route_name: templateName,
                        stops: validStops.map((s, i) => ({
                          order: i,
                          address: s.address,
                          name: s.name || s.address,
                          lat: s.lat,
                          lng: s.lng,
                        })),
                        total_distance: routeInfo?.totalDistance || null,
                        total_duration: routeInfo?.totalTime || null,
                      });
                      
                      if (error) throw error;
                      
                      toast({ title: "Route saved!", description: `"${templateName}" saved to your templates.` });
                      setSaveDialogOpen(false);
                      setTemplateName("");
                    } catch (error) {
                      console.error("Save error:", error);
                      toast({ title: "Failed to save", variant: "destructive" });
                    }
                  }}
                  disabled={!templateName.trim()}
                >
                  Save Template
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Route Summary */}
          {routeInfo && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Card className="p-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-lg font-bold">{routeInfo.totalDistance.toFixed(1)} mi</div>
                      <div className="text-xs text-muted-foreground">Total Distance</div>
                    </div>
                  </div>
                </Card>
                <Card className="p-3">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-lg font-bold">
                        {Math.floor(routeInfo.totalTime / 60)}h {Math.round(routeInfo.totalTime % 60)}m
                      </div>
                      <div className="text-xs text-muted-foreground">Est. Time</div>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Turn-by-turn Directions */}
              {routeInfo.legs && routeInfo.legs.length > 0 && (
                <Card>
                  <CardHeader className="pb-2 pt-3 px-3">
                    <button
                      onClick={() => setShowDirections(!showDirections)}
                      className="flex items-center justify-between w-full text-left"
                    >
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Route className="h-4 w-4" />
                        Turn-by-Turn Directions
                      </CardTitle>
                      {showDirections ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                  </CardHeader>
                  {showDirections && (
                    <CardContent className="px-3 pb-3">
                      <ScrollArea className="h-[200px]">
                        <div className="space-y-2">
                          {routeInfo.legs.map((leg, index) => (
                            <div 
                              key={index} 
                              className="flex items-start gap-2 p-2 rounded-lg bg-accent/50 text-sm"
                            >
                              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                                {index + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <span className="truncate">{leg.from}</span>
                                  <ArrowRight className="h-3 w-3 flex-shrink-0" />
                                  <span className="truncate">{leg.to}</span>
                                </div>
                                <div className="flex items-center gap-3 mt-1">
                                  <Badge variant="secondary" className="text-xs">
                                    <MapPin className="h-3 w-3 mr-1" />
                                    {leg.distance.toFixed(1)} mi
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    <Clock className="h-3 w-3 mr-1" />
                                    {leg.duration < 60 
                                      ? `${Math.round(leg.duration)} min`
                                      : `${Math.floor(leg.duration / 60)}h ${Math.round(leg.duration % 60)}m`
                                    }
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  )}
                </Card>
              )}
            </div>
          )}
        </div>

        {/* Right Panel - Map */}
        <Card className="overflow-hidden">
          <CardContent className="p-0 h-full">
            <RouteMap 
              stops={stops} 
              onStopClick={handleMapStopClick}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
