import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, MapPin } from "lucide-react";

interface RouteAccount {
  id: string;
  name: string;
  address: string;
  region: string;
  priority: string;
  tags?: string[];
}

interface DailyRoute {
  stops: RouteAccount[];
  googleRoute: string;
}

interface RouteDisplayProps {
  day: string;
  route: DailyRoute;
}

export default function RouteDisplay({ day, route }: RouteDisplayProps) {
  if (!route.stops || route.stops.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{day}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No stops scheduled</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{day}</CardTitle>
          <Badge variant="secondary">{route.stops.length} stops</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          {route.stops.map((stop, index) => (
            <div key={stop.id} className="flex items-start gap-3 p-2 rounded-lg border">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium truncate">{stop.name}</h4>
                  {stop.tags && stop.tags.length > 0 && (
                    <div className="flex gap-1">
                      {stop.tags.includes('firstStop') && (
                        <Badge variant="outline" className="text-xs">First</Badge>
                      )}
                      {stop.tags.includes('lastStop') && (
                        <Badge variant="outline" className="text-xs">Last</Badge>
                      )}
                      {stop.tags.includes('julietFalls') && (
                        <Badge variant="outline" className="text-xs">JF</Badge>
                      )}
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">{stop.address}</p>
                <div className="flex gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs">{stop.region}</Badge>
                  <Badge variant={
                    stop.priority === 'high' ? 'destructive' :
                    stop.priority === 'low' ? 'outline' : 'secondary'
                  } className="text-xs">
                    {stop.priority}
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>

        {route.googleRoute && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => window.open(route.googleRoute, '_blank')}
          >
            <MapPin className="mr-2 h-4 w-4" />
            Open in Google Maps
            <ExternalLink className="ml-2 h-3 w-3" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
