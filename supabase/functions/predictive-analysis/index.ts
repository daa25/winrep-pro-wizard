const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  const startTime = Date.now();
  const functionName = 'predictive-analysis';
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

    // Check rate limit: 10 requests per minute for expensive AI analysis
    const { data: rateLimitOk } = await supabaseClient.rpc('check_rate_limit', {
      p_user_id: userId,
      p_function_name: functionName,
      p_max_requests: 10,
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

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    console.log("Running predictive analysis");

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
            content: `You are a business analyst specializing in B2B partnerships and market analysis. Generate realistic predictive insights for potential business partnerships.`,
          },
          {
            role: "user",
            content: `Generate 8-12 predictive analysis results for potential business partnerships in the sports and retail industry. For each prospect, provide:
- Company name (realistic)
- Industry
- Match score (0-100 based on partnership potential)
- Estimated revenue potential (format: $XX,XXX)
- Growth potential description (1-2 sentences)
- 3-4 specific recommendations for approaching them

Focus on businesses that would benefit from sports equipment, retail products, or related services.

Format as JSON array with keys: companyName, industry, score, revenue, potential, recommendations (array of strings)`,
          },
        ],
        max_completion_tokens: 3000,
      }),
    });

    const data = await response.json();
    console.log("OpenAI response received");

    if (!response.ok) {
      throw new Error(data.error?.message || "Failed to run analysis");
    }

    const content = data.choices[0].message.content;
    let predictions = [];

    try {
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        predictions = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      } else {
        predictions = JSON.parse(content);
      }
    } catch {
      console.error("Failed to parse JSON, using fallback");
      predictions = [
        {
          companyName: "Example Sports Center",
          industry: "Fitness & Recreation",
          score: 87,
          revenue: "$45,000",
          potential: "Expanding chain with multiple locations. Strong online presence and community engagement.",
          recommendations: [
            "Highlight bulk pricing options",
            "Offer demo program for new products",
            "Connect with procurement manager",
          ],
        },
      ];
    }

    // Log successful request
    if (supabaseClient) {
      await supabaseClient.from('edge_function_logs').insert({
        user_id: userId,
        function_name: functionName,
        method: req.method,
        status_code: statusCode,
        response_time_ms: Date.now() - startTime,
        metadata: { prediction_count: predictions.length }
      });
    }

    return new Response(JSON.stringify({ predictions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in predictive-analysis:", error);
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
