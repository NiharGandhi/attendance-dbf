export function nowIso() {
  return new Date().toISOString();
}

export function getWindowStart(date = new Date(), minutes = 5) {
  const ms = minutes * 60 * 1000;
  const start = Math.floor(date.getTime() / ms) * ms;
  return new Date(start);
}

export function getWindowEnd(windowStart, minutes = 5) {
  return new Date(windowStart.getTime() + minutes * 60 * 1000);
}
