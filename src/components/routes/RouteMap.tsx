import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, Circle, ScaleControl, ZoomControl, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { 
  Layers, Maximize2, Minimize2, LocateFixed, 
  Map as MapIcon, Mountain, Satellite, Moon, 
  Ruler, Target, ZoomIn, ZoomOut, RotateCcw,
  Navigation2, Cloud, Sun, Thermometer
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Badge } from '@/components/ui/badge';
import { TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { WeatherWidget } from './WeatherWidget';

// Fix for default marker icons in Leaflet with Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Map style configurations
const MAP_STYLES = {
  standard: {
    name: 'Standard',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    icon: MapIcon,
  },
  satellite: {
    name: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri',
    icon: Satellite,
  },
  terrain: {
    name: 'Terrain',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenTopoMap',
    icon: Mountain,
  },
  dark: {
    name: 'Dark',
    url: 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png',
    attribution: '&copy; Stadia Maps',
    icon: Moon,
  },
};

type MapStyleKey = keyof typeof MAP_STYLES;

// Custom numbered marker with priority support
const createNumberedIcon = (
  number: number, 
  isStart: boolean, 
  isEnd: boolean, 
  isHighlighted: boolean = false,
  priority?: 'high' | 'medium' | 'low'
) => {
  let color = isStart ? '#22c55e' : isEnd ? '#ef4444' : '#3b82f6';
  if (priority === 'high') color = '#ef4444';
  else if (priority === 'low') color = '#94a3b8';
  
  const size = isHighlighted ? 40 : 32;
  const border = isHighlighted ? '4px solid #fbbf24' : '3px solid white';
  
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: ${color};
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: ${isHighlighted ? 16 : 14}px;
        border: ${border};
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        transition: all 0.2s ease;
      ">${number}</div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

// Current location marker
const createCurrentLocationIcon = () => {
  return L.divIcon({
    className: 'current-location-marker',
    html: `
      <div style="
        position: relative;
        width: 24px;
        height: 24px;
      ">
        <div style="
          position: absolute;
          top: 0; left: 0;
          width: 24px;
          height: 24px;
          background-color: #3b82f6;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          animation: pulse 2s infinite;
        "></div>
        <div style="
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          width: 8px;
          height: 8px;
          background-color: white;
          border-radius: 50%;
        "></div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

interface Stop {
  id: string;
  address: string;
  name?: string;
  lat?: number;
  lng?: number;
  priority?: 'high' | 'medium' | 'low';
  visitTime?: string;
  notes?: string;
}

interface RouteMapProps {
  stops: Stop[];
  onStopClick?: (stopId: string) => void;
  showTraffic?: boolean;
  highlightedStopId?: string;
  onMapClick?: (lat: number, lng: number) => void;
  routeColor?: string;
  showDistanceMarkers?: boolean;
  animateRoute?: boolean;
  showWeatherOnMap?: boolean;
}

// Component to fit map bounds
function FitBounds({ stops, padding = 50 }: { stops: Stop[], padding?: number }) {
  const map = useMap();
  
  useEffect(() => {
    const validStops = stops.filter(s => s.lat && s.lng);
    if (validStops.length > 0) {
      const bounds = L.latLngBounds(
        validStops.map(s => [s.lat!, s.lng!] as [number, number])
      );
      map.fitBounds(bounds, { padding: [padding, padding], maxZoom: 14 });
    }
  }, [stops, map, padding]);
  
  return null;
}

// Current location tracker component
function CurrentLocationTracker({ 
  enabled, 
  onLocationFound 
}: { 
  enabled: boolean;
  onLocationFound?: (lat: number, lng: number) => void;
}) {
  const map = useMap();
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [accuracy, setAccuracy] = useState<number>(0);
  
  useEffect(() => {
    if (!enabled) {
      setPosition(null);
      return;
    }
    
    const onLocation = (e: L.LocationEvent) => {
      setPosition([e.latlng.lat, e.latlng.lng]);
      setAccuracy(e.accuracy);
      onLocationFound?.(e.latlng.lat, e.latlng.lng);
    };
    
    map.locate({ watch: true, enableHighAccuracy: true });
    map.on('locationfound', onLocation);
    
    return () => {
      map.stopLocate();
      map.off('locationfound', onLocation);
    };
  }, [enabled, map, onLocationFound]);
  
  if (!position) return null;
  
  return (
    <>
      <Circle
        center={position}
        radius={accuracy}
        pathOptions={{
          color: '#3b82f6',
          fillColor: '#3b82f6',
          fillOpacity: 0.1,
          weight: 1,
        }}
      />
      <Marker position={position} icon={createCurrentLocationIcon()}>
        <Popup>
          <div className="text-sm">
            <div className="font-semibold">Your Location</div>
            <div className="text-xs text-muted-foreground">
              Accuracy: ±{Math.round(accuracy)}m
            </div>
          </div>
        </Popup>
      </Marker>
    </>
  );
}

// Map click handler
function MapClickHandler({ onMapClick }: { onMapClick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onMapClick?.(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Animated polyline component
function AnimatedPolyline({ 
  positions, 
  color,
  animate 
}: { 
  positions: [number, number][];
  color: string;
  animate: boolean;
}) {
  const [displayedPositions, setDisplayedPositions] = useState<[number, number][]>([]);
  
  useEffect(() => {
    if (!animate || positions.length < 2) {
      setDisplayedPositions(positions);
      return;
    }
    
    setDisplayedPositions([positions[0]]);
    let index = 1;
    
    const interval = setInterval(() => {
      if (index < positions.length) {
        setDisplayedPositions(prev => [...prev, positions[index]]);
        index++;
      } else {
        clearInterval(interval);
      }
    }, 100);
    
    return () => clearInterval(interval);
  }, [positions, animate]);
  
  if (displayedPositions.length < 2) return null;
  
  return (
    <>
      {/* Shadow line */}
      <Polyline
        positions={displayedPositions}
        pathOptions={{ 
          color: '#000',
          weight: 8, 
          opacity: 0.2,
        }}
      />
      {/* Main line */}
      <Polyline
        positions={displayedPositions}
        pathOptions={{ 
          color: color, 
          weight: 5, 
          opacity: 0.9,
        }}
      />
      {/* Animated dash overlay */}
      <Polyline
        positions={displayedPositions}
        pathOptions={{ 
          color: '#fff',
          weight: 2, 
          opacity: 0.5,
          dashArray: '10, 20',
          dashOffset: '0',
        }}
      />
    </>
  );
}

// Distance markers between stops
function DistanceMarkers({ stops, routeInfo }: { 
  stops: Stop[];
  routeInfo?: { legs: { distance: number; duration: number }[] };
}) {
  const validStops = stops.filter(s => s.lat && s.lng);
  if (validStops.length < 2 || !routeInfo?.legs) return null;
  
  return (
    <>
      {validStops.slice(0, -1).map((stop, index) => {
        const nextStop = validStops[index + 1];
        const leg = routeInfo.legs[index];
        if (!leg || !nextStop) return null;
        
        const midLat = (stop.lat! + nextStop.lat!) / 2;
        const midLng = (stop.lng! + nextStop.lng!) / 2;
        
        return (
          <Marker
            key={`distance-${index}`}
            position={[midLat, midLng]}
            icon={L.divIcon({
              className: 'distance-marker',
              html: `
                <div style="
                  background: rgba(0,0,0,0.75);
                  color: white;
                  padding: 2px 6px;
                  border-radius: 4px;
                  font-size: 10px;
                  white-space: nowrap;
                  font-weight: 500;
                ">${leg.distance.toFixed(1)} mi</div>
              `,
              iconSize: [60, 20],
              iconAnchor: [30, 10],
            })}
          />
        );
      })}
    </>
  );
}

// Map controls component
function MapControls({ map }: { map: L.Map | null }) {
  if (!map) return null;
  
  return (
    <div className="absolute bottom-20 right-2 z-[1000] flex flex-col gap-1">
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8 bg-background shadow-md"
        onClick={() => map.zoomIn()}
      >
        <ZoomIn className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8 bg-background shadow-md"
        onClick={() => map.zoomOut()}
      >
        <ZoomOut className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8 bg-background shadow-md"
        onClick={() => map.setView([39.8283, -98.5795], 4)}
        title="Reset view"
      >
        <RotateCcw className="h-4 w-4" />
      </Button>
    </div>
  );
}

export default function RouteMap({ 
  stops, 
  onStopClick, 
  showTraffic = false,
  highlightedStopId,
  onMapClick,
  routeColor = '#3b82f6',
  showDistanceMarkers = false,
  animateRoute = false,
  showWeatherOnMap = true,
}: RouteMapProps) {
  const [mapStyle, setMapStyle] = useState<MapStyleKey>('standard');
  const [trafficEnabled, setTrafficEnabled] = useState(showTraffic);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [measureMode, setMeasureMode] = useState(false);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const validStops = stops.filter(s => s.lat && s.lng);
  const routeCoordinates = validStops.map(s => [s.lat!, s.lng!] as [number, number]);
  
  // Default center (US)
  const defaultCenter: [number, number] = [39.8283, -98.5795];
  const center = validStops.length > 0 
    ? [validStops[0].lat!, validStops[0].lng!] as [number, number]
    : defaultCenter;

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Calculate total route distance
  const calculateTotalDistance = () => {
    if (routeCoordinates.length < 2) return 0;
    let total = 0;
    for (let i = 0; i < routeCoordinates.length - 1; i++) {
      const [lat1, lng1] = routeCoordinates[i];
      const [lat2, lng2] = routeCoordinates[i + 1];
      total += L.latLng(lat1, lng1).distanceTo(L.latLng(lat2, lng2));
    }
    return total / 1609.34; // Convert to miles
  };

  const currentStyle = MAP_STYLES[mapStyle];
  const StyleIcon = currentStyle.icon;

  return (
    <div 
      ref={containerRef}
      className={cn(
        "h-full w-full rounded-lg overflow-hidden border relative",
        isFullscreen && "fixed inset-0 z-50 rounded-none"
      )}
    >
      {/* Map Controls Toolbar */}
      <div className="absolute top-2 left-2 right-2 z-[1000] flex items-center justify-between pointer-events-none">
        {/* Left controls */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Map style selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="shadow-md bg-background">
                <StyleIcon className="h-4 w-4 mr-1" />
                {currentStyle.name}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>Map Style</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {Object.entries(MAP_STYLES).map(([key, style]) => {
                const Icon = style.icon;
                return (
                  <DropdownMenuItem
                    key={key}
                    onClick={() => setMapStyle(key as MapStyleKey)}
                    className={cn(mapStyle === key && "bg-accent")}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {style.name}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Traffic toggle */}
          <Button
            variant={trafficEnabled ? "default" : "outline"}
            size="sm"
            onClick={() => setTrafficEnabled(!trafficEnabled)}
            className="shadow-md"
          >
            <Layers className="h-4 w-4 mr-1" />
            Traffic
          </Button>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Current location */}
          <Button
            variant={locationEnabled ? "default" : "outline"}
            size="sm"
            onClick={() => setLocationEnabled(!locationEnabled)}
            className="shadow-md"
            title="Show my location"
          >
            <LocateFixed className="h-4 w-4" />
          </Button>

          {/* Measure mode */}
          <Button
            variant={measureMode ? "default" : "outline"}
            size="sm"
            onClick={() => setMeasureMode(!measureMode)}
            className="shadow-md"
            title="Measure distances"
          >
            <Ruler className="h-4 w-4" />
          </Button>

          {/* Fullscreen */}
          <Button
            variant="outline"
            size="sm"
            onClick={toggleFullscreen}
            className="shadow-md"
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Stats overlay */}
      {validStops.length > 1 && (
        <div className="absolute bottom-2 left-2 z-[1000] flex gap-2 pointer-events-none">
          <Badge variant="secondary" className="bg-background/90 backdrop-blur shadow-md">
            <Target className="h-3 w-3 mr-1" />
            {validStops.length} stops
          </Badge>
          <Badge variant="secondary" className="bg-background/90 backdrop-blur shadow-md">
            <Navigation2 className="h-3 w-3 mr-1" />
            ~{calculateTotalDistance().toFixed(1)} mi
          </Badge>
        </div>
      )}

      {/* Current location indicator */}
      {currentLocation && (
        <div className="absolute bottom-2 right-14 z-[1000]">
          <Badge variant="outline" className="bg-background/90 backdrop-blur shadow-md text-xs">
            <LocateFixed className="h-3 w-3 mr-1 text-blue-500" />
            {currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}
          </Badge>
        </div>
      )}

      <MapContainer
        center={center}
        zoom={validStops.length > 0 ? 10 : 4}
        className="h-full w-full"
        style={{ minHeight: '400px' }}
        zoomControl={false}
        ref={(map) => map && setMapInstance(map)}
      >
        {/* Base map layer */}
        <TileLayer
          attribution={currentStyle.attribution}
          url={currentStyle.url}
        />
        
        {/* Traffic layer overlay */}
        {trafficEnabled && (
          <TileLayer
            attribution='Traffic &copy; TomTom'
            url="https://api.tomtom.com/traffic/map/4/tile/flow/relative0/{z}/{x}/{y}.png?key=AazPA4PVbBj2SgGuG9GnXBDKpKfYMUqt&tileSize=256"
            opacity={0.7}
          />
        )}

        {/* Scale control */}
        <ScaleControl position="bottomright" imperial metric />
        
        <FitBounds stops={stops} />
        
        {/* Current location tracker */}
        <CurrentLocationTracker 
          enabled={locationEnabled}
          onLocationFound={(lat, lng) => setCurrentLocation({ lat, lng })}
        />

        {/* Map click handler */}
        {onMapClick && <MapClickHandler onMapClick={onMapClick} />}
        
        {/* Route line with animation */}
        {routeCoordinates.length > 1 && (
          <AnimatedPolyline 
            positions={routeCoordinates}
            color={routeColor}
            animate={animateRoute}
          />
        )}
        
        {/* Stop markers */}
        {validStops.map((stop, index) => (
          <Marker
            key={stop.id}
            position={[stop.lat!, stop.lng!]}
            icon={createNumberedIcon(
              index + 1,
              index === 0,
              index === validStops.length - 1 && validStops.length > 1,
              stop.id === highlightedStopId,
              stop.priority
            )}
            eventHandlers={{
              click: () => onStopClick?.(stop.id),
            }}
          >
            <Popup>
              <div className="text-sm min-w-[180px]">
                <div className="font-semibold">{stop.name || `Stop ${index + 1}`}</div>
                <div className="text-muted-foreground text-xs mt-1">{stop.address}</div>
                {stop.visitTime && (
                  <div className="text-xs text-muted-foreground mt-1">
                    ETA: {stop.visitTime}
                  </div>
                )}
                {stop.priority && (
                  <Badge 
                    variant={stop.priority === 'high' ? 'destructive' : 'secondary'}
                    className="mt-2 text-xs"
                  >
                    {stop.priority} priority
                  </Badge>
                )}
                {/* Weather in popup */}
                {showWeatherOnMap && stop.lat && stop.lng && (
                  <div className="mt-2 pt-2 border-t">
                    <WeatherWidget lat={stop.lat} lng={stop.lng} compact={false} />
                  </div>
                )}
                {stop.notes && (
                  <div className="text-xs text-muted-foreground mt-2 italic">
                    {stop.notes}
                  </div>
                )}
                <div className="text-xs text-muted-foreground mt-2 font-mono">
                  {stop.lat?.toFixed(6)}, {stop.lng?.toFixed(6)}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Custom zoom controls */}
      <MapControls map={mapInstance} />
    </div>
  );
}