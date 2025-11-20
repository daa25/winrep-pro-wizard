import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Activity, AlertCircle, Clock, TrendingUp } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface EdgeFunctionLog {
  id: string;
  function_name: string;
  status_code: number | null;
  response_time_ms: number | null;
  error_message: string | null;
  created_at: string;
  method: string | null;
}

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export default function EdgeFunctionMonitoring() {
  const { data: logs, isLoading } = useQuery({
    queryKey: ['edge-function-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('edge_function_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);
      
      if (error) throw error;
      return data as EdgeFunctionLog[];
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Calculate metrics
  const totalRequests = logs?.length || 0;
  const errorCount = logs?.filter(log => log.status_code && log.status_code >= 400).length || 0;
  const errorRate = totalRequests > 0 ? ((errorCount / totalRequests) * 100).toFixed(2) : '0';
  const avgResponseTime = logs?.length 
    ? (logs.reduce((sum, log) => sum + (log.response_time_ms || 0), 0) / logs.length).toFixed(0)
    : '0';

  // Requests by function
  const requestsByFunction = logs?.reduce((acc, log) => {
    acc[log.function_name] = (acc[log.function_name] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const functionData = Object.entries(requestsByFunction || {}).map(([name, value]) => ({
    name,
    requests: value,
  }));

  // Error rate by function
  const errorsByFunction = logs?.reduce((acc, log) => {
    if (log.status_code && log.status_code >= 400) {
      acc[log.function_name] = (acc[log.function_name] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const errorRateData = Object.entries(requestsByFunction || {}).map(([name, total]) => ({
    name,
    errorRate: ((errorsByFunction[name] || 0) / total * 100).toFixed(1),
    errors: errorsByFunction[name] || 0,
  }));

  // Response time by function
  const responseTimeData = Object.keys(requestsByFunction || {}).map(funcName => {
    const funcLogs = logs?.filter(log => log.function_name === funcName && log.response_time_ms) || [];
    const avgTime = funcLogs.length 
      ? funcLogs.reduce((sum, log) => sum + (log.response_time_ms || 0), 0) / funcLogs.length
      : 0;
    return {
      name: funcName,
      avgResponseTime: Math.round(avgTime),
    };
  });

  // Requests over time (last 24 hours, grouped by hour)
  const requestsOverTime = logs?.reduce((acc, log) => {
    const date = new Date(log.created_at);
    const hour = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:00`;
    acc[hour] = (acc[hour] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const timelineData = Object.entries(requestsOverTime || {})
    .slice(-24)
    .map(([time, count]) => ({ time, requests: count }));

  // Recent errors
  const recentErrors = logs?.filter(log => log.error_message).slice(0, 10) || [];

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Edge Function Monitoring</h1>
          <p className="text-muted-foreground">Track usage, performance, and errors across all edge functions</p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalRequests.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Last 1000 requests</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{errorRate}%</div>
              <p className="text-xs text-muted-foreground">{errorCount} errors</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgResponseTime}ms</div>
              <p className="text-xs text-muted-foreground">Across all functions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Functions</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Object.keys(requestsByFunction || {}).length}</div>
              <p className="text-xs text-muted-foreground">Functions with traffic</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="errors">Errors</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Requests by Function</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={functionData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--popover))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '6px'
                        }}
                      />
                      <Bar dataKey="requests" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Requests Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={timelineData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="time" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--popover))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '6px'
                        }}
                      />
                      <Line type="monotone" dataKey="requests" stroke="hsl(var(--primary))" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Average Response Time by Function</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={responseTimeData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" label={{ value: 'ms', position: 'insideRight' }} />
                    <YAxis dataKey="name" type="category" width={150} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px'
                      }}
                    />
                    <Bar dataKey="avgResponseTime" fill="hsl(var(--chart-2))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="errors" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Error Rate by Function</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={errorRateData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={100} />
                      <YAxis label={{ value: '%', position: 'insideLeft' }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--popover))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '6px'
                        }}
                      />
                      <Bar dataKey="errorRate" fill="hsl(var(--destructive))" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Errors</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-[300px] overflow-y-auto">
                    {recentErrors.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No recent errors</p>
                    ) : (
                      recentErrors.map((log) => (
                        <div key={log.id} className="border-l-2 border-destructive pl-3 py-2">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium">{log.function_name}</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(log.created_at).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">{log.error_message}</p>
                          <span className="text-xs text-destructive">Status: {log.status_code}</span>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
