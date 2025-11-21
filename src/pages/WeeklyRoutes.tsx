import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import WeeklyScheduler from "@/components/routes/WeeklyScheduler";
import RouteDisplay from "@/components/routes/RouteDisplay";
import VisitTracker from "@/components/routes/VisitTracker";
import CSVImporter from "@/components/routes/CSVImporter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Calendar, Route, Download } from "lucide-react";
import { generateICS, downloadICS } from "@/utils/icsGenerator";
import { useToast } from "@/hooks/use-toast";

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

interface TwoWeekSchedule {
  weekA: WeeklyRoutesData;
  weekB: WeeklyRoutesData;
}

interface StoredRoute {
  id: string;
  week_number: number;
  week_start_date: string;
  origin_address: string;
  routes: TwoWeekSchedule;
  created_at: string;
}

export default function WeeklyRoutes() {
  const { toast } = useToast();
  const [selectedWeek, setSelectedWeek] = useState<'weekA' | 'weekB'>('weekA');
  
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

  const handleExportCalendar = () => {
    if (!latestRoute) {
      toast({
        title: "No routes to export",
        description: "Generate a weekly schedule first",
        variant: "destructive",
      });
      return;
    }

    const startDate = new Date(latestRoute.week_start_date);
    const icsContent = generateICS(
      latestRoute.routes.weekA,
      latestRoute.routes.weekB,
      startDate,
      latestRoute.origin_address
    );
    
    const filename = `winrep-routes-${latestRoute.week_start_date}.ics`;
    downloadICS(icsContent, filename);
    
    toast({
      title: "Calendar exported!",
      description: "Import the .ics file into Google Calendar to view your routes",
    });
  };

  const currentWeekRoutes = latestRoute?.routes[selectedWeek];

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

        <div className="grid gap-6 md:grid-cols-2">
          <WeeklyScheduler />
          <div className="space-y-6">
            <CSVImporter />
            <VisitTracker />
          </div>
        </div>

        {latestRoute && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  <CardTitle>2-Week Repeating Schedule</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-sm text-muted-foreground">
                    Week {latestRoute.week_number} • {new Date(latestRoute.week_start_date).toLocaleDateString()}
                  </div>
                  <Button onClick={handleExportCalendar} variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export to Calendar
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    variant={selectedWeek === 'weekA' ? 'default' : 'outline'}
                    onClick={() => setSelectedWeek('weekA')}
                  >
                    Week A
                  </Button>
                  <Button
                    variant={selectedWeek === 'weekB' ? 'default' : 'outline'}
                    onClick={() => setSelectedWeek('weekB')}
                  >
                    Week B
                  </Button>
                </div>

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
                    <RouteDisplay day={`${selectedWeek === 'weekA' ? 'Week A' : 'Week B'} - Monday`} route={currentWeekRoutes.Monday} />
                  </TabsContent>
                  <TabsContent value="Tuesday" className="mt-4">
                    <RouteDisplay day={`${selectedWeek === 'weekA' ? 'Week A' : 'Week B'} - Tuesday`} route={currentWeekRoutes.Tuesday} />
                  </TabsContent>
                  <TabsContent value="Wednesday" className="mt-4">
                    <RouteDisplay day={`${selectedWeek === 'weekA' ? 'Week A' : 'Week B'} - Wednesday`} route={currentWeekRoutes.Wednesday} />
                  </TabsContent>
                  <TabsContent value="Thursday" className="mt-4">
                    <RouteDisplay day={`${selectedWeek === 'weekA' ? 'Week A' : 'Week B'} - Thursday`} route={currentWeekRoutes.Thursday} />
                  </TabsContent>
                  <TabsContent value="Friday" className="mt-4">
                    <RouteDisplay day={`${selectedWeek === 'weekA' ? 'Week A' : 'Week B'} - Friday`} route={currentWeekRoutes.Friday} />
                  </TabsContent>
                  <TabsContent value="FlexDay" className="mt-4">
                    <RouteDisplay day={`${selectedWeek === 'weekA' ? 'Week A' : 'Week B'} - Flex Day`} route={currentWeekRoutes.FlexDay} />
                  </TabsContent>
                </Tabs>
              </div>
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
                      {new Date(route.week_start_date).toLocaleDateString()} (2-week pattern)
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {Object.values(route.routes.weekA).reduce((sum, day) => sum + day.stops.length, 0) +
                     Object.values(route.routes.weekB).reduce((sum, day) => sum + day.stops.length, 0)} total stops
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
