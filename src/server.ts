#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { handler as searchTrainsHandler } from "./tools/searchTrains.js";
import { handler as getSeatAvailabilityHandler } from "./tools/getSeatAvailability.js";
import { handler as findStationCodeHandler } from "./tools/findStationCode.js";

const server = new McpServer(
  { name: "confirmtkt-trains", version: "0.1.0" },
  {
    instructions:
      "Search Indian Railways trains and live seat availability between any two stations on a date. " +
      "Origin/destination accept either an IRCTC station code (e.g. NDLS) or a common city name (e.g. 'New Delhi'). " +
      "Dates accept DD-MM-YYYY or YYYY-MM-DD. " +
      "Use search_trains for the full list; find_station_code to resolve a city name to its code.",
  },
);

// Tool definitions: name, description, input schema, and annotations live here;
// the matching handler implementation lives in each ./tools/* module.

server.registerTool(
  "search_trains",
  {
    description:
      "List all trains between an origin and destination on a given date, with live per-class " +
      "seat availability (SL/3A/3E/2A/1A/CC/EC/2S), fares, timings, duration, and confirmation chance. " +
      "Origin/destination accept a station code (NDLS) or city name (New Delhi). Date: DD-MM-YYYY or YYYY-MM-DD.",
    inputSchema: {
      origin: z.string().describe("Origin station code or city name, e.g. 'NDLS' or 'New Delhi'"),
      destination: z.string().describe("Destination station code or city name, e.g. 'BPL' or 'Bhopal'"),
      date: z.string().describe("Journey date, DD-MM-YYYY (e.g. 28-06-2026) or YYYY-MM-DD"),
      travelClass: z
        .string()
        .optional()
        .describe("Optional filter to one class: SL, 3A, 3E, 2A, 1A, CC, EC, or 2S"),
      availableOnly: z
        .boolean()
        .optional()
        .describe("If true, only return trains with at least one AVAILABLE seat (in the filtered class if given)"),
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  searchTrainsHandler,
);

server.registerTool(
  "get_seat_availability",
  {
    description:
      "Get live seat availability for one specific train between an origin and destination on a date. " +
      "Returns per-class status (AVL/WL/RAC/Regret), numeric seat count, fare, and confirmation chance.",
    inputSchema: {
      trainNumber: z.string().describe("5-digit train number, e.g. '12002'"),
      origin: z.string().describe("Origin station code or city name"),
      destination: z.string().describe("Destination station code or city name"),
      date: z.string().describe("Journey date, DD-MM-YYYY or YYYY-MM-DD"),
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  getSeatAvailabilityHandler,
);

server.registerTool(
  "find_station_code",
  {
    description:
      "Resolve a city/station name to its IRCTC station code (e.g. 'Bhopal' -> 'BPL') via live " +
      "autocomplete. Use this when unsure of the code before calling search_trains.",
    inputSchema: {
      name: z.string().describe("City or station name, e.g. 'New Delhi'"),
    },
    annotations: { readOnlyHint: true },
  },
  findStationCodeHandler,
);

const transport = new StdioServerTransport();
await server.connect(transport);
// stdio servers must not write to stdout (it's the protocol channel); log to stderr.
console.error("confirmtkt-trains MCP server running on stdio");
