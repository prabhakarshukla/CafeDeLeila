import {createClient} from "https://esm.sh/@supabase/supabase-js@2.49.4";
import {fieldError, requestHandler, visitorKey} from "../_shared/http.ts";

Deno.serve(requestHandler("POST", async (req, body, respond) => {
  const {name, email, message, subject, phone} = body;
  const valid = (value: unknown, max: number): value is string =>
    typeof value === "string" && !!value.trim() && value.length <= max;
  if (!valid(name, 100)) return respond(400, fieldError("name", "Use 1–100 characters."));
  if (!valid(email, 254) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return respond(400, fieldError("email", "Enter a valid email address."));
  if (!valid(subject, 120)) return respond(400, fieldError("subject", "Use 1–120 characters."));
  if (!valid(message, 2000)) return respond(400, fieldError("message", "Use 1–2000 characters."));
  if (phone != null && phone !== "" && (typeof phone !== "string" || !/^[6-9]\d{9}$/.test(phone))) {
    return respond(400, fieldError("phone", "Enter a 10-digit Indian mobile number."));
  }
  const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const {data, error} = await client.rpc("allow_submission", {endpoint: "contact", visitor: await visitorKey(req)});
  if (error) throw new Error("Submission limiter unavailable");
  if (!data) return respond(429, {error: "Try again shortly"});
  const insert = await client.from("contact_messages").insert({
    name: name.trim(), email: email.trim(), phone: phone || null,
    subject: subject.trim(), message: message.trim(),
  });
  if (insert.error) throw new Error("Contact insert failed");
  return respond(201, {received: true});
}));
