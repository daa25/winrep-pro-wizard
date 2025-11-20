import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
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
      throw new Error("Unauthorized");
    }

    // Input validation schema
    const smsSchema = z.object({
      phoneNumber: z.string()
        .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
        .max(20, 'Phone number too long'),
      message: z.string()
        .min(1, 'Message cannot be empty')
        .max(1600, 'Message exceeds SMS limit'),
      customerId: z.string().uuid().optional()
    });

    let validatedInput;
    try {
      const requestBody = await req.json();
      validatedInput = smsSchema.parse(requestBody);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return new Response(
          JSON.stringify({ error: 'Validation failed', details: error.errors }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw error;
    }

    const { phoneNumber, message, customerId } = validatedInput;

    console.log("Processing SMS request");

    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioMessagingServiceSid = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID");

    if (!twilioAccountSid || !twilioAuthToken || !twilioMessagingServiceSid) {
      throw new Error("Twilio credentials not configured");
    }

    // Create notification record
    const { data: notification, error: notificationError } = await supabase
      .from("sms_notifications")
      .insert({
        user_id: user.id,
        customer_id: customerId || null,
        phone_number: phoneNumber,
        message: message,
        status: "pending",
      })
      .select()
      .single();

    if (notificationError) {
      throw notificationError;
    }

    // Send SMS via Twilio
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
    const credentials = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

    const twilioResponse = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: phoneNumber,
        MessagingServiceSid: twilioMessagingServiceSid,
        Body: message,
      }),
    });

    const twilioData = await twilioResponse.json();

    if (!twilioResponse.ok) {
      // Update notification with error
      await supabase
        .from("sms_notifications")
        .update({
          status: "failed",
          error_message: twilioData.message || "Failed to send SMS",
        })
        .eq("id", notification.id);

      throw new Error(twilioData.message || "Failed to send SMS");
    }

    // Update notification with success
    await supabase
      .from("sms_notifications")
      .update({
        status: "sent",
        twilio_sid: twilioData.sid,
        sent_at: new Date().toISOString(),
      })
      .eq("id", notification.id);

    console.log("SMS sent successfully with SID:", twilioData.sid);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sid: twilioData.sid,
        notificationId: notification.id
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error sending SMS:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});