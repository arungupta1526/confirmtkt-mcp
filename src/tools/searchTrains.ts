import { searchTrains, normalizeDate, resolveStationCode } from "../utils/confirmtkt.js";
import type { Train } from "../types.js";

type Args = {
  origin: string;
  destination: string;
  date: string;
  travelClass?: string;
  availableOnly?: boolean;
};

export async function handler({ origin, destination, date, travelClass, availableOnly }: Args) {
  const [src, dst] = await Promise.all([
    resolveStationCode(origin),
    resolveStationCode(destination),
  ]);
  const doj = normalizeDate(date);
  const result = await searchTrains(src, dst, doj);

  let trains: Train[] = result.trains;
  const cls = travelClass?.trim().toUpperCase();

  if (cls) {
    trains = trains
      .map((t) => ({ ...t, availability: t.availability.filter((a) => a.travelClass === cls) }))
      .filter((t) => t.availability.length > 0);
  }
  if (availableOnly) {
    trains = trains.filter((t) => t.availability.some((a) => (a.seats ?? 0) > 0));
  }

  const payload = {
    source: result.source,
    destination: result.destination,
    date: result.date,
    filters: { travelClass: cls ?? null, availableOnly: !!availableOnly },
    trainCount: trains.length,
    trains,
  };
  return { content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }] };
}
