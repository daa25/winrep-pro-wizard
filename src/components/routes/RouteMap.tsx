import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, LayersControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { Layers } from 'lucide-react';

// Fix for default marker icons in Leaflet with Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom numbered marker
const createNumberedIcon = (number: number, isStart: boolean, isEnd: boolean) => {
  const color = isStart ? '#22c55e' : isEnd ? '#ef4444' : '#3b82f6';
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 14px;
        border: 3px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      ">${number}</div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

interface Stop {
  id: string;
  address: string;
  name?: string;
  lat?: number;
  lng?: number;
}

interface RouteMapProps {
  stops: Stop[];
  onStopClick?: (stopId: string) => void;
  showTraffic?: boolean;
}

// Component to fit map bounds
function FitBounds({ stops }: { stops: Stop[] }) {
  const map = useMap();
  
  useEffect(() => {
    const validStops = stops.filter(s => s.lat && s.lng);
    if (validStops.length > 0) {
      const bounds = L.latLngBounds(
        validStops.map(s => [s.lat!, s.lng!] as [number, number])
      );
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [stops, map]);
  
  return null;
}

export default function RouteMap({ stops, onStopClick, showTraffic = false }: RouteMapProps) {
  const [trafficEnabled, setTrafficEnabled] = useState(showTraffic);
  const validStops = stops.filter(s => s.lat && s.lng);
  
  // Create polyline coordinates for the route
  const routeCoordinates = validStops.map(s => [s.lat!, s.lng!] as [number, number]);
  
  // Default center (US)
  const defaultCenter: [number, number] = [39.8283, -98.5795];
  const center = validStops.length > 0 
    ? [validStops[0].lat!, validStops[0].lng!] as [number, number]
    : defaultCenter;

  return (
    <div className="h-full w-full rounded-lg overflow-hidden border relative">
      {/* Traffic toggle button */}
      <div className="absolute top-2 right-2 z-[1000]">
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

      <MapContainer
        center={center}
        zoom={validStops.length > 0 ? 10 : 4}
        className="h-full w-full"
        style={{ minHeight: '400px' }}
      >
        {/* Base map layer */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Traffic layer overlay - using TomTom traffic tiles */}
        {trafficEnabled && (
          <TileLayer
            attribution='Traffic &copy; TomTom'
            url="https://api.tomtom.com/traffic/map/4/tile/flow/relative0/{z}/{x}/{y}.png?key=AazPA4PVbBj2SgGuG9GnXBDKpKfYMUqt&tileSize=256"
            opacity={0.7}
          />
        )}
        
        <FitBounds stops={stops} />
        
        {/* Route line */}
        {routeCoordinates.length > 1 && (
          <Polyline
            positions={routeCoordinates}
            pathOptions={{ 
              color: '#3b82f6', 
              weight: 4, 
              opacity: 0.7,
              dashArray: '10, 10'
            }}
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
              index === validStops.length - 1 && validStops.length > 1
            )}
            eventHandlers={{
              click: () => onStopClick?.(stop.id),
            }}
          >
            <Popup>
              <div className="text-sm">
                <div className="font-semibold">{stop.name || `Stop ${index + 1}`}</div>
                <div className="text-muted-foreground text-xs mt-1">{stop.address}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {stop.lat?.toFixed(6)}, {stop.lng?.toFixed(6)}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
