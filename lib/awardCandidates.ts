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
