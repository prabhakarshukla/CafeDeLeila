import { cors, readJson, visitorKey } from "../_shared/http.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";


const ALLOWED_CV_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const MAX_CV_SIZE = 2 * 1024 * 1024; // 2 MB

const rateLimitMap = new Map<string, { count: number; windowStart: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now - entry.windowStart > 60_000) {
    rateLimitMap.set(ip, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= 10) { // Stricter for applications
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

function validateCvFile(contentType: string, size: number): { valid: boolean; error?: string } {
  if (!ALLOWED_CV_TYPES.includes(contentType)) {
    return { valid: false, error: "Invalid file type. Allowed: PDF, DOC, DOCX" };
  }
  if (!Number.isInteger(size) || size < 1 || size > MAX_CV_SIZE) {
    return { valid: false, error: "File size exceeds 2 MB limit" };
  }
  return { valid: true };
}

serve(async (req) => {
  const corsHeaders = Object.fromEntries(cors(req, "POST"));
  if (req.headers.has("origin") && !corsHeaders["access-control-allow-origin"]) return new Response(null, {status: 403, headers: corsHeaders});
  if (req.method === "OPTIONS") return new Response(null, {status: 204, headers: corsHeaders});
  if (req.method !== "POST") return new Response(null, {status: 405, headers: corsHeaders});
  // Rate limiting (stricter for applications)
  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );


  const limit = await supabase.rpc("allow_submission", {endpoint: "applications", visitor: await visitorKey(req)});
  if (limit.error || !limit.data) return new Response(JSON.stringify({error: "Try again shortly"}), {status: limit.error ? 503 : 429, headers: corsHeaders});
  // Get signed upload URL for CV
  if (req.method === "POST" && new URL(req.url).pathname.endsWith("/get-upload-url")) {
    let body: any;
    try {
      body = await readJson(req);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { fileName, contentType, fileSize } = body;
    if (typeof fileName !== "string" || fileName.length > 160 || !/\.(pdf|docx?)$/i.test(fileName) || !contentType || typeof fileSize !== "number") {
      return new Response(JSON.stringify({ error: "Missing fileName, contentType, or fileSize" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cvValidation = validateCvFile(contentType, fileSize);
    if (!cvValidation.valid) {
      return new Response(JSON.stringify({ error: cvValidation.error }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const path = `cvs/${crypto.randomUUID()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { data, error } = await supabase.storage
      .from('cv-uploads')
      .createSignedUploadUrl(path);

    if (error) return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

    return new Response(JSON.stringify({ signedUrl: data.signedUrl, path }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

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
    if (!body.full_name || !body.email || !body.phone || !body.role) {
      return new Response(JSON.stringify({ error: "Missing required fields: full_name, email, phone, role" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate phone
    if (!/^91[6-9]\d{9}$/.test(body.phone)) {
      return new Response(JSON.stringify({ error: "Invalid phone number. Must be 12-digit Indian number starting with 91" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return new Response(JSON.stringify({ error: "Invalid email address" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Sanitize text fields
    const fullName = body.full_name.slice(0, 100).replace(/[<>]/g, "");
    const email = body.email.slice(0, 255).replace(/[<>]/g, "");
    const phone = body.phone;
    const role = body.role.slice(0, 100).replace(/[<>]/g, "");
    const address = body.address ? body.address.slice(0, 500).replace(/[<>]/g, "") : null;
    const cvPath = body.cv_path ? body.cv_path.slice(0, 500).replace(/[<>]/g, "") : null;

    if (!cvPath || !/^cvs\/[0-9a-f-]{36}-[\w.-]+$/i.test(cvPath)) {
      return new Response(JSON.stringify({error:"A valid CV upload is required"}), {status:400, headers:corsHeaders});
    }
    const cv = await supabase.storage.from("cv-uploads").info(cvPath);
    if (cv.error) return new Response(JSON.stringify({error:"Upload a CV first"}), {status:400, headers:corsHeaders});
    // Insert application (trigger will generate application_number)
    const { data, error } = await supabase
      .from("job_applications")
      .insert({
        full_name: fullName,
        email: email,
        phone: phone,
        role: role,
        cv_url: cvPath,
        address: address,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      console.error("Application insert error:", error);
      return new Response(JSON.stringify({ error: "Failed to create application" }), {
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
