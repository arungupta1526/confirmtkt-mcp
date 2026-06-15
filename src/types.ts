// Shared types for the ConfirmTkt trains client and MCP tools.

export interface ClassAvailability {
  travelClass: string; // "SL", "3A", "3E", "2A", "1A", "CC", "EC", "2S"
  status: string; // display string e.g. "AVL 31", "WL 12", "RAC 5", "Regret"
  seats: number | null; // numeric seat count when confirmed-available, else null
  fare: number | null; // ticket fare in INR
  confirmStatus: string | null; // ConfirmTkt prediction e.g. "Confirm"
  confirmChance: number | null; // 0-100 probability of confirmation
  quota: string | null;
}

export interface Train {
  trainNumber: string;
  trainName: string;
  fromStnCode: string;
  fromStnName: string;
  toStnCode: string;
  toStnName: string;
  departureTime: string;
  arrivalTime: string;
  duration: string; // minutes as string from API
  durationFormatted: string; // "8h 12m"
  distance: number | null;
  runningDays: string | null;
  hasPantry: boolean;
  trainType: string | null;
  trainRating: number | null;
  availability: ClassAvailability[];
}

export interface SearchResult {
  source: string;
  destination: string;
  date: string; // DD-MM-YYYY
  trainCount: number;
  trains: Train[];
}

export interface Station {
  stationCode: string;
  stationName: string;
  city: string | null;
  state: string | null;
  isMajor: boolean;
}
