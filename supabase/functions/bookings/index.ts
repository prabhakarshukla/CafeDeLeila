import {createClient} from "https://esm.sh/@supabase/supabase-js@2";
import {bookingDateAllowed, bookingRules, bookingSlotAvailable} from "../_shared/booking-rules.mjs";
import {fieldError, rateLimiter, requestHandler} from "../_shared/http.ts";

const allowRequest = rateLimiter(30);
const clean = (value: string) => value.replace(/[<>]/g, "").trim();

Deno.serve(requestHandler("POST", async (req, body, respond) => {
  if (!allowRequest(req)) return respond(429, {error: "Too many requests. Please slow down."});
  const {customer_name, customer_phone, customer_email, booking_date, booking_time, guests, special_requests} = body;
  if (typeof customer_name !== "string" || !clean(customer_name)) return respond(400, fieldError("customer_name", "Enter a name."));
  if (typeof customer_phone !== "string" || !/^91[6-9]\d{9}$/.test(customer_phone)) {
    return respond(400, fieldError("customer_phone", "Enter an Indian mobile number starting with 91."));
  }
  if (customer_email != null && (typeof customer_email !== "string" || customer_email.length > 254 ||
      !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(customer_email))) {
    return respond(400, fieldError("customer_email", "Enter a valid email address."));
  }
  const now = new Date();
  if (typeof booking_date !== "string" || !bookingDateAllowed(booking_date, now)) {
    return respond(400, fieldError("booking_date", `Choose a valid date within ${bookingRules.maxAdvanceDays} days.`));
  }
  if (typeof booking_time !== "string" || !bookingRules.timeSlots.includes(booking_time)) {
    return respond(400, fieldError("booking_time", "Choose a listed time slot."));
  }
  if (!bookingSlotAvailable(booking_date, booking_time, now)) {
    return respond(400, fieldError("booking_time", `Book at least ${bookingRules.minAdvanceMinutes} minutes in advance.`));
  }
  if (typeof guests !== "number" || !Number.isInteger(guests) || guests < 1 || guests > bookingRules.maxGuests) {
    return respond(400, fieldError("guests", `Use a whole number from 1 to ${bookingRules.maxGuests}.`));
  }
  if (special_requests != null && (typeof special_requests !== "string" || special_requests.length > 500)) {
    return respond(400, fieldError("special_requests", "Use at most 500 characters."));
  }
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const {data, error} = await supabase.rpc("reserve_booking", {
    details: {
      customer_name: clean(customer_name).slice(0, 100), customer_phone, customer_email: customer_email ?? null,
      booking_date, booking_time, guests, special_requests: special_requests ? clean(special_requests) : null,
    },
  });
  if (error?.code === "P0001" && error.message === "Slot fully booked") return respond(409, {error: "Slot fully booked"});
  if (error?.code === "P0001" && error.message === "Choose a future time") {
    return respond(400, fieldError("booking_time", "Choose a future time."));
  }
  if (error) throw new Error("Booking insert failed");
  return respond(200, data);
}));
