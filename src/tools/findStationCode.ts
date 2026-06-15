import { lookupStations } from "../utils/confirmtkt.js";

type Args = { name: string };

export async function handler({ name }: Args) {
  const matches = await lookupStations(name);
  const best = matches.find((m) => m.isMajor) ?? matches[0];
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            query: name,
            resolved: best?.stationCode ?? null,
            matchCount: matches.length,
            suggestions: matches.slice(0, 10),
          },
          null,
          2,
        ),
      },
    ],
  };
}
