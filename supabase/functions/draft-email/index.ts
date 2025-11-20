import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  const startTime = Date.now();
  const functionName = 'draft-email';
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

    // Check rate limit: 20 requests per minute for AI functions
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

    console.log('Processing authenticated email draft request');

    // Input validation schema
    const emailDraftSchema = z.object({
      companyName: z.string()
        .min(1, 'Company name cannot be empty')
        .max(200, 'Company name too long'),
      companyWebsite: z.string()
        .url('Invalid website URL')
        .max(500, 'Website URL too long')
        .optional(),
      products: z.string()
        .max(2000, 'Products description too long')
        .optional()
    });

    let validatedInput;
    try {
      const requestBody = await req.json();
      validatedInput = emailDraftSchema.parse(requestBody);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return new Response(
          JSON.stringify({ error: 'Validation failed', details: error.errors }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw error;
    }

    const { companyName, companyWebsite, products } = validatedInput;
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    console.log("Generating email draft");

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
            content: `You are a professional B2B sales email writer. Write personalized, compelling outreach emails that:
- Are concise and professional
- Show genuine interest in the prospect's business
- Clearly communicate value proposition
- Include a clear call to action
- Avoid being pushy or salesy`,
          },
          {
            role: "user",
            content: `Write a professional outreach email to ${companyName}${companyWebsite ? ` (${companyWebsite})` : ""}.

Products/Services to offer:
${products}

Create a personalized email that:
1. Opens with a relevant connection or insight about their business
2. Briefly explains how our products can benefit them specifically
3. Includes a clear next step
4. Keeps it under 200 words

Format: Subject line, then email body.`,
          },
        ],
        max_completion_tokens: 800,
      }),
    });

    const data = await response.json();
    console.log("OpenAI response received");

    if (!response.ok) {
      throw new Error(data.error?.message || "Failed to draft email");
    }

    const email = data.choices[0].message.content;

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

    return new Response(JSON.stringify({ email }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in draft-email:", error);
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
