import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    // Authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      statusCode = 401;
      errorMessage = 'Unauthorized - No auth header';
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: statusCode, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Import createClient dynamically
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    
    supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error('Authentication failed:', authError?.message);
      statusCode = 401;
      errorMessage = 'Unauthorized - Invalid token';
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: statusCode, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    userId = user.id;

    // Check rate limit: 20 requests per minute
    const { data: rateLimitOk } = await supabaseClient.rpc('check_rate_limit', {
      p_user_id: userId,
      p_function_name: functionName,
      p_max_requests: 20,
      p_window_minutes: 1
    });

    if (!rateLimitOk) {
      statusCode = 429;
      errorMessage = "Rate limit exceeded. Please try again later.";
      
      await supabaseClient.from('edge_function_logs').insert({
        user_id: userId,
        function_name: functionName,
        method: req.method,
        status_code: statusCode,
        response_time_ms: Date.now() - startTime,
        error_message: errorMessage
      });

      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: statusCode, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log('Request from authenticated user:', user.id);

    // Input validation schema
    const routeSchema = z.object({
      startLocation: z.string()
        .min(1, 'Start location cannot be empty')
        .max(500, 'Start location too long'),
      endLocation: z.string()
        .min(1, 'End location cannot be empty')
        .max(500, 'End location too long')
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

    const { startLocation, endLocation } = validatedInput;
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    console.log("Optimizing route from", startLocation, "to", endLocation);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5-mini-2025-08-07",
        messages: [
          {
            role: "system",
            content: `You are a route optimization expert. Generate realistic route data with gas station recommendations.`,
          },
          {
            role: "user",
            content: `Optimize a route from "${startLocation}" to "${endLocation}". Provide:
- Total distance (in miles)
- Estimated travel time (in hours, decimal)
- 4-6 gas stations along the route with:
  * Name (realistic chain like Shell, Chevron, etc)
  * Full address
  * Current gas price per gallon (realistic prices $3-$5)
  * Distance from start (in miles)
  * Estimated savings compared to average price
- Estimated total gas cost

Format as JSON object with keys: totalDistance, totalTime, gasStations (array with keys: name, address, price, distance, savings), estimatedCost`,
          },
        ],
        max_completion_tokens: 1500,
      }),
    });

    const data = await response.json();
    console.log("OpenAI response received");

    if (!response.ok) {
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
      console.error("Failed to parse JSON, using fallback");
      routeData = {
        totalDistance: 250,
        totalTime: 4.5,
        estimatedCost: 85,
        gasStations: [
          {
            name: "Shell Station",
            address: "100 Highway Rd, Example City, CA",
            price: 3.89,
            distance: 50,
            savings: 0.15,
          },
        ],
      };
    }

    // Log successful request
    if (supabaseClient) {
      await supabaseClient.from('edge_function_logs').insert({
        user_id: userId,
        function_name: functionName,
        method: req.method,
        status_code: statusCode,
        response_time_ms: Date.now() - startTime
      });
    }

    return new Response(JSON.stringify(routeData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in optimize-route:", error);
    statusCode = 500;
    errorMessage = error instanceof Error ? error.message : "Unknown error";

    // Log failed request
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
      {
        status: statusCode,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
