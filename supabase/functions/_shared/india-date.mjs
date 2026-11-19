const indiaZone = 'Asia/Kolkata';
const calendar = new Intl.DateTimeFormat('en-CA', {
  timeZone: indiaZone, year: 'numeric', month: '2-digit', day: '2-digit',
});
export const indiaDate = (date = new Date()) => calendar.format(date);
export const indiaDateTime = (value, time = '00:00') => new Date(value + 'T' + time + ':00+05:30');

export function isCalendarDate(value) {
  if (typeof value !== 'string' || !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(value)) return false;
  const date = indiaDateTime(value);
  return !Number.isNaN(date.getTime()) && indiaDate(date) === value;
}

export function addCalendarDays(value, days) {
  const date = indiaDateTime(value);
  date.setUTCDate(date.getUTCDate() + days);
  return indiaDate(date);
}

export function formatIndiaDate(value, options = {day: 'numeric', month: 'long', year: 'numeric'}) {
  const date = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? indiaDateTime(value) : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-IN', {...options, timeZone: indiaZone}).format(date);
}
