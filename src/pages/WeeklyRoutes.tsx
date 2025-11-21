import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import WeeklyScheduler from "@/components/routes/WeeklyScheduler";
import RouteDisplay from "@/components/routes/RouteDisplay";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Route } from "lucide-react";

interface DailyRoute {
  stops: any[];
  googleRoute: string;
}

interface WeeklyRoutesData {
  Monday: DailyRoute;
  Tuesday: DailyRoute;
  Wednesday: DailyRoute;
  Thursday: DailyRoute;
  Friday: DailyRoute;
  FlexDay: DailyRoute;
}

interface StoredRoute {
  id: string;
  week_number: number;
  week_start_date: string;
  origin_address: string;
  routes: WeeklyRoutesData;
  created_at: string;
}

export default function WeeklyRoutes() {
  const { data: savedRoutes, isLoading } = useQuery({
    queryKey: ['weekly-routes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weekly_routes')
        .select('*')
        .order('week_start_date', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data as unknown as StoredRoute[];
    },
  });

  const latestRoute = savedRoutes?.[0];

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Route className="h-8 w-8" />
            Weekly Route Scheduler
          </h1>
          <p className="text-muted-foreground">
            Generate and manage optimized weekly routes with smart sales rep rules
          </p>
        </div>

        <WeeklyScheduler />

        {latestRoute && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  <CardTitle>Current Week Routes</CardTitle>
                </div>
                <div className="text-sm text-muted-foreground">
                  Week {latestRoute.week_number} • {new Date(latestRoute.week_start_date).toLocaleDateString()}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="Monday" className="w-full">
                <TabsList className="grid w-full grid-cols-6">
                  <TabsTrigger value="Monday">Mon</TabsTrigger>
                  <TabsTrigger value="Tuesday">Tue</TabsTrigger>
                  <TabsTrigger value="Wednesday">Wed</TabsTrigger>
                  <TabsTrigger value="Thursday">Thu</TabsTrigger>
                  <TabsTrigger value="Friday">Fri</TabsTrigger>
                  <TabsTrigger value="FlexDay">Flex</TabsTrigger>
                </TabsList>
                <TabsContent value="Monday" className="mt-4">
                  <RouteDisplay day="Monday" route={latestRoute.routes.Monday} />
                </TabsContent>
                <TabsContent value="Tuesday" className="mt-4">
                  <RouteDisplay day="Tuesday" route={latestRoute.routes.Tuesday} />
                </TabsContent>
                <TabsContent value="Wednesday" className="mt-4">
                  <RouteDisplay day="Wednesday" route={latestRoute.routes.Wednesday} />
                </TabsContent>
                <TabsContent value="Thursday" className="mt-4">
                  <RouteDisplay day="Thursday" route={latestRoute.routes.Thursday} />
                </TabsContent>
                <TabsContent value="Friday" className="mt-4">
                  <RouteDisplay day="Friday" route={latestRoute.routes.Friday} />
                </TabsContent>
                <TabsContent value="FlexDay" className="mt-4">
                  <RouteDisplay day="Flex Day" route={latestRoute.routes.FlexDay} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        {savedRoutes && savedRoutes.length > 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Previous Routes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {savedRoutes.slice(1, 6).map((route) => (
                  <div key={route.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">Week {route.week_number}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(route.week_start_date).toLocaleDateString()}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {Object.values(route.routes).reduce((sum, day) => sum + day.stops.length, 0)} total stops
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
