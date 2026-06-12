import type { SportsDataProvider } from "./types";
import { ApiFootballProvider } from "./apiFootball";
import { FootballDataProvider } from "./footballData";

// Provider selection: football-data.org if its key is set (free tier covers
// the World Cup), otherwise API-Football (needs a paid plan for season 2026).
export function getProvider(): SportsDataProvider {
  if (process.env.FOOTBALLDATA_KEY) return new FootballDataProvider();
  return new ApiFootballProvider();
}
