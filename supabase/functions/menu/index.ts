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

  const url = new URL(req.url);
  const category = url.searchParams.get("category");
  const veg = url.searchParams.get("veg");
  const search = url.searchParams.get("search");

  if (req.method === "GET") {
    let query = supabase
      .from("menu_items")
      .select(`
        *,
        category:menu_categories!inner(name, slug)
      `)
      .eq("is_available", true)
      .order("display_order");

    if (category) query = query.eq("category.slug", category);
    if (veg === "true") query = query.eq("veg", true);
    if (veg === "false") query = query.eq("veg", false);
    if (search) query = query.ilike("name", `%${search}%`);

    const { data, error } = await query;

    if (error) return new Response(JSON.stringify({ error: error.message }), { 
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });

    // Also fetch categories
    const { data: categories } = await supabase
      .from("menu_categories")
      .select("*")
      .eq("is_active", true)
      .order("display_order");

    return new Response(JSON.stringify({ items: data, categories }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }

  return new Response("Method not allowed", { status: 405, headers: corsHeaders });
});