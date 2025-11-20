import { useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus } from "lucide-react";
import { RouteTemplateCalendar } from "@/components/routes/RouteTemplateCalendar";
import { RouteTemplateList } from "@/components/routes/RouteTemplateList";
import { CreateRouteDialog } from "@/components/routes/CreateRouteDialog";

export default function RouteTemplates() {
  const [selectedWeek, setSelectedWeek] = useState<"A" | "B">("A");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Route Templates</h1>
            <p className="text-muted-foreground mt-1">
              Manage your Week A/Week B customer visit schedules
            </p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Route
          </Button>
        </div>

        <Tabs value={selectedWeek} onValueChange={(v) => setSelectedWeek(v as "A" | "B")}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="A">Week A</TabsTrigger>
            <TabsTrigger value="B">Week B</TabsTrigger>
          </TabsList>

          <TabsContent value="A" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Week A Schedule</CardTitle>
                <CardDescription>
                  View and manage your Week A customer routes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RouteTemplateCalendar weekType="A" />
              </CardContent>
            </Card>
            <RouteTemplateList weekType="A" />
          </TabsContent>

          <TabsContent value="B" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Week B Schedule</CardTitle>
                <CardDescription>
                  View and manage your Week B customer routes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RouteTemplateCalendar weekType="B" />
              </CardContent>
            </Card>
            <RouteTemplateList weekType="B" />
          </TabsContent>
        </Tabs>

        <CreateRouteDialog 
          open={isCreateDialogOpen} 
          onOpenChange={setIsCreateDialogOpen}
          weekType={selectedWeek}
        />
      </div>
    </Layout>
  );
}