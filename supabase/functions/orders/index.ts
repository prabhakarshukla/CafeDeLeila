import {createClient} from "https://esm.sh/@supabase/supabase-js@2";
import {fieldError, isObject, rateLimiter, requestHandler} from "../_shared/http.ts";

type MenuItem = {id: string; name: string; price_inr: number; veg: boolean; is_available: boolean};
type Setting = {enabled?: boolean; amount?: number; value?: number};

const allowRequest = rateLimiter(30);
const clean = (value: string) => value.replace(/[<>]/g, "").trim();

Deno.serve(requestHandler("POST", async (req, body, respond) => {
  if (!allowRequest(req)) return respond(429, {error: "Too many requests. Please slow down."});
  const {customer_name, customer_phone, customer_email, notes, items, delivery_address} = body;
  const customerName = typeof customer_name === "string" ? clean(customer_name) : "";
  const nameLength = [...customerName].length;
  if (nameLength < 2 || nameLength > 80) {
    return respond(400, fieldError("customer_name", "Use 2–80 characters for the name."));
  }
  if (typeof customer_phone !== "string" || !/^91[6-9]\d{9}$/.test(customer_phone)) {
    return respond(400, fieldError("customer_phone", "Enter an Indian mobile number starting with 91."));
  }
  if (customer_email != null && (typeof customer_email !== "string" || customer_email.length > 254 ||
      !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(customer_email))) {
    return respond(400, fieldError("customer_email", "Enter a valid email address."));
  }
  const orderType = body.order_type === undefined ? "dine_in" : body.order_type;
  if (orderType !== "dine_in" && orderType !== "takeaway" && orderType !== "delivery") {
    return respond(400, fieldError("order_type", "Choose dine_in, takeaway, or delivery."));
  }
  const address = isObject(delivery_address) && typeof delivery_address.full === "string" ? clean(delivery_address.full) : "";
  if (orderType === "delivery" && (!address || address.length > 500)) {
    return respond(400, fieldError("delivery_address.full", "Enter a delivery address of at most 500 characters."));
  }
  if (notes != null && (typeof notes !== "string" || notes.length > 500)) {
    return respond(400, fieldError("notes", "Use text of at most 500 characters."));
  }
  if (!Array.isArray(items) || !items.length || items.length > 50) {
    return respond(400, fieldError("items", "Choose 1–50 menu items."));
  }
  const requested: {id: string; quantity: number}[] = [];
  const ids = new Set<string>();
  for (const [index, item] of items.entries()) {
    if (!isObject(item) || typeof item.id !== "string" || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(item.id)) {
      return respond(400, fieldError(`items.${index}.id`, "Choose a valid menu item."));
    }
    if (typeof item.quantity !== "number" || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 50) {
      return respond(400, fieldError(`items.${index}.quantity`, "Use a whole number from 1 to 50."));
    }
    const id = item.id.toLowerCase();
    if (ids.has(id)) return respond(400, fieldError(`items.${index}.id`, "Each menu item may appear only once."));
    ids.add(id);
    requested.push({id, quantity: item.quantity});
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const {data: menuItems, error: menuError} = await supabase.from("menu_items")
    .select("id, name, price_inr, veg, is_available, category:menu_categories!inner(is_active)")
    .eq("category.is_active", true).in("id", [...ids]);
  if (menuError || !menuItems) throw new Error("Catalog unavailable");
  const menu = new Map(menuItems.map((item): [string, MenuItem] => [item.id, item]));

  let subtotal = 0;
  const validatedItems = [];
  for (const [index, item] of requested.entries()) {
    const entry = menu.get(item.id);
    if (!entry?.is_available) return respond(400, fieldError(`items.${index}.id`, "This item is unavailable."));
    subtotal += entry.price_inr * item.quantity;
    validatedItems.push({id: entry.id, name: entry.name, price_inr: entry.price_inr, quantity: item.quantity, veg: entry.veg});
  }

  const {data: settings, error: settingsError} = await supabase.from("settings").select("key,value")
    .in("key", ["ordering_enabled", "delivery_enabled", "delivery_fee", "min_order", "tax_percent"]);
  if (settingsError || !settings) throw new Error("Ordering settings unavailable");
  const settingsMap = new Map(settings.map((row): [string, Setting] => [row.key, row.value]));
  if (settingsMap.get("ordering_enabled")?.enabled !== true) return respond(403, {error: "Ordering is currently disabled"});
  const delivery = orderType === "delivery";
  if (delivery && settingsMap.get("delivery_enabled")?.enabled !== true) return respond(403, {error: "Delivery is currently unavailable"});
  const deliveryFee = delivery ? (settingsMap.get("delivery_fee")?.amount ?? 0) : 0;
  const minOrder = settingsMap.get("min_order")?.amount ?? 0;
  if (delivery && subtotal < minOrder) return respond(400, fieldError("items", `Minimum order for delivery is ₹${minOrder}.`));
  const tax = Math.round(subtotal * ((settingsMap.get("tax_percent")?.value ?? 0) / 100));

  const {data, error} = await supabase.from("orders").insert({
    customer_name: customerName, customer_phone, customer_email: customer_email ?? null,
    order_type: orderType, delivery_address: delivery ? {full: address} : null, items: validatedItems,
    subtotal_inr: subtotal, delivery_fee_inr: deliveryFee, tax_inr: tax, total_inr: subtotal + deliveryFee + tax,
    notes: notes ? clean(notes) : null, payment_status: "unpaid", status: "pending",
  }).select().single();
  if (error) throw new Error("Order insert failed");
  return respond(200, data);
}));
