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
    
    // Validate required fields
    if (!body.customer_name || !body.customer_phone || !body.items?.length) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { 
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const orderNumber = `CDL-${Date.now().toString(36).toUpperCase()}`;
    
    const { data, error } = await supabase
      .from("orders")
      .insert({ 
        ...body, 
        order_number: orderNumber,
        total_inr: body.subtotal_inr + (body.delivery_fee_inr || 0) + (body.tax_inr || 0)
      })
      .select()
      .single();

    if (error) return new Response(JSON.stringify({ error: error.message }), { 
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });

    // TODO: Send WhatsApp via Business API
    // await sendWhatsAppOrder(data);

    return new Response(JSON.stringify(data), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }

  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    return new Response(JSON.stringify(data), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }

  return new Response("Method not allowed", { status: 405, headers: corsHeaders });
});