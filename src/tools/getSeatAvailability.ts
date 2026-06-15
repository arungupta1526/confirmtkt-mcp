import { searchTrains, normalizeDate, resolveStationCode } from "../utils/confirmtkt.js";

type Args = {
  trainNumber: string;
  origin: string;
  destination: string;
  date: string;
};

export async function handler({ trainNumber, origin, destination, date }: Args) {
  const [src, dst] = await Promise.all([
    resolveStationCode(origin),
    resolveStationCode(destination),
  ]);
  const doj = normalizeDate(date);
  const result = await searchTrains(src, dst, doj);
  const train = result.trains.find((t) => t.trainNumber === trainNumber.trim());
  if (!train) {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              error: `Train ${trainNumber} not found on ${src}->${dst} for ${doj}.`,
              availableTrains: result.trains.map((t) => `${t.trainNumber} ${t.trainName}`),
            },
            null,
            2,
          ),
        },
      ],
    };
  }
  return { content: [{ type: "text" as const, text: JSON.stringify(train, null, 2) }] };
}
