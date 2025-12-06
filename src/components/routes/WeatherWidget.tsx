import { useEffect, useState } from 'react';
import { Cloud, Sun, CloudRain, Snowflake, CloudLightning, Wind, Droplets, Thermometer, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface WeatherData {
  temp: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  condition: string;
  icon: string;
  description: string;
}

interface WeatherWidgetProps {
  lat: number;
  lng: number;
  compact?: boolean;
  className?: string;
  arrivalTime?: Date;
}

// Simple weather condition mapping
const getWeatherIcon = (condition: string) => {
  const lower = condition.toLowerCase();
  if (lower.includes('thunder') || lower.includes('storm')) return CloudLightning;
  if (lower.includes('rain') || lower.includes('drizzle')) return CloudRain;
  if (lower.includes('snow') || lower.includes('sleet')) return Snowflake;
  if (lower.includes('cloud') || lower.includes('overcast')) return Cloud;
  return Sun;
};

const getWeatherColor = (condition: string) => {
  const lower = condition.toLowerCase();
  if (lower.includes('thunder') || lower.includes('storm')) return 'text-yellow-500';
  if (lower.includes('rain') || lower.includes('drizzle')) return 'text-blue-500';
  if (lower.includes('snow') || lower.includes('sleet')) return 'text-cyan-300';
  if (lower.includes('cloud') || lower.includes('overcast')) return 'text-slate-400';
  return 'text-yellow-400';
};

// Mock weather data generator based on coordinates (for demo)
const generateMockWeather = (lat: number, lng: number): WeatherData => {
  // Generate semi-random but consistent weather based on coordinates
  const seed = Math.abs(lat * lng) % 100;
  const conditions = ['Clear', 'Partly Cloudy', 'Cloudy', 'Light Rain', 'Sunny'];
  const conditionIndex = Math.floor(seed % conditions.length);
  const baseTemp = 55 + (Math.abs(lat) < 35 ? 15 : -5) + (seed % 20) - 10;
  
  return {
    temp: Math.round(baseTemp),
    feelsLike: Math.round(baseTemp - 2 + (seed % 5)),
    humidity: 40 + (seed % 40),
    windSpeed: 5 + (seed % 15),
    condition: conditions[conditionIndex],
    icon: conditions[conditionIndex].toLowerCase().replace(' ', '-'),
    description: conditions[conditionIndex],
  };
};

export function WeatherWidget({ lat, lng, compact = false, className, arrivalTime }: WeatherWidgetProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API call delay
    const timer = setTimeout(() => {
      const data = generateMockWeather(lat, lng);
      setWeather(data);
      setLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [lat, lng]);

  if (loading) {
    return (
      <div className={cn("flex items-center gap-1 text-xs text-muted-foreground", className)}>
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Loading weather...</span>
      </div>
    );
  }

  if (!weather) return null;

  const WeatherIcon = getWeatherIcon(weather.condition);
  const iconColor = getWeatherColor(weather.condition);

  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={cn("text-xs gap-1 cursor-default", className)}
          >
            <WeatherIcon className={cn("h-3 w-3", iconColor)} />
            <span>{weather.temp}°F</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <div className="space-y-1">
            <div className="font-semibold">{weather.description}</div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1">
                <Thermometer className="h-3 w-3" />
                Feels like {weather.feelsLike}°F
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Droplets className="h-3 w-3" />
                {weather.humidity}%
              </span>
              <span className="flex items-center gap-1">
                <Wind className="h-3 w-3" />
                {weather.windSpeed} mph
              </span>
            </div>
            {arrivalTime && (
              <div className="text-muted-foreground border-t pt-1 mt-1">
                Forecast at arrival
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className={cn("flex items-center gap-2 p-2 rounded-lg bg-accent/50", className)}>
      <WeatherIcon className={cn("h-6 w-6", iconColor)} />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">{weather.temp}°F</span>
          <span className="text-xs text-muted-foreground">{weather.description}</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Droplets className="h-3 w-3" />
            {weather.humidity}%
          </span>
          <span className="flex items-center gap-1">
            <Wind className="h-3 w-3" />
            {weather.windSpeed} mph
          </span>
        </div>
      </div>
    </div>
  );
}

export function StopWeatherBadge({ lat, lng, eta }: { lat: number; lng: number; eta?: Date }) {
  return (
    <WeatherWidget 
      lat={lat} 
      lng={lng} 
      compact 
      arrivalTime={eta}
    />
  );
}
