<div align="center">

<h1>ConfirmTkt Unofficial MCP Server</h1>

<p>
  <strong>Indian Railways train search &amp; live seat availability — as an MCP server for Claude.</strong><br/>
  For any origin / destination / date. No API key, no login, no CAPTCHA.
</p>

<p>
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img alt="Node.js" src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white" />
  <img alt="Model Context Protocol" src="https://img.shields.io/badge/MCP-000000?style=for-the-badge&logo=anthropic&logoColor=white" />
  <img alt="Zod" src="https://img.shields.io/badge/Zod-3E67B1?style=for-the-badge&logo=zod&logoColor=white" />
</p>

<p>
  <img alt="status" src="https://img.shields.io/badge/status-connected-success?style=flat-square" />
  <img alt="transport" src="https://img.shields.io/badge/transport-stdio-blue?style=flat-square" />
  <img alt="auth" src="https://img.shields.io/badge/auth-none-lightgrey?style=flat-square" />
  <img alt="tools" src="https://img.shields.io/badge/tools-3-orange?style=flat-square" />
</p>

</div>

---

Data comes from ConfirmTkt's public (unauthenticated) trains-search API — no key, no login,
no CAPTCHA. The endpoint was reverse-engineered.

## Sample query & output

**Ask Claude:** *"Find trains from New Delhi to Bhopal on 28-06-2026 with 3A available."*

Claude calls `search_trains` (origin/destination resolved live: `New Delhi` → `NDLS`, `Bhopal` → `BPL`)
with `travelClass: "3A"` and `availableOnly: true`, and gets back **9 trains** with confirmed 3A seats:

> 🚆 **New Delhi → Bhopal Jn** · 28 Jun 2026 · class 3A · available only · **9 trains**

| Train | Name | Dep → Arr | Duration | 3A status | Fare |
|---|---|---|---|---|---|
| 12438 | SC Rajdhani | 15:35 → 23:30 | 7h 55m | AVL 25 | ₹1,995 |
| 22222 | CSMT Rajdhani | 16:55 → 00:35 | 7h 40m | AVL 31 | ₹1,995 |
| 22692 | SBC Rajdhani | 19:50 → 03:45 | 7h 55m | AVL 2 | ₹1,905 |
| 12191 | NZM JBP SF | 14:05 → 01:55 | 11h 50m | AVL 14 | ₹1,110 |
| 12780 | Goa Express | 15:15 → 02:35 | 11h 20m | AVL 1 | ₹1,110 |
| 07622 | NED Summer Spl | 21:40 → 07:17 | 9h 37m | AVL 123 | ₹1,365 |
| | | | | _…and 3 more_ | |

Raw tool output (truncated):

```json
{
  "source": "NDLS",
  "destination": "BPL",
  "date": "28-06-2026",
  "filters": { "travelClass": "3A", "availableOnly": true },
  "trainCount": 9,
  "trains": [
    {
      "trainNumber": "12438",
      "trainName": "SC RAJDHANI",
      "fromStnCode": "NZM", "toStnCode": "BPL",
      "departureTime": "15:35", "arrivalTime": "23:30",
      "durationFormatted": "7h 55m", "distance": 694, "hasPantry": true, "trainRating": 4.4,
      "availability": [
        { "travelClass": "3A", "status": "AVL 25", "seats": 25, "fare": 1995, "confirmStatus": "Confirm", "confirmChance": 100, "quota": "GN" }
      ]
    }
  ]
}
```

## Tools

| Tool | What it does |
|---|---|
| `search_trains` | All trains between origin & destination on a date, with per-class seat availability (SL/3A/3E/2A/1A/CC/EC/2S), fares, timings, duration, rating. Optional `travelClass` and `availableOnly` filters. |
| `get_seat_availability` | Live availability for one specific train number on a route+date. |
| `find_station_code` | Resolve any station/city name to its IRCTC code via live autocomplete (e.g. "Itarsi" → "ET"). |

**Inputs are forgiving:**
- Origin / destination accept a **station code** (`NDLS`) *or* a **city name** (`New Delhi`).
- Dates accept **DD-MM-YYYY** (`28-06-2026`) or **YYYY-MM-DD** (`2026-06-28`).

## Availability status codes

| Status | Meaning |
|---|---|
| `AVL n` | `n` seats confirmed-available now (`seats` field = n) |
| `WL n` | Waitlist position n |
| `RAC n` | Reservation Against Cancellation, position n |
| `Regret` / `Not Available` | No booking in that class |

Each class also reports `fare` (₹), `confirmStatus`, and `confirmChance` (0–100%).

## Build

```bash
npm install
npm run build
```

## Register with Claude Code

```bash
claude mcp add --scope user confirmtkt-trains -- node /absolute/path/to/dist/server.js
```

Then ask Claude: *"Find trains from New Delhi to Bhopal on 28-06-2026 with 3A available."*

## License

Released under the [MIT License](LICENSE).
