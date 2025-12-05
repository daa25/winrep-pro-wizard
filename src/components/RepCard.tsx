import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Target, DollarSign } from "lucide-react";

interface RepCardProps {
  name: string;
  email: string;
  status: "active" | "inactive";
  dealsCount: number;
  revenue: number;
  performance: number;
}

export default function RepCard({ name, email, status, dealsCount, revenue, performance }: RepCardProps) {
  const getPerformanceBadge = (perf: number) => {
    if (perf >= 90) return { variant: "default" as const, label: "Excellent", color: "bg-success text-success-foreground" };
    if (perf >= 75) return { variant: "secondary" as const, label: "Good", color: "bg-primary text-primary-foreground" };
    return { variant: "outline" as const, label: "Needs Improvement", color: "" };
  };

  const perfBadge = getPerformanceBadge(performance);

  return (
    <Card className="overflow-hidden border-border/50 hover-lift group">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-gradient-accent flex items-center justify-center text-accent-foreground font-semibold shadow-glow-accent transition-transform group-hover:scale-110">
              {name.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{name}</h3>
              <p className="text-sm text-muted-foreground">{email}</p>
            </div>
          </div>
          <Badge 
            variant={status === "active" ? "default" : "outline"}
            className={status === "active" ? "bg-success text-success-foreground shadow-sm" : ""}
          >
            {status}
          </Badge>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border/50">
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Target className="h-3.5 w-3.5" />
              <span className="text-xs">Deals</span>
            </div>
            <p className="text-lg font-semibold text-foreground">{dealsCount}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground">
              <DollarSign className="h-3.5 w-3.5" />
              <span className="text-xs">Revenue</span>
            </div>
            <p className="text-lg font-semibold text-foreground">${revenue.toLocaleString()}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5" />
              <span className="text-xs">Performance</span>
            </div>
            <Badge variant={perfBadge.variant} className={`mt-1 text-xs ${perfBadge.color}`}>
              {perfBadge.label}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
