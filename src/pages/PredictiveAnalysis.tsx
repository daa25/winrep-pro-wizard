import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { TrendingUp, Target, DollarSign, Loader2, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Prediction {
  companyName: string;
  industry: string;
  score: number;
  revenue: string;
  potential: string;
  recommendations: string[];
}

export default function PredictiveAnalysis() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const runAnalysis = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("predictive-analysis", {
        body: {},
      });

      if (error) throw error;

      setPredictions(data.predictions || []);
      toast({
        title: "Analysis Complete",
        description: `Analyzed ${data.predictions?.length || 0} potential partners`,
      });
    } catch (error) {
      console.error("Error running analysis:", error);
      toast({
        title: "Error",
        description: "Failed to run predictive analysis. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Predictive Analysis</h1>
          <p className="text-muted-foreground">
            AI-powered insights on potential companies to partner with
          </p>
        </div>
        <Button onClick={runAnalysis} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <BarChart3 className="mr-2 h-4 w-4" />
              Run Analysis
            </>
          )}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Potential Leads</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {predictions.filter((p) => p.score >= 80).length}
            </div>
            <p className="text-xs text-muted-foreground">Score 80% or higher</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Medium Potential</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {predictions.filter((p) => p.score >= 50 && p.score < 80).length}
            </div>
            <p className="text-xs text-muted-foreground">Score 50-79%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estimated Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              $
              {predictions
                .reduce((sum, p) => sum + parseFloat(p.revenue.replace(/[$,]/g, "")), 0)
                .toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Total potential revenue</p>
          </CardContent>
        </Card>
      </div>

      {predictions.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Top Opportunities</h2>
          {predictions
            .sort((a, b) => b.score - a.score)
            .map((prediction, index) => (
              <Card key={index} className="border-l-4 border-l-primary">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle>{prediction.companyName}</CardTitle>
                      <CardDescription>{prediction.industry}</CardDescription>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge
                        variant={
                          prediction.score >= 80
                            ? "default"
                            : prediction.score >= 50
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {prediction.score}% Match
                      </Badge>
                      <span className="text-sm font-semibold text-primary">
                        {prediction.revenue} potential
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Growth Potential
                    </h4>
                    <p className="text-sm text-muted-foreground">{prediction.potential}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Recommendations</h4>
                    <ul className="space-y-1">
                      {prediction.recommendations.map((rec, idx) => (
                        <li key={idx} className="text-sm flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Button className="w-full">View Full Analysis</Button>
                </CardContent>
              </Card>
            ))}
        </div>
      )}
    </div>
  );
}
