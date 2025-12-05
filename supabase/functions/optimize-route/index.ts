import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Stop {
  address: string;
  name: string;
}

Deno.serve(async (req) => {
  const startTime = Date.now();
  const functionName = 'optimize-route';
  let userId: string | null = null;
  let statusCode = 200;
  let errorMessage: string | null = null;
  let supabaseClient: any = null;

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      statusCode = 401;
      errorMessage = 'Unauthorized - No auth header';
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: statusCode, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    
    supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      statusCode = 401;
      errorMessage = 'Unauthorized - Invalid token';
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: statusCode, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    userId = user.id;

    // Check rate limit
    const { data: rateLimitOk } = await supabaseClient.rpc('check_rate_limit', {
      p_user_id: userId,
      p_function_name: functionName,
      p_max_requests: 20,
      p_window_minutes: 1
    });

    if (!rateLimitOk) {
      statusCode = 429;
      errorMessage = "Rate limit exceeded. Please try again later.";
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: statusCode, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Input validation for multi-stop routes
    const routeSchema = z.object({
      stops: z.array(z.object({
        address: z.string().min(1, 'Address cannot be empty').max(500),
        name: z.string().max(200).optional(),
      })).min(2, 'At least 2 stops required').max(25, 'Maximum 25 stops allowed'),
    });

    let validatedInput;
    try {
      const requestBody = await req.json();
      validatedInput = routeSchema.parse(requestBody);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return new Response(
          JSON.stringify({ error: 'Validation failed', details: error.errors }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw error;
    }

    const { stops } = validatedInput;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    console.log(`Optimizing route with ${stops.length} stops for user ${userId}`);

    const stopsDescription = stops.map((s, i) => `${i + 1}. ${s.name || s.address}: ${s.address}`).join('\n');

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a route optimization expert. Analyze the given stops and determine the most efficient order to visit them, considering:
1. Geographic proximity and logical grouping
2. Typical traffic patterns
3. Minimizing backtracking
4. Road network efficiency

Return a JSON object with the optimized route information.`,
          },
          {
            role: "user",
            content: `Optimize this route with ${stops.length} stops:

${stopsDescription}

Return JSON with:
- totalDistance: estimated total miles (number)
- totalTime: estimated total minutes (number)
- optimizedOrder: array of original stop indices in optimal order (0-indexed)
- legs: array of route segments with { from, to, distance (miles), duration (minutes) }

Consider that the first stop is the starting point and we want to visit all stops efficiently. The route does not need to return to start.

Return ONLY valid JSON, no markdown.`,
          },
        ],
        max_completion_tokens: 2000,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("AI gateway error:", data);
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Service unavailable, please try again later." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(data.error?.message || "Failed to optimize route");
    }

    const content = data.choices[0].message.content;
    let routeData = null;

    try {
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        routeData = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      } else {
        routeData = JSON.parse(content);
      }
    } catch {
      console.error("Failed to parse JSON, generating fallback");
      // Generate a simple sequential route as fallback
      routeData = {
        totalDistance: stops.length * 15, // Rough estimate
        totalTime: stops.length * 20, // Rough estimate
        optimizedOrder: stops.map((_, i) => i),
        legs: stops.slice(0, -1).map((stop, i) => ({
          from: stop.name || stop.address,
          to: stops[i + 1].name || stops[i + 1].address,
          distance: 15,
          duration: 20,
        })),
      };
    }

    // Log successful request
    await supabaseClient.from('edge_function_logs').insert({
      user_id: userId,
      function_name: functionName,
      method: req.method,
      status_code: statusCode,
      response_time_ms: Date.now() - startTime,
      metadata: { stops_count: stops.length }
    });

    return new Response(JSON.stringify(routeData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in optimize-route:", error);
    statusCode = 500;
    errorMessage = error instanceof Error ? error.message : "Unknown error";

    if (supabaseClient && userId) {
      await supabaseClient.from('edge_function_logs').insert({
        user_id: userId,
        function_name: functionName,
        method: req.method,
        status_code: statusCode,
        response_time_ms: Date.now() - startTime,
        error_message: errorMessage
      });
    }

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: statusCode, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
