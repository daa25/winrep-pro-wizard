import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  const startTime = Date.now();
  const functionName = 'geocode-address';
  let userId: string | null = null;
  let statusCode = 200;
  let errorMessage: string | null = null;

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      statusCode = 401;
      errorMessage = "Unauthorized";
      throw new Error("Unauthorized");
    }

    userId = user.id;

    // Check rate limit: 60 requests per minute
    const { data: rateLimitOk } = await supabase.rpc('check_rate_limit', {
      p_user_id: userId,
      p_function_name: functionName,
      p_max_requests: 60,
      p_window_minutes: 1
    });

    if (!rateLimitOk) {
      statusCode = 429;
      errorMessage = "Rate limit exceeded. Please try again later.";
      
      await supabase.from('edge_function_logs').insert({
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

    // Input validation schema
    const addressSchema = z.object({
      address: z.string()
        .min(1, 'Address cannot be empty')
        .max(500, 'Address too long')
    });

    let validatedInput;
    try {
      const requestBody = await req.json();
      validatedInput = addressSchema.parse(requestBody);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return new Response(
          JSON.stringify({ error: 'Validation failed', details: error.errors }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw error;
    }

    const { address } = validatedInput;

    const googleMapsApiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");

    if (!googleMapsApiKey) {
      throw new Error("Google Maps API key not configured");
    }

    console.log("Processing geocoding request");

    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${googleMapsApiKey}`;

    const response = await fetch(geocodeUrl);
    const data = await response.json();

    if (data.status !== "OK") {
      throw new Error(`Geocoding failed: ${data.status}`);
    }

    const result = data.results[0];
    const location = result.geometry.location;

    console.log("Geocoding successful:", location);

    // Log successful request
    await supabase.from('edge_function_logs').insert({
      user_id: userId,
      function_name: functionName,
      method: req.method,
      status_code: statusCode,
      response_time_ms: Date.now() - startTime
    });

    return new Response(
      JSON.stringify({
        latitude: location.lat,
        longitude: location.lng,
        formatted_address: result.formatted_address,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error geocoding address:", error);
    statusCode = 400;
    errorMessage = error.message;

    // Log failed request
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    await supabase.from('edge_function_logs').insert({
      user_id: userId,
      function_name: functionName,
      method: req.method,
      status_code: statusCode,
      response_time_ms: Date.now() - startTime,
      error_message: errorMessage
    });

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: statusCode, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});