import { cors, readJson, visitorKey } from "../_shared/http.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";


const rateLimitMap = new Map<string, { count: number; windowStart: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now - entry.windowStart > 60_000) {
    rateLimitMap.set(ip, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= 60) { // Higher limit for menu reads
    return false;
  }
  entry.count++;
  return true;
}

function sanitizeText(text: string, maxLen: number): string {
  return text.slice(0, maxLen).replace(/[<>]/g, "");
}

serve(async (req) => {
  const corsHeaders = Object.fromEntries(cors(req, "GET"));
  if (req.headers.has("origin") && !corsHeaders["access-control-allow-origin"]) return new Response(null, {status: 403, headers: corsHeaders});
  if (req.method === "OPTIONS") return new Response(null, {status: 204, headers: corsHeaders});
  if (req.method !== "GET") return new Response(null, {status: 405, headers: corsHeaders});
  // Rate limiting
  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  let rateLimitMap = (globalThis as any).__menuRateLimitMap;
  if (!rateLimitMap) {
    rateLimitMap = new Map();
    (globalThis as any).__menuRateLimitMap = rateLimitMap;
  }
  const entry = rateLimitMap.get(clientIp);
  if (!entry || now - entry.windowStart > 60_000) {
    rateLimitMap.set(clientIp, { count: 1, windowStart: now });
  } else if (entry.count >= 60) { // 60 req/min for menu
    return new Response(JSON.stringify({ error: "Too many requests. Please slow down." }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } else {
    entry.count++;
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const url = new URL(req.url);
  const category = url.searchParams.get("category");
  const veg = url.searchParams.get("veg");
  const search = url.searchParams.get("search");

  if (req.method === "GET") {
    // Validate and sanitize query params
    const sanitizedCategory = category ? sanitizeText(category, 100) : null;
    const sanitizedVeg = veg === "true" ? true : veg === "false" ? false : null;
    const sanitizedSearch = search ? sanitizeText(search, 100) : null;

    let query = supabase
      .from("menu_items")
      .select(`
        *,
        category:menu_categories!inner(name, slug, is_active)
      `)
      .eq("is_available", true)
      .eq("category.is_active", true)
      .order("display_order");

    if (sanitizedCategory) query = query.eq("category.slug", sanitizedCategory);
    if (sanitizedVeg !== null) query = query.eq("veg", sanitizedVeg);
    if (sanitizedSearch) query = query.ilike("name", `%${sanitizedSearch}%`);

    const { data, error } = await query;

    if (error) return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

    // Also fetch categories
    const { data: categories } = await supabase
      .from("menu_categories")
      .select("*")
      .eq("is_active", true)
      .order("display_order");

    return new Response(JSON.stringify({ items: data, categories }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response("Method not allowed", { status: 405, headers: corsHeaders });
});
