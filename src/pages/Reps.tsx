import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp, DollarSign, Target } from "lucide-react";
import RepCard from "@/components/RepCard";

const Reps = () => {
  const reps = [
    {
      id: 1,
      name: "John Smith",
      email: "john.smith@winzer.com",
      status: "active" as const,
      dealsCount: 24,
      revenue: 125000,
      performance: 83
    },
    {
      id: 2,
      name: "Sarah Johnson",
      email: "sarah.johnson@winzer.com",
      status: "active" as const,
      dealsCount: 31,
      revenue: 142000,
      performance: 95
    },
    {
      id: 3,
      name: "Mike Chen",
      email: "mike.chen@winzer.com",
      status: "active" as const,
      dealsCount: 18,
      revenue: 98000,
      performance: 65
    }
  ];

  const stats = [
    {
      title: "Total Reps",
      value: reps.length.toString(),
      icon: Users,
      description: "Active sales representatives"
    },
    {
      title: "Avg Performance",
      value: "81%",
      icon: TrendingUp,
      description: "Across all reps"
    },
    {
      title: "Total Sales",
      value: "$365K",
      icon: DollarSign,
      description: "Combined revenue"
    },
    {
      title: "Total Deals",
      value: "73",
      icon: Target,
      description: "Closed this quarter"
    }
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sales Representatives</h1>
          <p className="text-muted-foreground mt-2">
            Manage and monitor your sales team performance
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {reps.map((rep) => (
            <RepCard key={rep.id} {...rep} />
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default Reps;