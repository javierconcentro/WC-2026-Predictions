// Curated shortlists for the What-if Simulator's three award selectors.
// Each list is its own array of { name, country }, ordered favorite-first.
// Edit freely as results come in (add / remove / reorder names) — the simulator
// reads these arrays and needs no other changes. The `name` must match how the
// award winner is recorded so picks score correctly.

export interface AwardCandidate {
  name: string;
  country: string;
}

// Top Scorer (Golden Boot) — leaders on 8, then those who can still catch them.
// (Mbappé can only add goals in the third-place game.)
export const SCORER_CANDIDATES: AwardCandidate[] = [
  { name: "Lionel Messi", country: "Argentina" },
  { name: "Kylian Mbappé", country: "France" },
  { name: "Harry Kane", country: "England" },
  { name: "Jude Bellingham", country: "England" },
  { name: "Mikel Oyarzabal", country: "Spain" },
];

// Best Player (Golden Ball / MVP).
export const MVP_CANDIDATES: AwardCandidate[] = [
  { name: "Lionel Messi", country: "Argentina" },
  { name: "Jude Bellingham", country: "England" },
  { name: "Rodri", country: "Spain" },
  { name: "Harry Kane", country: "England" },
  { name: "Lamine Yamal", country: "Spain" },
  { name: "Kylian Mbappé", country: "France" },
  { name: "Michael Olise", country: "France" },
  { name: "Mikel Oyarzabal", country: "Spain" },
  { name: "Pedri", country: "Spain" },
  { name: "Ousmane Dembélé", country: "France" },
];

// Golden Glove (best goalkeeper).
export const GLOVE_CANDIDATES: AwardCandidate[] = [
  { name: "Unai Simón", country: "Spain" },
  { name: "Jordan Pickford", country: "England" },
  { name: "Emiliano Martínez", country: "Argentina" },
  { name: "Mike Maignan", country: "France" },
];

// The favorite outcomes the simulator loads with, so it opens on a baseline
// scenario rather than blank (everything stays editable). Update as results come
// in. Match values are TEAM names (resolved against the live fixtures); award
// values are player names (should appear in the lists above).
export const SIMULATOR_DEFAULTS = {
  finalWinner: "Spain", //       → champion Spain, runner-up the other finalist
  thirdPlaceWinner: "France", //  → bronze France, 4th the other third-place team
  topScorer: "Lionel Messi",
  mvp: "Lionel Messi",
  goldenGlove: "Unai Simón",
};
