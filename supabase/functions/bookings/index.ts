import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  if (req.method === "POST") {
    const body = await req.json();
    
    if (!body.customer_name || !body.customer_phone || !body.booking_date || !body.booking_time || !body.guests) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { 
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // Check availability (simple check - can be enhanced)
    const { data: existing } = await supabase
      .from("bookings")
      .select("id")
      .eq("booking_date", body.booking_date)
      .eq("booking_time", body.booking_time)
      .in("status", ["pending", "confirmed"]);

    if (existing && existing.length >= 10) { // Max 10 bookings per slot
      return new Response(JSON.stringify({ error: "Slot fully booked" }), { 
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const bookingNumber = `BK-${Date.now().toString(36).toUpperCase()}`;
    
    const { data, error } = await supabase
      .from("bookings")
      .insert({ ...body, booking_number: bookingNumber })
      .select()
      .single();

    if (error) return new Response(JSON.stringify({ error: error.message }), { 
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });

    return new Response(JSON.stringify(data), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }

  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    return new Response(JSON.stringify(data), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }

  return new Response("Method not allowed", { status: 405, headers: corsHeaders });
});