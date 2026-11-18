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

  // Get signed upload URL for CV
  if (req.method === "POST" && new URL(req.url).pathname.endsWith("/get-upload-url")) {
    const { fileName, contentType } = await req.json();
    const path = `cvs/${crypto.randomUUID()}-${fileName}`;
    const { data, error } = await supabase.storage
      .from('cv-uploads')
      .createSignedUploadUrl(path);
    
    if (error) return new Response(JSON.stringify({ error: error.message }), { 
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
    
    return new Response(JSON.stringify({ signedUrl: data.signedUrl, path }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }

  if (req.method === "POST") {
    const body = await req.json();
    
    if (!body.full_name || !body.email || !body.phone || !body.role) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { 
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const applicationNumber = `APP-${Date.now().toString(36).toUpperCase()}`;
    
    const { data, error } = await supabase
      .from("job_applications")
      .insert({ ...body, application_number: applicationNumber })
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
      .from("job_applications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    return new Response(JSON.stringify(data), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }

  return new Response("Method not allowed", { status: 405, headers: corsHeaders });
});