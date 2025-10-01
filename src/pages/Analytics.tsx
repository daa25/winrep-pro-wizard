import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Activity, Users, MapPin, Package } from "lucide-react";

const Analytics = () => {
  const territoryData = [
    { name: "West Coast", value: 35, color: "hsl(var(--chart-1))" },
    { name: "East Coast", value: 30, color: "hsl(var(--chart-2))" },
    { name: "Midwest", value: 20, color: "hsl(var(--chart-3))" },
    { name: "South", value: 15, color: "hsl(var(--chart-4))" }
  ];

  const productData = [
    { product: "Product A", sales: 45000, units: 120 },
    { product: "Product B", sales: 38000, units: 95 },
    { product: "Product C", sales: 52000, units: 140 },
    { product: "Product D", sales: 31000, units: 78 },
    { product: "Product E", sales: 44000, units: 110 }
  ];

  const activityData = [
    { title: "Total Calls", value: "1,234", icon: Activity },
    { title: "Meetings", value: "89", icon: Users },
    { title: "Territories", value: "12", icon: MapPin },
    { title: "Products", value: "47", icon: Package }
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground mt-2">
            Deep insights into sales data and trends
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {activityData.map((item, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {item.title}
                </CardTitle>
                <item.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{item.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="territory" className="space-y-4">
          <TabsList>
            <TabsTrigger value="territory">Territory Analysis</TabsTrigger>
            <TabsTrigger value="products">Product Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="territory" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Sales by Territory</CardTitle>
                <CardDescription>Distribution of sales across regions</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={territoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {territoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Product Sales Comparison</CardTitle>
                <CardDescription>Revenue by product category</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={productData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="product" />
                    <YAxis yAxisId="left" orientation="left" stroke="hsl(var(--primary))" />
                    <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--chart-2))" />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="sales" fill="hsl(var(--primary))" name="Sales ($)" />
                    <Bar yAxisId="right" dataKey="units" fill="hsl(var(--chart-2))" name="Units Sold" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Analytics;