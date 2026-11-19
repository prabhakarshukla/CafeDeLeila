import { cors, readJson, visitorKey } from "../_shared/http.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";


const MAX_BODY_SIZE = 1024 * 1024; // 1 MB
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30; // 30 requests per minute per IP

// Simple in-memory rate limiter (per deployment instance)
const rateLimitMap = new Map<string, { count: number; windowStart: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }
  entry.count++;
  return true;
}

function validateIndianPhone(phone: string): boolean {
  return /^91[6-9]\d{9}$/.test(phone);
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function sanitizeText(text: string, maxLen: number): string {
  return text.slice(0, maxLen).replace(/[<>]/g, "");
}

serve(async (req) => {
  const corsHeaders = Object.fromEntries(cors(req, "POST"));
  if (req.headers.has("origin") && !corsHeaders["access-control-allow-origin"]) return new Response(null, {status: 403, headers: corsHeaders});
  if (req.method === "OPTIONS") return new Response(null, {status: 204, headers: corsHeaders});
  if (req.method !== "POST") return new Response(null, {status: 405, headers: corsHeaders});
  // Rate limiting
  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!checkRateLimit(clientIp)) {
    return new Response(JSON.stringify({ error: "Too many requests. Please slow down." }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // CORS preflight

  // Body size limit
  const contentLength = req.headers.get("content-length");
  if (contentLength && parseInt(contentLength) > MAX_BODY_SIZE) {
    return new Response(JSON.stringify({ error: "Request body too large" }), {
      status: 413,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  if (req.method === "POST") {
    let body: any;
    try {
      body = await readJson(req);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate required fields
    if (typeof body.customer_name !== "string" || !body.customer_name.trim() || typeof body.customer_phone !== "string" || !Array.isArray(body.items) || !body.items.length || body.items.length > 50 || body.items.some((item: any) => !item || !/^[a-f0-9-]{36}$/i.test(item.id))) {
      return new Response(JSON.stringify({ error: "Missing required fields: customer_name, customer_phone, items" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate phone
    if (!validateIndianPhone(body.customer_phone)) {
      return new Response(JSON.stringify({ error: "Invalid phone number. Must be 12-digit Indian number starting with 91" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate email if provided
    if (body.customer_email && !validateEmail(body.customer_email)) {
      return new Response(JSON.stringify({ error: "Invalid email address" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate order_type
    const validOrderTypes = ["dine_in", "takeaway", "delivery"];
    const orderType = body.order_type || "dine_in";
    if (!validOrderTypes.includes(orderType)) {
      return new Response(JSON.stringify({ error: "Invalid order_type. Must be dine_in, takeaway, or delivery" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate delivery address for delivery orders
    if (orderType === "delivery") {
      if (typeof body.delivery_address?.full !== "string" || !body.delivery_address.full.trim() || body.delivery_address.full.length > 500) {
        return new Response(JSON.stringify({ error: "Delivery address required for delivery orders" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Fetch menu items to compute prices server-side
    const itemIds = body.items.map((i: any) => i.id);
    const { data: menuItems, error: menuError } = await supabase
      .from("menu_items")
      .select("id, name, price_inr, veg, is_available, category:menu_categories!inner(is_active)")
      .eq("category.is_active", true)
      .in("id", itemIds);

    if (menuError) {
      return new Response(JSON.stringify({ error: "Failed to fetch menu items" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const menuMap = new Map(menuItems.map((m: any) => [m.id, m]));

    // Validate each item and compute totals
    let subtotal = 0;
    const validatedItems = [];

    for (const item of body.items) {
      const menuItem = menuMap.get(item.id);
      if (!menuItem) {
        return new Response(JSON.stringify({ error: `Unknown menu item: ${item.id}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!menuItem.is_available) {
        return new Response(JSON.stringify({ error: `Item not available: ${menuItem.name}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const qty = item.quantity;
      if (!Number.isInteger(qty) || qty < 1 || qty > 50) {
        return new Response(JSON.stringify({ error: `Invalid quantity for ${menuItem.name}: must be 1-50` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const lineTotal = menuItem.price_inr * qty;
      subtotal += lineTotal;

      validatedItems.push({
        id: menuItem.id,
        name: menuItem.name,
        price_inr: menuItem.price_inr,
        quantity: qty,
        veg: menuItem.veg,
      });
    }

    // Check if ordering is enabled (from settings)
    const { data: settings } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "ordering_enabled")
      .single();

    if (settings?.value?.ordering_enabled === false) {
      return new Response(JSON.stringify({ error: "Ordering is currently disabled" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get delivery settings
    const { data: deliverySettings } = await supabase
      .from("settings")
      .select("key,value")
      .in("key", ["delivery_enabled", "delivery_fee", "min_order", "tax_percent"]);

    const settingsMap = new Map(deliverySettings?.map((s: any) => [s.key, s.value]) || []);
    const deliveryEnabled = settingsMap.get("delivery_enabled")?.enabled ?? false;
    const deliveryFee = orderType === "delivery" && deliveryEnabled ? (settingsMap.get("delivery_fee")?.amount ?? 0) : 0;
    const minOrder = settingsMap.get("min_order")?.amount ?? 0;
    const taxPercent = settingsMap.get("tax_percent")?.value ?? 0;

    if (orderType === "delivery" && !deliveryEnabled) {
      return new Response(JSON.stringify({ error: "Delivery is currently unavailable" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (orderType === "delivery" && subtotal < minOrder) {
      return new Response(JSON.stringify({ error: `Minimum order for delivery is ₹${minOrder}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tax = Math.round(subtotal * (taxPercent / 100));
    const total = subtotal + deliveryFee + tax;

    // Create order with server-computed values
    const orderNumber = `CDL-${Date.now().toString(36).toUpperCase()}`; // Fallback; trigger will set final

    const { data, error } = await supabase
      .from("orders")
      .insert({
        customer_name: sanitizeText(body.customer_name, 100),
        customer_phone: body.customer_phone,
        customer_email: body.customer_email ? sanitizeText(body.customer_email, 255) : null,
        order_type: orderType,
        delivery_address: body.delivery_address || null,
        items: validatedItems,
        subtotal_inr: subtotal,
        delivery_fee_inr: deliveryFee,
        tax_inr: tax,
        total_inr: total,
        notes: body.notes ? sanitizeText(body.notes, 500) : null,
        payment_status: "unpaid",
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      console.error("Order insert error:", error);
      return new Response(JSON.stringify({ error: "Failed to create order" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // TODO: Send WhatsApp via Business API (async, don't block response)
    // await sendWhatsAppOrder(data);

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response("Method not allowed", { status: 405, headers: corsHeaders });
});