import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Fetch route performance data for the last 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data: performances, error: perfError } = await supabase
      .from('route_performance')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', ninetyDaysAgo.toISOString())
      .order('created_at', { ascending: false });

    if (perfError) throw perfError;

    if (!performances || performances.length === 0) {
      return new Response(
        JSON.stringify({
          insights: [],
          recommendations: ['Start tracking routes to get personalized insights'],
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Analyze by day of week
    const byDay: Record<number, { durations: number[], distances: number[], count: number }> = {};
    
    for (const perf of performances) {
      if (!byDay[perf.day_of_week]) {
        byDay[perf.day_of_week] = { durations: [], distances: [], count: 0 };
      }
      if (perf.total_duration_minutes) {
        byDay[perf.day_of_week].durations.push(perf.total_duration_minutes);
      }
      if (perf.total_distance_miles) {
        byDay[perf.day_of_week].distances.push(perf.total_distance_miles);
      }
      byDay[perf.day_of_week].count++;
    }

    const insights = [];
    const recommendations = [];
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

    // Find slowest and fastest days
    let slowestDay = { day: 0, avgDuration: 0 };
    let fastestDay = { day: 0, avgDuration: Infinity };

    for (const [dayStr, data] of Object.entries(byDay)) {
      const day = parseInt(dayStr);
      if (data.durations.length === 0) continue;
      
      const avgDuration = data.durations.reduce((a, b) => a + b, 0) / data.durations.length;
      
      if (avgDuration > slowestDay.avgDuration) {
        slowestDay = { day, avgDuration };
      }
      if (avgDuration < fastestDay.avgDuration) {
        fastestDay = { day, avgDuration };
      }
    }

    if (slowestDay.avgDuration > 0) {
      insights.push({
        type: 'slow_day',
        message: `${dayNames[slowestDay.day]} routes typically take ${Math.round(slowestDay.avgDuration)} minutes`,
        day: slowestDay.day,
      });
      
      if (slowestDay.avgDuration > fastestDay.avgDuration * 1.3) {
        recommendations.push(
          `Consider redistributing stops from ${dayNames[slowestDay.day]} to ${dayNames[fastestDay.day]} for better balance`
        );
      }
    }

    // Traffic pattern analysis
    const recentPerformances = performances.slice(0, 20);
    const avgTrafficScore = recentPerformances
      .filter(p => p.traffic_score != null)
      .reduce((sum, p) => sum + (p.traffic_score || 0), 0) / recentPerformances.length;

    if (avgTrafficScore > 7) {
      recommendations.push('Heavy traffic detected on recent routes. Consider starting 30 minutes earlier.');
    }

    // Stop efficiency
    const avgStopsPerRoute = performances
      .reduce((sum, p) => sum + p.stops_completed, 0) / performances.length;
    
    insights.push({
      type: 'efficiency',
      message: `Average ${avgStopsPerRoute.toFixed(1)} stops completed per route`,
    });

    if (avgStopsPerRoute < 5) {
      recommendations.push('Route efficiency could be improved by grouping nearby stops together');
    }

    return new Response(
      JSON.stringify({
        insights,
        recommendations,
        stats: {
          totalRoutes: performances.length,
          avgStopsPerRoute: Math.round(avgStopsPerRoute),
          bestDay: dayNames[fastestDay.day],
          slowestDay: dayNames[slowestDay.day],
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
