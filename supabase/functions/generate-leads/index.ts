const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - No auth header' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Import createClient dynamically
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error('Authentication failed:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid token' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log('Request from authenticated user:', user.id);

    const { route, radius } = await req.json();
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    console.log("Generating leads for route:", route, "radius:", radius);

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
            content: `You are a B2B lead generation expert specializing in sports and retail industries. Generate realistic potential business leads along routes.`,
          },
          {
            role: "user",
            content: `Generate 5-10 potential business leads for a sales rep traveling along this route: "${route}" within ${radius} miles. For each lead, provide:
- Company name (realistic)
- Full address
- Industry category
- Website (realistic domain)
- Match score (0-100)
- Key insights about why this company would be a good prospect

Format as JSON array with keys: name, address, industry, website, score, insights`,
          },
        ],
        max_completion_tokens: 2000,
      }),
    });

    const data = await response.json();
    console.log("OpenAI response:", data);

    if (!response.ok) {
      throw new Error(data.error?.message || "Failed to generate leads");
    }

    const content = data.choices[0].message.content;
    let leads = [];

    try {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        leads = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      } else {
        leads = JSON.parse(content);
      }
    } catch {
      console.error("Failed to parse JSON, using fallback");
      leads = [
        {
          name: "Example Sports Store",
          address: "123 Main St, Los Angeles, CA",
          industry: "Retail - Sports Equipment",
          website: "https://examplesports.com",
          score: 85,
          insights: "High-traffic retail location, expanding product lines",
        },
      ];
    }

    return new Response(JSON.stringify({ leads }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in generate-leads:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
