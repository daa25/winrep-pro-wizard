import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin } from "lucide-react";

interface RouteTemplateCalendarProps {
  weekType: "A" | "B";
}

const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function RouteTemplateCalendar({ weekType }: RouteTemplateCalendarProps) {
  const { data: routes, isLoading } = useQuery({
    queryKey: ["route-templates", weekType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("route_templates")
        .select(`
          *,
          route_template_customers(
            customer_id,
            customers(name)
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
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  const routesByDay = routes?.reduce((acc, route) => {
    const day = route.day_of_week;
    if (!acc[day]) acc[day] = [];
    acc[day].push(route);
    return acc;
  }, {} as Record<number, typeof routes>);

  return (
    <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
      {DAYS_OF_WEEK.map((day, index) => {
        const dayRoutes = routesByDay?.[index] || [];
        const totalStops = dayRoutes.reduce(
          (sum, route) => sum + (route.route_template_customers?.length || 0),
          0
        );

        return (
          <Card key={day} className="min-h-[120px]">
            <CardContent className="p-4">
              <div className="font-semibold text-sm mb-2">{day}</div>
              {dayRoutes.length > 0 ? (
                <div className="space-y-2">
                  {dayRoutes.map((route) => (
                    <div key={route.id} className="space-y-1">
                      <div className="text-xs font-medium truncate">
                        {route.route_name}
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        <MapPin className="h-3 w-3 mr-1" />
                        {route.route_template_customers?.length || 0} stops
                      </Badge>
                    </div>
                  ))}
                  {totalStops > 0 && (
                    <div className="text-xs text-muted-foreground pt-2 border-t">
                      Total: {totalStops} stops
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">No routes</div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}