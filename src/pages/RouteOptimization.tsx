import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { 
  Navigation, Clock, MapPin, Loader2, Plus, X, GripVertical, Route, ExternalLink, 
  Map, Save, ArrowRight, ChevronDown, ChevronUp, Download, Upload, Share2, Printer,
  Copy, RefreshCw, Trash2, RotateCcw, Fuel, Leaf, Zap, Calendar, Sun, Cloud,
  Thermometer, Wind, Star, StarOff, History, FileText, Settings2, ArrowUpDown,
  Timer, TrendingUp, DollarSign, Car, Bike, PersonStanding
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SearchableCombobox, ComboboxOption } from "@/components/ui/searchable-combobox";
import RouteMap from "@/components/routes/RouteMap";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import { format } from "date-fns";

interface Stop {
  id: string;
  address: string;
  name?: string;
  customerId?: string;
  lat?: number;
  lng?: number;
  priority?: 'high' | 'medium' | 'low';
  duration?: number; // minutes to spend at stop
  notes?: string;
  visitTime?: string;
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

interface RoutePreferences {
  avoidHighways: boolean;
  avoidTolls: boolean;
  roundTrip: boolean;
  optimizeFor: 'distance' | 'time' | 'balanced';
  travelMode: 'driving' | 'walking' | 'cycling';
  departureTime: string;
  stopDuration: number; // default minutes per stop
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
  isHighlighted: boolean;
  onToggleFavorite?: (stopId: string) => void;
  isFavorite?: boolean;
}

function SortableStop({ 
  stop, index, stopsLength, allLocationOptions, onLocationSelect, 
  onUpdateStop, onRemoveStop, isGeocoding, isHighlighted, onToggleFavorite, isFavorite 
}: SortableStopProps) {
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
    if (stop.priority === 'high') return "bg-red-500";
    if (stop.priority === 'low') return "bg-slate-400";
    if (index === 0) return "bg-green-500";
    if (index === stopsLength - 1 && stopsLength > 1) return "bg-red-500";
    return "bg-blue-500";
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-start gap-3 p-3 border rounded-lg bg-card hover:bg-accent/50 transition-colors ${
        isHighlighted ? 'ring-2 ring-primary' : ''
      }`}
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium">
              {index === 0 ? "Start" : index === stopsLength - 1 && stopsLength > 1 ? "End" : `Stop ${index}`}
            </Label>
            {stop.name && stop.name !== stop.address && (
              <Badge variant="secondary" className="text-xs">{stop.name}</Badge>
            )}
            {stop.priority && stop.priority !== 'medium' && (
              <Badge 
                variant={stop.priority === 'high' ? 'destructive' : 'outline'} 
                className="text-xs"
              >
                {stop.priority}
              </Badge>
            )}
          </div>
          {onToggleFavorite && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => onToggleFavorite(stop.id)}
            >
              {isFavorite ? (
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              ) : (
                <StarOff className="h-3 w-3 text-muted-foreground" />
              )}
            </Button>
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

        {/* Stop options row */}
        <div className="flex items-center gap-2 flex-wrap">
          <Select
            value={stop.priority || 'medium'}
            onValueChange={(value) => onUpdateStop(stop.id, { priority: value as Stop['priority'] })}
          >
            <SelectTrigger className="w-24 h-7 text-xs">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1">
            <Timer className="h-3 w-3 text-muted-foreground" />
            <Input
              type="number"
              placeholder="15"
              value={stop.duration || ''}
              onChange={(e) => onUpdateStop(stop.id, { duration: parseInt(e.target.value) || undefined })}
              className="w-16 h-7 text-xs"
            />
            <span className="text-xs text-muted-foreground">min</span>
          </div>
        </div>

        {/* Coordinates display */}
        {stop.lat && stop.lng ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span className="font-mono">{stop.lat.toFixed(6)}, {stop.lng.toFixed(6)}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={() => navigator.clipboard.writeText(`${stop.lat}, ${stop.lng}`)}
            >
              <Copy className="h-3 w-3" />
            </Button>
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

// Route analytics component
function RouteAnalytics({ routeInfo, stops, preferences }: { 
  routeInfo: OptimizedRoute | null;
  stops: Stop[];
  preferences: RoutePreferences;
}) {
  if (!routeInfo) return null;

  const fuelCost = (routeInfo.totalDistance / 25) * 3.50; // Assuming 25 mpg and $3.50/gal
  const co2Emissions = routeInfo.totalDistance * 0.404; // kg CO2 per mile
  const efficiency = routeInfo.totalDistance > 0 
    ? (stops.length / routeInfo.totalDistance) * 10 
    : 0;

  const totalStopTime = stops.reduce((acc, stop) => acc + (stop.duration || preferences.stopDuration), 0);
  const totalTripTime = routeInfo.totalTime + totalStopTime;

  // Calculate departure time for arrival estimates
  const departureDate = new Date();
  const [hours, minutes] = preferences.departureTime.split(':').map(Number);
  departureDate.setHours(hours, minutes, 0, 0);

  return (
    <div className="space-y-3">
      {/* Primary metrics */}
      <div className="grid grid-cols-2 gap-2">
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-blue-500" />
            <div>
              <div className="text-lg font-bold">{routeInfo.totalDistance.toFixed(1)} mi</div>
              <div className="text-xs text-muted-foreground">Total Distance</div>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-green-500" />
            <div>
              <div className="text-lg font-bold">
                {Math.floor(totalTripTime / 60)}h {Math.round(totalTripTime % 60)}m
              </div>
              <div className="text-xs text-muted-foreground">Total Time</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Secondary metrics */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="p-2">
          <div className="flex items-center gap-1">
            <Fuel className="h-3 w-3 text-orange-500" />
            <div>
              <div className="text-sm font-semibold">${fuelCost.toFixed(2)}</div>
              <div className="text-[10px] text-muted-foreground">Est. Fuel</div>
            </div>
          </div>
        </Card>
        <Card className="p-2">
          <div className="flex items-center gap-1">
            <Leaf className="h-3 w-3 text-green-500" />
            <div>
              <div className="text-sm font-semibold">{co2Emissions.toFixed(1)} kg</div>
              <div className="text-[10px] text-muted-foreground">CO₂</div>
            </div>
          </div>
        </Card>
        <Card className="p-2">
          <div className="flex items-center gap-1">
            <Zap className="h-3 w-3 text-yellow-500" />
            <div>
              <div className="text-sm font-semibold">{efficiency.toFixed(1)}</div>
              <div className="text-[10px] text-muted-foreground">Efficiency</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Efficiency score */}
      <Card className="p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Route Efficiency</span>
          <Badge variant={efficiency > 2 ? "default" : efficiency > 1 ? "secondary" : "destructive"}>
            {efficiency > 2 ? "Excellent" : efficiency > 1 ? "Good" : "Optimize More"}
          </Badge>
        </div>
        <Progress value={Math.min(efficiency * 33, 100)} className="h-2" />
      </Card>
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
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [showDirections, setShowDirections] = useState(true);
  const [highlightedStopId, setHighlightedStopId] = useState<string | undefined>();
  const [routeColor, setRouteColor] = useState('#3b82f6');
  const [animateRoute, setAnimateRoute] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  
  const [preferences, setPreferences] = useState<RoutePreferences>({
    avoidHighways: false,
    avoidTolls: false,
    roundTrip: false,
    optimizeFor: 'balanced',
    travelMode: 'driving',
    departureTime: format(new Date(), 'HH:mm'),
    stopDuration: 15,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch saved routes
  const { data: savedRoutes = [] } = useQuery({
    queryKey: ["saved-routes"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("optimized_routes")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

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
    setStops([...stops, { id: crypto.randomUUID(), address: "", duration: preferences.stopDuration }]);
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
    setAnimateRoute(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("optimize-route", {
        body: {
          stops: validStops.map((s) => ({
            address: s.address,
            name: s.name || s.address,
          })),
          preferences,
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
      setTimeout(() => setAnimateRoute(false), 2000);
    }
  };

  const reverseRoute = () => {
    setStops([...stops].reverse());
    toast({ title: "Route reversed" });
  };

  const clearAllStops = () => {
    setStops([{ id: crypto.randomUUID(), address: "", name: "Start" }]);
    setRouteInfo(null);
    toast({ title: "All stops cleared" });
  };

  const duplicateRoute = () => {
    const duplicated = stops.map(s => ({ ...s, id: crypto.randomUUID() }));
    setStops([...stops, ...duplicated]);
    toast({ title: "Route duplicated" });
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

  const openInWaze = () => {
    const validStops = stops.filter((s) => s.address.trim());
    if (validStops.length < 1) return;
    
    const lastStop = validStops[validStops.length - 1];
    if (lastStop.lat && lastStop.lng) {
      window.open(`https://waze.com/ul?ll=${lastStop.lat},${lastStop.lng}&navigate=yes`, "_blank");
    }
  };

  const openInAppleMaps = () => {
    const validStops = stops.filter((s) => s.address.trim());
    if (validStops.length < 2) return;
    
    const destination = encodeURIComponent(validStops[validStops.length - 1].address);
    window.open(`https://maps.apple.com/?daddr=${destination}&dirflg=d`, "_blank");
  };

  const exportToGPX = () => {
    const validStops = stops.filter((s) => s.lat && s.lng);
    const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Route Planner">
  <rte>
    <name>Optimized Route</name>
    ${validStops.map((s, i) => `
    <rtept lat="${s.lat}" lon="${s.lng}">
      <name>${s.name || `Stop ${i + 1}`}</name>
      <desc>${s.address}</desc>
    </rtept>`).join('')}
  </rte>
</gpx>`;
    
    const blob = new Blob([gpx], { type: 'application/gpx+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'route.gpx';
    a.click();
    toast({ title: "GPX file downloaded" });
  };

  const exportToKML = () => {
    const validStops = stops.filter((s) => s.lat && s.lng);
    const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Optimized Route</name>
    ${validStops.map((s, i) => `
    <Placemark>
      <name>${s.name || `Stop ${i + 1}`}</name>
      <description>${s.address}</description>
      <Point>
        <coordinates>${s.lng},${s.lat},0</coordinates>
      </Point>
    </Placemark>`).join('')}
    <Placemark>
      <name>Route Line</name>
      <LineString>
        <coordinates>
          ${validStops.map(s => `${s.lng},${s.lat},0`).join('\n          ')}
        </coordinates>
      </LineString>
    </Placemark>
  </Document>
</kml>`;
    
    const blob = new Blob([kml], { type: 'application/vnd.google-earth.kml+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'route.kml';
    a.click();
    toast({ title: "KML file downloaded" });
  };

  const exportToCSV = () => {
    const validStops = stops.filter((s) => s.address.trim());
    const csv = [
      'Stop,Name,Address,Latitude,Longitude,Priority,Duration',
      ...validStops.map((s, i) => 
        `${i + 1},"${s.name || ''}","${s.address}",${s.lat || ''},${s.lng || ''},${s.priority || 'medium'},${s.duration || preferences.stopDuration}`
      )
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'route.csv';
    a.click();
    toast({ title: "CSV file downloaded" });
  };

  const printDirections = () => {
    const validStops = stops.filter((s) => s.address.trim());
    const printContent = `
      <html>
        <head>
          <title>Route Directions</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { margin-bottom: 20px; }
            .stop { margin: 10px 0; padding: 10px; border: 1px solid #ddd; border-radius: 4px; }
            .stop-number { font-weight: bold; color: #3b82f6; }
            .summary { margin-top: 20px; padding: 15px; background: #f5f5f5; border-radius: 4px; }
          </style>
        </head>
        <body>
          <h1>Route Directions</h1>
          <p>Generated: ${format(new Date(), 'PPpp')}</p>
          ${validStops.map((s, i) => `
            <div class="stop">
              <span class="stop-number">${i + 1}.</span>
              <strong>${s.name || `Stop ${i + 1}`}</strong><br/>
              ${s.address}
              ${s.notes ? `<br/><em>${s.notes}</em>` : ''}
            </div>
          `).join('')}
          ${routeInfo ? `
            <div class="summary">
              <strong>Summary:</strong><br/>
              Total Distance: ${routeInfo.totalDistance.toFixed(1)} miles<br/>
              Estimated Time: ${Math.floor(routeInfo.totalTime / 60)}h ${Math.round(routeInfo.totalTime % 60)}m
            </div>
          ` : ''}
        </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const shareRoute = async () => {
    const validStops = stops.filter((s) => s.address.trim());
    const shareText = `Route with ${validStops.length} stops:\n${validStops.map((s, i) => `${i + 1}. ${s.name || s.address}`).join('\n')}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Route',
          text: shareText,
        });
      } catch (err) {
        // User cancelled
      }
    } else {
      navigator.clipboard.writeText(shareText);
      toast({ title: "Route copied to clipboard" });
    }
  };

  const loadSavedRoute = (route: any) => {
    const loadedStops = (route.stops as any[]).map((s: any) => ({
      id: crypto.randomUUID(),
      address: s.address,
      name: s.name,
      lat: s.lat,
      lng: s.lng,
    }));
    setStops(loadedStops);
    if (route.total_distance && route.total_duration) {
      setRouteInfo({
        totalDistance: route.total_distance,
        totalTime: route.total_duration,
        optimizedOrder: [],
        legs: [],
      });
    }
    setLoadDialogOpen(false);
    toast({ title: `Loaded "${route.route_name}"` });
  };

  const handleMapStopClick = (stopId: string) => {
    setHighlightedStopId(stopId);
    const element = document.getElementById(`stop-${stopId}`);
    element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => setHighlightedStopId(undefined), 2000);
  };

  const handleMapClick = useCallback((lat: number, lng: number) => {
    const newStop: Stop = {
      id: crypto.randomUUID(),
      address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
      lat,
      lng,
    };
    setStops(prev => [...prev, newStop]);
    toast({ title: "Stop added from map" });
  }, []);

  const toggleFavorite = (stopId: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(stopId)) next.delete(stopId);
      else next.add(stopId);
      return next;
    });
  };

  const getTravelModeIcon = () => {
    switch (preferences.travelMode) {
      case 'walking': return PersonStanding;
      case 'cycling': return Bike;
      default: return Car;
    }
  };

  const TravelIcon = getTravelModeIcon();

  return (
    <TooltipProvider>
      <div className="h-[calc(100vh-8rem)]">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Map className="h-6 w-6" />
              Route Planner
            </h1>
            <p className="text-sm text-muted-foreground">
              Add stops to plan your route. Drag to reorder. Click map to add stops.
            </p>
          </div>
          
          {/* Quick actions */}
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={() => setSettingsDialogOpen(true)}>
                  <Settings2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Route Settings</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={() => setLoadDialogOpen(true)}>
                  <History className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Load Saved Route</TooltipContent>
            </Tooltip>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[calc(100%-4rem)]">
          {/* Left Panel - Stops List */}
          <div className="flex flex-col gap-4 overflow-hidden">
            <Card className="flex-1 overflow-hidden flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Route className="h-5 w-5" />
                    Stops ({stops.length})
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={reverseRoute}>
                          <ArrowUpDown className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Reverse Route</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={duplicateRoute}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Duplicate All</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={clearAllStops}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Clear All</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
                {/* Route preferences summary */}
                <div className="flex items-center gap-2 flex-wrap mt-2">
                  <Badge variant="outline" className="text-xs">
                    <TravelIcon className="h-3 w-3 mr-1" />
                    {preferences.travelMode}
                  </Badge>
                  {preferences.avoidHighways && (
                    <Badge variant="secondary" className="text-xs">No highways</Badge>
                  )}
                  {preferences.avoidTolls && (
                    <Badge variant="secondary" className="text-xs">No tolls</Badge>
                  )}
                  {preferences.roundTrip && (
                    <Badge variant="secondary" className="text-xs">Round trip</Badge>
                  )}
                </div>
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
                          isHighlighted={highlightedStopId === stop.id}
                          onToggleFavorite={toggleFavorite}
                          isFavorite={favorites.has(stop.id)}
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
              
              {/* Navigate dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" disabled={stops.filter(s => s.address.trim()).length < 2}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Navigate
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={openInGoogleMaps}>
                    <MapPin className="h-4 w-4 mr-2" />
                    Google Maps
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={openInWaze}>
                    <Navigation className="h-4 w-4 mr-2" />
                    Waze
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={openInAppleMaps}>
                    <Map className="h-4 w-4 mr-2" />
                    Apple Maps
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Save & Export */}
            <div className="flex gap-2">
              <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="flex-1" disabled={stops.filter(s => s.address.trim()).length < 2}>
                    <Save className="mr-2 h-4 w-4" />
                    Save
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Save Route Template</DialogTitle>
                    <DialogDescription>Save this route to reuse later</DialogDescription>
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
                      This will save {stops.filter(s => s.address.trim()).length} stops.
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
                              priority: s.priority,
                              duration: s.duration,
                            })),
                            total_distance: routeInfo?.totalDistance || null,
                            total_duration: routeInfo?.totalTime || null,
                          });
                          
                          if (error) throw error;
                          
                          queryClient.invalidateQueries({ queryKey: ["saved-routes"] });
                          toast({ title: "Route saved!" });
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

              {/* Export dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex-1">
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Export Format</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={exportToGPX}>
                    <FileText className="h-4 w-4 mr-2" />
                    GPX File
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportToKML}>
                    <FileText className="h-4 w-4 mr-2" />
                    KML File
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportToCSV}>
                    <FileText className="h-4 w-4 mr-2" />
                    CSV File
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={printDirections}>
                    <Printer className="h-4 w-4 mr-2" />
                    Print Directions
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={shareRoute}>
                    <Share2 className="h-4 w-4 mr-2" />
                    Share Route
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Route Analytics */}
            <RouteAnalytics routeInfo={routeInfo} stops={stops} preferences={preferences} />

            {/* Turn-by-turn Directions */}
            {routeInfo?.legs && routeInfo.legs.length > 0 && (
              <Card>
                <CardHeader className="pb-2 pt-3 px-3">
                  <button
                    onClick={() => setShowDirections(!showDirections)}
                    className="flex items-center justify-between w-full text-left"
                  >
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Route className="h-4 w-4" />
                      Turn-by-Turn ({routeInfo.legs.length} legs)
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

          {/* Right Panel - Map */}
          <Card className="overflow-hidden">
            <CardContent className="p-0 h-full">
              <RouteMap 
                stops={stops} 
                onStopClick={handleMapStopClick}
                highlightedStopId={highlightedStopId}
                onMapClick={handleMapClick}
                routeColor={routeColor}
                animateRoute={animateRoute}
              />
            </CardContent>
          </Card>
        </div>

        {/* Settings Dialog */}
        <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Route Settings</DialogTitle>
              <DialogDescription>Configure route preferences</DialogDescription>
            </DialogHeader>
            <Tabs defaultValue="general" className="mt-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="avoid">Avoid</TabsTrigger>
                <TabsTrigger value="display">Display</TabsTrigger>
              </TabsList>
              
              <TabsContent value="general" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Travel Mode</Label>
                  <Select
                    value={preferences.travelMode}
                    onValueChange={(value) => setPreferences(p => ({ ...p, travelMode: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="driving">
                        <div className="flex items-center gap-2">
                          <Car className="h-4 w-4" />
                          Driving
                        </div>
                      </SelectItem>
                      <SelectItem value="walking">
                        <div className="flex items-center gap-2">
                          <PersonStanding className="h-4 w-4" />
                          Walking
                        </div>
                      </SelectItem>
                      <SelectItem value="cycling">
                        <div className="flex items-center gap-2">
                          <Bike className="h-4 w-4" />
                          Cycling
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Optimize For</Label>
                  <Select
                    value={preferences.optimizeFor}
                    onValueChange={(value) => setPreferences(p => ({ ...p, optimizeFor: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="distance">Shortest Distance</SelectItem>
                      <SelectItem value="time">Fastest Time</SelectItem>
                      <SelectItem value="balanced">Balanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Departure Time</Label>
                  <Input
                    type="time"
                    value={preferences.departureTime}
                    onChange={(e) => setPreferences(p => ({ ...p, departureTime: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Default Stop Duration: {preferences.stopDuration} min</Label>
                  <Slider
                    value={[preferences.stopDuration]}
                    onValueChange={([value]) => setPreferences(p => ({ ...p, stopDuration: value }))}
                    min={5}
                    max={60}
                    step={5}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Round Trip</Label>
                  <Switch
                    checked={preferences.roundTrip}
                    onCheckedChange={(checked) => setPreferences(p => ({ ...p, roundTrip: checked }))}
                  />
                </div>
              </TabsContent>

              <TabsContent value="avoid" className="space-y-4 mt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Avoid Highways</Label>
                    <p className="text-xs text-muted-foreground">Take local roads instead</p>
                  </div>
                  <Switch
                    checked={preferences.avoidHighways}
                    onCheckedChange={(checked) => setPreferences(p => ({ ...p, avoidHighways: checked }))}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Avoid Tolls</Label>
                    <p className="text-xs text-muted-foreground">Skip toll roads</p>
                  </div>
                  <Switch
                    checked={preferences.avoidTolls}
                    onCheckedChange={(checked) => setPreferences(p => ({ ...p, avoidTolls: checked }))}
                  />
                </div>
              </TabsContent>

              <TabsContent value="display" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Route Color</Label>
                  <div className="flex gap-2">
                    {['#3b82f6', '#22c55e', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899'].map(color => (
                      <button
                        key={color}
                        className={`w-8 h-8 rounded-full border-2 ${routeColor === color ? 'border-foreground' : 'border-transparent'}`}
                        style={{ backgroundColor: color }}
                        onClick={() => setRouteColor(color)}
                      />
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>

        {/* Load Route Dialog */}
        <Dialog open={loadDialogOpen} onOpenChange={setLoadDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Load Saved Route</DialogTitle>
              <DialogDescription>Select a previously saved route</DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-[300px] mt-4">
              {savedRoutes.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No saved routes yet
                </div>
              ) : (
                <div className="space-y-2">
                  {savedRoutes.map((route: any) => (
                    <Card 
                      key={route.id} 
                      className="p-3 cursor-pointer hover:bg-accent"
                      onClick={() => loadSavedRoute(route)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{route.route_name}</div>
                          <div className="text-xs text-muted-foreground">
                            {(route.stops as any[]).length} stops
                            {route.total_distance && ` • ${route.total_distance.toFixed(1)} mi`}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(route.created_at), 'MMM d')}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}