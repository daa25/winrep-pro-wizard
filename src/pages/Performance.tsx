import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, TrendingDown, DollarSign, Target } from "lucide-react";

const Performance = () => {
  const monthlyData = [
    { month: "Jan", sales: 45000, quota: 50000, deals: 12 },
    { month: "Feb", sales: 52000, quota: 50000, deals: 15 },
    { month: "Mar", sales: 48000, quota: 50000, deals: 14 },
    { month: "Apr", sales: 61000, quota: 50000, deals: 18 },
    { month: "May", sales: 55000, quota: 50000, deals: 16 },
    { month: "Jun", sales: 67000, quota: 50000, deals: 20 }
  ];

  const performanceMetrics = [
    {
      title: "Revenue Growth",
      value: "+23.5%",
      change: "+4.2% from last month",
      trend: "up",
      icon: TrendingUp
    },
    {
      title: "Quota Attainment",
      value: "112%",
      change: "Above target",
      trend: "up",
      icon: Target
    },
    {
      title: "Avg Deal Size",
      value: "$3,350",
      change: "-2.1% from last month",
      trend: "down",
      icon: DollarSign
    },
    {
      title: "Win Rate",
      value: "68%",
      change: "+5.3% from last month",
      trend: "up",
      icon: TrendingUp
    }
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Performance Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Track sales performance and key metrics
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {performanceMetrics.map((metric, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {metric.title}
                </CardTitle>
                <metric.icon className={`h-4 w-4 ${metric.trend === 'up' ? 'text-green-500' : 'text-red-500'}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metric.value}</div>
                <p className={`text-xs ${metric.trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                  {metric.change}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Sales vs Quota</CardTitle>
              <CardDescription>Monthly performance comparison</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="sales" stroke="hsl(var(--primary))" strokeWidth={2} />
                  <Line type="monotone" dataKey="quota" stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Deals Closed</CardTitle>
              <CardDescription>Monthly deal count</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="deals" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Performance;