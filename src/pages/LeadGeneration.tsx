import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { MapPin, Building2, Mail, TrendingUp, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Lead {
  name: string;
  address: string;
  industry: string;
  website: string;
  score: number;
  insights: string;
}

export default function LeadGeneration() {
  const [route, setRoute] = useState("");
  const [radius, setRadius] = useState("25");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const generateLeads = async () => {
    if (!route.trim()) {
      toast({
        title: "Route Required",
        description: "Please enter a route or location",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-leads", {
        body: { route, radius: parseInt(radius) },
      });

      if (error) throw error;

      setLeads(data.leads || []);
      toast({
        title: "Leads Generated",
        description: `Found ${data.leads?.length || 0} potential leads`,
      });
    } catch (error) {
      console.error("Error generating leads:", error);
      toast({
        title: "Error",
        description: "Failed to generate leads. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Lead Generation</h1>
        <p className="text-muted-foreground">
          Discover potential companies along your route
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Route Configuration</CardTitle>
          <CardDescription>
            Enter your route details to discover nearby businesses
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="route">Route or Location</Label>
            <Input
              id="route"
              placeholder="e.g., Los Angeles, CA or 123 Main St to 456 Oak Ave"
              value={route}
              onChange={(e) => setRoute(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="radius">Search Radius (miles)</Label>
            <Input
              id="radius"
              type="number"
              min="1"
              max="100"
              value={radius}
              onChange={(e) => setRadius(e.target.value)}
            />
          </div>

          <Button onClick={generateLeads} disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Leads...
              </>
            ) : (
              <>
                <MapPin className="mr-2 h-4 w-4" />
                Generate Leads
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {leads.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Discovered Leads ({leads.length})</h2>
          {leads.map((lead, index) => (
            <Card key={index} className="border-l-4 border-l-primary">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      {lead.name}
                    </CardTitle>
                    <CardDescription>{lead.address}</CardDescription>
                  </div>
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    {lead.score}% Match
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge>{lead.industry}</Badge>
                  {lead.website && (
                    <a
                      href={lead.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      Visit Website
                    </a>
                  )}
                </div>
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm">{lead.insights}</p>
                </div>
                <Button variant="outline" className="w-full">
                  <Mail className="mr-2 h-4 w-4" />
                  Draft Email
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
