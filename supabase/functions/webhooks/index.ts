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

  // Razorpay webhook
  if (req.method === "POST" && new URL(req.url).pathname.endsWith("/razorpay")) {
    const body = await req.json();
    
    // Verify signature (implement with Razorpay secret)
    // const expectedSig = crypto.createHmac('sha256', RAZORPAY_SECRET).update(JSON.stringify(body)).digest('hex');
    // if (expectedSig !== req.headers.get('x-razorpay-signature')) return new Response('Invalid signature', { status: 400 });

    const paymentId = body.payload.payment.entity.id;
    const orderId = body.payload.payment.entity.notes?.supabase_order_id;
    
    if (orderId) {
      await supabase
        .from("orders")
        .update({ 
          payment_status: "paid", 
          payment_id: paymentId,
          status: "confirmed",
          payment_method: "razorpay"
        })
        .eq("id", orderId);
    }
    
    return new Response("OK", { headers: corsHeaders });
  }

  // WhatsApp Business webhook (for delivery receipts)
  if (req.method === "POST" && new URL(req.url).pathname.endsWith("/whatsapp")) {
    // Handle WhatsApp status updates
    return new Response("OK", { headers: corsHeaders });
  }

  return new Response("Not found", { status: 404, headers: corsHeaders });
});