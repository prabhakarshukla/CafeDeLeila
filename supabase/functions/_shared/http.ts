type JsonObject = Record<string, unknown>;
type Reply = (status: number, data: unknown) => Response;

export function isObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function fieldError(field: string, message: string) {
  return {code: "invalid_fields", error: message, fields: {[field]: message}};
}

class RequestError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message);
  }
}

async function readJson(req: Request): Promise<JsonObject> {
  const limit = 64 * 1024;
  const tooLarge = () => new RequestError(413, "body_too_large", "Request body is too large.");
  if (Number(req.headers.get("content-length")) > limit) throw tooLarge();
  const invalid = () => new RequestError(400, "invalid_json", "Send a valid JSON object.");
  const reader = req.body?.getReader();
  if (!reader) throw invalid();
  const decoder = new TextDecoder("utf-8", {fatal: true});
  let bytes = 0;
  let text = "";
  let value: unknown;
  try {
    while (true) {
      const {done, value: chunk} = await reader.read();
      if (done) break;
      bytes += chunk.byteLength;
      if (bytes > limit) {
        void reader.cancel().catch(() => {});
        throw tooLarge();
      }
      text += decoder.decode(chunk, {stream: true});
    }
    value = JSON.parse(text + decoder.decode());
  } catch (error) {
    if (error instanceof RequestError) throw error;
    if (error instanceof SyntaxError || error instanceof TypeError) throw invalid();
    throw error;
  } finally {
    reader.releaseLock();
  }
  if (!isObject(value)) throw invalid();
  return value;
}

export function requestHandler(
  method: "GET" | "POST",
  handle: (req: Request, body: JsonObject, reply: Reply) => Response | Promise<Response>,
) {
  return async (req: Request) => {
    const headers = new Headers({
      "Content-Type": "application/json",
      "Vary": "Origin",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      "Access-Control-Allow-Methods": method + ", OPTIONS",
    });
    const respond: Reply = (status, data) => Response.json(data, {status, headers});
    try {
      const origin = req.headers.get("origin");
      const allowed = (Deno.env.get("ALLOWED_ORIGINS") ?? "").split(",").map(value => value.trim());
      if (origin && !allowed.includes(origin)) return respond(403, {error: "Origin not allowed"});
      if (origin) headers.set("Access-Control-Allow-Origin", origin);
      if (req.method === "OPTIONS") return new Response(null, {status: 204, headers});
      if (req.method !== method) {
        headers.set("Allow", method + ", OPTIONS");
        return respond(405, {error: "Method not allowed"});
      }
      return await handle(req, method === "POST" ? await readJson(req) : {}, respond);
    } catch (error) {
      if (error instanceof RequestError) return respond(error.status, {code: error.code, error: error.message});
      const requestId = crypto.randomUUID();
      console.error("Edge request failed", requestId);
      return respond(500, {code: "internal_error", error: "Something went wrong. Please try again.", request_id: requestId});
    }
  };
}

export function rateLimiter(max: number) {
  const visitors = new Map<string, {count: number; expires: number}>();
  let sweepAt = 0;
  return (req: Request) => {
    const ip = req.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() || "unknown";
    const now = Date.now();
    if (now >= sweepAt) {
      for (const [key, entry] of visitors) {
        if (entry.expires <= now) visitors.delete(key);
      }
      sweepAt = now + 60_000;
    }
    const entry = visitors.get(ip);
    if (!entry || entry.expires <= now) {
      visitors.set(ip, {count: 1, expires: now + 60_000});
      return true;
    }
    return ++entry.count <= max;
  };
}

export async function visitorKey(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() || "unknown";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}
