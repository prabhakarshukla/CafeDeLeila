import {addCalendarDays, indiaDate, indiaDateTime, isCalendarDate} from './india-date.mjs';

// Sample schedule. Update this list when the café confirms its booking slots.
export const bookingRules = {
  timeSlots: [
    '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30',
    '19:00', '19:30', '20:00', '20:30', '21:00',
  ],
  maxGuests: 20,
  minAdvanceMinutes: 30,
  maxAdvanceDays: 60,
};

export function bookingDateAllowed(value, now = new Date()) {
  const today = indiaDate(now);
  return isCalendarDate(value) && value >= today && value <= addCalendarDays(today, bookingRules.maxAdvanceDays);
}

export function bookingSlotAvailable(date, time, now = new Date()) {
  return bookingDateAllowed(date, now) && bookingRules.timeSlots.includes(time) &&
    indiaDateTime(date, time).getTime() >= now.getTime() + bookingRules.minAdvanceMinutes * 60_000;
}
