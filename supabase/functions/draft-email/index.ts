const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { companyName, companyWebsite, products } = await req.json();
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    console.log("Drafting email for:", companyName);

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

    return new Response(JSON.stringify({ email }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in draft-email:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
