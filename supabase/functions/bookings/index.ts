import { cors, readJson, visitorKey } from "../_shared/http.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";


const MAX_BODY_SIZE = 1024 * 1024; // 1 MB
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30; // 30 requests per minute per IP

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

function validateDateNotPast(dateStr: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const inputDate = new Date(dateStr + "T00:00:00");
  return inputDate >= today;
}

serve(async (req) => {
  const corsHeaders = Object.fromEntries(cors(req, "POST"));
  if (req.headers.has("origin") && !corsHeaders["access-control-allow-origin"]) return new Response(null, {status: 403, headers: corsHeaders});
  if (req.method === "OPTIONS") return new Response(null, {status: 204, headers: corsHeaders});
  if (req.method !== "POST") return new Response(null, {status: 405, headers: corsHeaders});
  // Rate limiting
  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  // Simple rate limiting (same as orders)
  const now = Date.now();
  const entry = (globalThis as any).__rateLimitMap?.get?.(req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown");
  if (!entry || now - entry.windowStart > 60_000) {
    if (!(globalThis as any).__rateLimitMap) (globalThis as any).__rateLimitMap = new Map();
    (globalThis as any).__rateLimitMap.set(req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown", { count: 1, windowStart: now });
  } else {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const e = (globalThis as any).__rateLimitMap.get(ip);
    if (e && e.count >= 30) {
      return new Response(JSON.stringify({ error: "Too many requests. Please slow down." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (e) e.count++;
  }

  const contentLength = req.headers.get("content-length");
  if (contentLength && parseInt(contentLength) > 1024 * 1024) {
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
    if (!body.customer_name || !body.customer_phone || !body.booking_date || !body.booking_time || !body.guests) {
      return new Response(JSON.stringify({ error: "Missing required fields: customer_name, customer_phone, booking_date, booking_time, guests" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate phone
    if (!/^91[6-9]\d{9}$/.test(body.customer_phone)) {
      return new Response(JSON.stringify({ error: "Invalid phone number. Must be 12-digit Indian number starting with 91" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate email if provided
    if (body.customer_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.customer_email)) {
      return new Response(JSON.stringify({ error: "Invalid email address" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate date not in past
    if (!validateDateNotPast(body.booking_date)) {
      return new Response(JSON.stringify({ error: "Booking date cannot be in the past" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate time format HH:MM
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(body.booking_time)) {
      return new Response(JSON.stringify({ error: "Invalid time format. Use HH:MM" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate guests 1-20
    const guests = body.guests;
    if (!Number.isInteger(guests) || guests < 1 || guests > 20) {
      return new Response(JSON.stringify({ error: "Guests must be between 1 and 20" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Sanitize text fields
    const customerName = body.customer_name.slice(0, 100).replace(/[<>]/g, "");
    const customerEmail = body.customer_email ? body.customer_email.slice(0, 255).replace(/[<>]/g, "") : null;
    const specialRequests = body.special_requests ? body.special_requests.slice(0, 500).replace(/[<>]/g, "") : null;

    const { data, error } = await supabase.rpc("reserve_booking", {
      details: {
        customer_name: customerName,
        customer_phone: body.customer_phone,
        customer_email: customerEmail,
        booking_date: body.booking_date,
        booking_time: body.booking_time,
        guests,
        special_requests: specialRequests,
      },
    });

    if (error) {
      // Check for unique constraint violation on slot (if we add one later)
      if (error.code === "P0001") {
        return new Response(JSON.stringify({ error: "Slot fully booked" }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("Booking insert error:", error);
      return new Response(JSON.stringify({ error: "Failed to create booking" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response("Method not allowed", { status: 405, headers: corsHeaders });
});

function validateDateNotPast(dateStr: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const inputDate = new Date(dateStr + "T00:00:00");
  return inputDate >= today;
}