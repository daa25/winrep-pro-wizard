import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Edit, Trash2 } from "lucide-react";

interface RouteTemplateListProps {
  weekType: "A" | "B";
}

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function RouteTemplateList({ weekType }: RouteTemplateListProps) {
  const { data: routes, isLoading } = useQuery({
    queryKey: ["route-templates-list", weekType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("route_templates")
        .select(`
          *,
          route_template_customers(
            id,
            stop_order,
            estimated_duration_minutes,
            customers(id, name, address, city, state)
          )
        `)
        .eq("week_type", weekType)
        .eq("is_active", true)
        .order("day_of_week")
        .order("sequence_order");

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-48" />
        ))}
      </div>
    );
  }

  if (!routes || routes.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">
            No routes created yet. Click "Create Route" to get started.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {routes.map((route) => {
        const sortedCustomers = route.route_template_customers
          ?.sort((a, b) => a.stop_order - b.stop_order) || [];

        return (
          <Card key={route.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    {route.route_name}
                    <Badge variant="outline">
                      {DAYS_OF_WEEK[route.day_of_week]}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    {sortedCustomers.length} stops
                    {route.notes && ` • ${route.notes}`}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sortedCustomers.map((stop, index) => (
                  <div 
                    key={stop.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-semibold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{stop.customers.name}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {stop.customers.address && (
                          <span>
                            {stop.customers.address}
                            {stop.customers.city && `, ${stop.customers.city}`}
                            {stop.customers.state && `, ${stop.customers.state}`}
                          </span>
                        )}
                      </div>
                      {stop.estimated_duration_minutes && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Est. {stop.estimated_duration_minutes} min
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}