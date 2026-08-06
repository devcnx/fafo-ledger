import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Household timezone — anniversary/birthdays and display clocks use Central. */
export const APP_TIMEZONE = "America/Chicago";

const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** True for plain calendar dates like 2025-06-16 (no time component). */
export function isDateOnly(value: string): boolean {
  return DATE_ONLY_RE.test(value.trim());
}

/**
 * Calendar Y-M-D in America/Chicago for an instant (or pass-through for date-only).
 * Date-only strings are never shifted by UTC midnight.
 */
export function toCentralYmd(value: string | Date): string {
  if (typeof value === "string" && isDateOnly(value)) {
    return value.trim();
  }
  const d = value instanceof Date ? value : new Date(value);
  // en-CA gives YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/**
 * Parse a stored value into a Date for arithmetic.
 * Date-only strings become noon UTC on that calendar day (stable across zones).
 * Full timestamps use the real instant.
 */
export function parseAppDate(value: string | Date): Date {
  if (value instanceof Date) return value;
  const trimmed = value.trim();
  const m = DATE_ONLY_RE.exec(trimmed);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    return new Date(Date.UTC(y, mo - 1, d, 12, 0, 0));
  }
  return new Date(trimmed);
}

/** Display a date (anniversary/birthday/offense day) in Central, no off-by-one. */
export function formatDate(value: string, opts?: Intl.DateTimeFormatOptions) {
  if (isDateOnly(value)) {
    const d = parseAppDate(value);
    return d.toLocaleDateString("en-US", {
      timeZone: "UTC",
      month: "short",
      day: "numeric",
      year: "numeric",
      ...opts,
    });
  }
  return parseAppDate(value).toLocaleDateString("en-US", {
    timeZone: APP_TIMEZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
    ...opts,
  });
}

/** Display date + time in America/Chicago. */
export function formatDateTime(iso: string) {
  const d = parseAppDate(iso);
  const ymd = toCentralYmd(d);
  const today = toCentralYmd(new Date());
  const yestDate = new Date();
  // yesterday in Central: subtract one calendar day from Central today
  const [ty, tm, td] = today.split("-").map(Number);
  const yestUtc = new Date(Date.UTC(ty, tm - 1, td - 1, 12, 0, 0));
  const yesterday = toCentralYmd(yestUtc);

  const time = d.toLocaleTimeString("en-US", {
    timeZone: APP_TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
  });

  if (ymd === today) return `Today · ${time}`;
  if (ymd === yesterday) return `Yesterday · ${time}`;
  return `${formatDate(iso)} · ${time}`;
}

/**
 * Whole calendar days between two values in America/Chicago
 * (e.g. anniversary → today).
 */
export function daysBetween(a: string | Date, b: string | Date = new Date()) {
  const aYmd = toCentralYmd(a);
  const bYmd = toCentralYmd(b);
  const [ay, am, ad] = aYmd.split("-").map(Number);
  const [by, bm, bd] = bYmd.split("-").map(Number);
  const aUtc = Date.UTC(ay, am - 1, ad);
  const bUtc = Date.UTC(by, bm - 1, bd);
  return Math.floor(Math.abs(bUtc - aUtc) / (1000 * 60 * 60 * 24));
}

/** Central calendar weekday 0=Sun … 6=Sat for an instant or date-only string. */
export function centralWeekday(value: string | Date): number {
  if (typeof value === "string" && isDateOnly(value)) {
    const d = parseAppDate(value);
    return d.getUTCDay();
  }
  const d = parseAppDate(value);
  const name = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIMEZONE,
    weekday: "short",
  }).format(d);
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[name] ?? d.getDay();
}

/** datetime-local value string in the browser's local zone (for form controls). */
export function toLocalDatetimeValue(date = new Date()) {
  // Prefer Central wall-clock so forms match household TZ even if the device
  // is set elsewhere (preview sandbox is often UTC).
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  const y = get("year");
  const m = get("month");
  const d = get("day");
  const h = get("hour");
  const min = get("minute");
  return `${y}-${m}-${d}T${h}:${min}`;
}

/**
 * Convert a datetime-local string (interpreted as America/Chicago wall time)
 * into a real UTC ISO instant for storage.
 */
export function centralLocalToIso(localDatetime: string): string {
  // localDatetime: YYYY-MM-DDTHH:mm or YYYY-MM-DDTHH:mm:ss
  const [datePart, timePart = "00:00"] = localDatetime.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const [hh, mm, ss = "0"] = timePart.split(":");
  // Binary search / format-check: build a UTC guess then adjust with Chicago offset
  const utcGuess = Date.UTC(y, m - 1, d, Number(hh), Number(mm), Number(ss));
  const offsetMs = chicagoOffsetMs(new Date(utcGuess));
  return new Date(utcGuess - offsetMs).toISOString();
}

/** Offset of America/Chicago from UTC at a given instant (ms, Chicago = UTC+offset). */
function chicagoOffsetMs(instant: Date): number {
  // Difference between the same "wall clock" formatted in Chicago vs UTC
  const fmt = (tz: string) =>
    new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(instant);
  const asMs = (parts: Intl.DateTimeFormatPart[]) => {
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
    return Date.UTC(
      get("year"),
      get("month") - 1,
      get("day"),
      get("hour"),
      get("minute"),
      get("second"),
    );
  };
  return asMs(fmt(APP_TIMEZONE)) - asMs(fmt("UTC"));
}

/** ISO datetime-local value for editing a stored ISO instant, in Central. */
export function isoToCentralDatetimeLocal(iso: string): string {
  return toLocalDatetimeValue(parseAppDate(iso));
}

export function downloadText(filename: string, content: string, mime = "text/plain") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Today's date YYYY-MM-DD in Central (for export filenames, etc.). */
export function centralTodayYmd(): string {
  return toCentralYmd(new Date());
}
