import {createClient} from "https://esm.sh/@supabase/supabase-js@2";
import {fieldError, rateLimiter, requestHandler} from "../_shared/http.ts";

const allowRequest = rateLimiter(60);

Deno.serve(requestHandler("GET", async (req, _body, respond) => {
  if (!allowRequest(req)) return respond(429, {error: "Too many requests. Please slow down."});
  const params = new URL(req.url).searchParams;
  const category = params.get("category");
  const veg = params.get("veg");
  const search = params.get("search");
  if (category && category.length > 100) return respond(400, fieldError("category", "Use at most 100 characters."));
  if (search && search.length > 100) return respond(400, fieldError("search", "Use at most 100 characters."));
  if (veg !== null && veg !== "true" && veg !== "false") return respond(400, fieldError("veg", "Use true or false."));

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  let query = supabase.from("menu_items")
    .select("*, category:menu_categories!inner(name, slug, is_active)")
    .eq("is_available", true).eq("category.is_active", true).order("display_order");
  if (category) query = query.eq("category.slug", category);
  if (veg !== null) query = query.eq("veg", veg === "true");
  if (search) query = query.ilike("name", `%${search}%`);
  const {data, error} = await query;
  const categories = await supabase.from("menu_categories").select("*").eq("is_active", true).order("display_order");
  if (error || categories.error) throw new Error("Catalog unavailable");
  return respond(200, {items: data, categories: categories.data});
}));
