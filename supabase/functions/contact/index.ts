import {createClient} from "https://esm.sh/@supabase/supabase-js@2.49.4";
import {cors, readJson, visitorKey} from "../_shared/http.ts";

Deno.serve(async req => {
  const headers = cors(req, "POST");
  const respond = (status: number, data: object) => new Response(JSON.stringify(data), {status, headers});
  if (req.headers.has("origin") && !headers.has("Access-Control-Allow-Origin")) return respond(403, {error: "Origin not allowed"});
  if (req.method === "OPTIONS") return new Response(null, {status: 204, headers});
  if (req.method !== "POST") return respond(405, {error: "Method not allowed"});
  const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const {data, error} = await client.rpc("allow_submission", {endpoint: "contact", visitor: await visitorKey(req)});
  if (error || !data) return respond(error ? 503 : 429, {error: "Try again shortly"});
  try {
    const body = await readJson(req);
    const valid = (value: unknown, max: number) => typeof value === "string" && value.trim() && value.length <= max;
    if (!valid(body.name, 100) || !valid(body.email, 254) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)
        || !valid(body.message, 2000) || !valid(body.subject, 120)
        || (body.phone && !/^[6-9]\d{9}$/.test(body.phone))) return respond(400, {error: "Check the contact fields"});
    const insert = await client.from("contact_messages").insert({
      name: body.name.trim(), email: body.email.trim(), phone: body.phone || null,
      subject: body.subject.trim(), message: body.message.trim(),
    });
    return insert.error ? respond(503, {error: "Message could not be saved"}) : respond(201, {received: true});
  } catch {
    return respond(400, {error: "Invalid request"});
  }
});
