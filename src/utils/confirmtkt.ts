// Thin client over ConfirmTkt's public (unauthenticated) trains-search API.
// Endpoint reverse-engineered from the rbooking SPA's JS bundles:
//   GET https://cttrainsapi.confirmtkt.com/api/v1/trains/search
//       ?sourceStationCode=NDLS&destinationStationCode=BPL&dateOfJourney=DD-MM-YYYY
// No API key or auth required.

import type {
  ClassAvailability,
  SearchResult,
  Station,
  Train,
} from "../types.js";

const API_HOST = "https://cttrainsapi.confirmtkt.com";

// A real browser UA avoids the occasional bot heuristic on this host.
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// Static public constants the ConfirmTkt web frontend sends on every API call.
// apikey is literally `${clientid}!2$` baked into their JS bundle — not a per-user secret.
// deviceid can be any UUID. Verified via Chrome DevTools against the live site.
const API_HEADERS: Record<string, string> = {
  "User-Agent": UA,
  Accept: "application/json",
  clientid: "ct-web",
  apikey: "ct-web!2$",
  deviceid: "ct-mcp-0000-0000-0000-000000000000",
};

/** Convert an ISO date (YYYY-MM-DD) or DD-MM-YYYY to the API's DD-MM-YYYY format. */
export function normalizeDate(input: string): string {
  const trimmed = input.trim();
  // DD-MM-YYYY already
  if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) return trimmed;
  // YYYY-MM-DD -> DD-MM-YYYY
  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return `${iso[3]}-${iso[2]}-${iso[1]}`;
  // DD/MM/YYYY -> DD-MM-YYYY
  const slash = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (slash) return `${slash[1]}-${slash[2]}-${slash[3]}`;
  throw new Error(
    `Invalid date "${input}". Use DD-MM-YYYY (e.g. 28-06-2026) or YYYY-MM-DD.`,
  );
}

function formatDuration(mins: string | number): string {
  const m = typeof mins === "string" ? parseInt(mins, 10) : mins;
  if (!Number.isFinite(m)) return String(mins);
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function parseAvailability(cache: Record<string, any> | null | undefined): ClassAvailability[] {
  if (!cache) return [];
  const out: ClassAvailability[] = [];
  for (const [cls, info] of Object.entries(cache)) {
    if (!info || typeof info !== "object") continue;
    const raw: string = info.availability ?? "";
    const display: string = info.availabilityDisplayName ?? raw;
    const seatMatch = raw.match(/AVAILABLE-(\d+)/);
    out.push({
      travelClass: cls,
      status: display,
      seats: seatMatch ? parseInt(seatMatch[1], 10) : null,
      fare: info.fare != null && info.fare !== "" ? Number(info.fare) : null,
      confirmStatus: info.confirmTktStatus ?? null,
      confirmChance: info.predictionPercentage ?? null,
      quota: info.quota ?? null,
    });
  }
  // Sort by a sensible class order
  const order = ["1A", "2A", "3A", "3E", "CC", "EC", "SL", "2S"];
  out.sort((a, b) => {
    const ia = order.indexOf(a.travelClass);
    const ib = order.indexOf(b.travelClass);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
  return out;
}

async function apiGet(path: string): Promise<any> {
  const res = await fetch(`${API_HOST}${path}`, { headers: API_HEADERS });
  const text = await res.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`ConfirmTkt returned non-JSON (status ${res.status}): ${text.slice(0, 200)}`);
  }
  if (json.error) {
    const e = json.error;
    throw new Error(`ConfirmTkt API error ${e.code ?? ""}: ${e.message ?? JSON.stringify(e)}`);
  }
  return json;
}

/**
 * Search trains between two station codes on a date.
 * sourceCode / destCode must be IRCTC station codes (e.g. NDLS, BPL).
 * date must be DD-MM-YYYY.
 */
export async function searchTrains(
  sourceCode: string,
  destCode: string,
  date: string,
): Promise<SearchResult> {
  const path =
    `/api/v1/trains/search?sourceStationCode=${encodeURIComponent(sourceCode)}` +
    `&destinationStationCode=${encodeURIComponent(destCode)}` +
    `&dateOfJourney=${encodeURIComponent(date)}`;
  const json = await apiGet(path);
  const data = json.data ?? {};
  const list: any[] = data.trainList ?? [];

  const trains: Train[] = list.map((t) => ({
    trainNumber: t.trainNumber,
    trainName: t.trainName,
    fromStnCode: t.fromStnCode,
    fromStnName: t.fromStnName,
    toStnCode: t.toStnCode,
    toStnName: t.toStnName,
    departureTime: t.departureTime,
    arrivalTime: t.arrivalTime,
    duration: String(t.duration),
    durationFormatted: formatDuration(t.duration),
    distance: t.distance ?? null,
    runningDays: t.runningDays ?? null,
    hasPantry: !!t.hasPantry,
    trainType: t.trainType ?? null,
    trainRating: t.trainRating ?? null,
    availability: parseAvailability(t.availabilityCache),
  }));

  return {
    source: sourceCode,
    destination: destCode,
    date,
    trainCount: trains.length,
    trains,
  };
}

/**
 * Live station name/code autocomplete via ConfirmTkt's auto-suggestion endpoint.
 * Returns matching stations (code, name, city, state) for any query — full Indian
 * Railways coverage, fuzzy names, codes, partial words. Verified working in Chrome DevTools.
 */
export async function lookupStations(query: string): Promise<Station[]> {
  const path =
    `/api/v2/trains/stations/auto-suggestion?searchString=${encodeURIComponent(query.trim())}` +
    `&sourceStnCode=&popularStnListLimit=15&preferredStnListLimit=6&channel=mwebd&language=EN`;
  const json = await apiGet(path);
  const list: any[] = json.data?.stationList ?? [];
  return list.map((s) => ({
    stationCode: s.stationCode,
    stationName: s.stationName,
    city: s.city ?? null,
    state: s.state ?? null,
    isMajor: !!s.majorStn,
  }));
}

/**
 * Resolve a user-supplied origin/destination (code or name) to a single station code.
 * If it already looks like a code (2-5 letters) it's used as-is; otherwise we query the
 * live endpoint and take the best match (prefers a major station / exact-ish name).
 */
export async function resolveStationCode(input: string): Promise<string> {
  const trimmed = input.trim();
  // Already a plausible station code? Use as-is (avoids a network round-trip).
  if (/^[A-Za-z]{2,5}$/.test(trimmed)) return trimmed.toUpperCase();

  const matches = await lookupStations(trimmed);
  if (matches.length === 0) {
    throw new Error(`No station found matching "${input}". Try a more specific name or the station code.`);
  }
  // Prefer a major station, else first result.
  const best = matches.find((m) => m.isMajor) ?? matches[0];
  return best.stationCode;
}
