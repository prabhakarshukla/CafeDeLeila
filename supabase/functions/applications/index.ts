import {createClient} from "https://esm.sh/@supabase/supabase-js@2";
import {fieldError, requestHandler, visitorKey} from "../_shared/http.ts";

const cvTypes = new Map([
  ["pdf", "application/pdf"],
  ["doc", "application/msword"],
  ["docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
]);
const clean = (value: string) => value.replace(/[<>]/g, "").trim();

Deno.serve(requestHandler("POST", async (req, body, respond) => {
  const upload = new URL(req.url).pathname.endsWith("/get-upload-url");
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const rateLimit = async () => {
    const limit = await supabase.rpc("allow_submission", {endpoint: "applications", visitor: await visitorKey(req)});
    if (limit.error) throw new Error("Submission limiter unavailable");
    return limit.data;
  };

  if (upload) {
    const {fileName, contentType, fileSize} = body;
    const extension = typeof fileName === "string" ? /\.(pdf|docx?)$/i.exec(fileName)?.[1].toLowerCase() : undefined;
    if (typeof fileName !== "string" || fileName.length > 160 || !extension) {
      return respond(400, fieldError("fileName", "Choose a PDF, DOC, or DOCX with a filename of at most 160 characters."));
    }
    if (contentType !== cvTypes.get(extension)) return respond(400, fieldError("contentType", "File type must match its extension."));
    if (typeof fileSize !== "number" || !Number.isInteger(fileSize) || fileSize < 1 || fileSize > 2 * 1024 * 1024) {
      return respond(400, fieldError("fileSize", "Choose a non-empty file of at most 2 MB."));
    }
    if (!await rateLimit()) return respond(429, {error: "Try again shortly"});
    const path = `cvs/${crypto.randomUUID()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const {data, error} = await supabase.storage.from("cv-uploads").createSignedUploadUrl(path);
    if (error || !data) throw new Error("CV signing failed");
    return respond(200, {signedUrl: data.signedUrl, path});
  }

  const {full_name, email, phone, role, address, cv_path} = body;
  if (typeof full_name !== "string" || !clean(full_name) || clean(full_name).length > 100) {
    return respond(400, fieldError("full_name", "Use 1–100 characters."));
  }
  if (typeof email !== "string" || email.length > 254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) {
    return respond(400, fieldError("email", "Enter a valid email address."));
  }
  if (typeof phone !== "string" || !/^91[6-9]\d{9}$/.test(phone)) return respond(400, fieldError("phone", "Enter an Indian mobile number starting with 91."));
  if (typeof role !== "string" || !clean(role) || clean(role).length > 100) return respond(400, fieldError("role", "Use 1–100 characters."));
  if (address != null && (typeof address !== "string" || address.length > 500)) return respond(400, fieldError("address", "Use at most 500 characters."));
  if (typeof cv_path !== "string" || !/^cvs\/[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}-[\w.-]{1,160}$/i.test(cv_path)) {
    return respond(400, fieldError("cv_path", "Upload a valid CV first."));
  }
  if (!await rateLimit()) return respond(429, {error: "Try again shortly"});
  const cv = await supabase.storage.from("cv-uploads").info(cv_path);
  if (cv.error) {
    const status = "status" in cv.error ? Number(cv.error.status) : 0;
    if (status === 400 || status === 404) return respond(400, fieldError("cv_path", "Upload a valid CV first."));
    throw new Error("CV lookup failed");
  }
  const {data, error} = await supabase.from("job_applications").insert({
    full_name: clean(full_name), email, phone, role: clean(role),
    cv_url: cv_path, address: address ? clean(address) : null, status: "pending",
  }).select().single();
  if (error) throw new Error("Application insert failed");
  return respond(200, data);
}));
