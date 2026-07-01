import type { BracketPick } from "./types";

// Picks that were injected by the system, not entered by the player.
// They display in the bracket (so the tree flows) but do not award points.
// Key format: "player_id:slot"
export const AUTOFILLED_PICKS = new Set<string>([
  "848bbf60-7a64-4eef-8868-68dddf8f87a2:R32-1", // Grayson
  "ec4272bd-0415-4b97-9c08-10ee4cbd4c34:R32-1", // Inigo
  "6b02ce5b-008c-4ff7-9c55-8202ba8800cf:R32-1", // Sam
  "d1610945-e4c4-4342-99d8-4e9a70c66d06:R32-1", // Tao
  "0c20361b-fe91-422d-9a95-33a51040366c:R32-1", // Zoe
  // Jake's finished-game picks were all auto-filled with the actual winners
  // (he's the only player who "picked" the Paraguay/Canada/etc. upsets, and
  // his finished slots were blanks the old save logic stamped in). Void every
  // already-played knockout pick of his — see the 2026-07-01 review.
  "f1ef5f56-4e2b-4b70-8a8f-a5c67dfdd333:R32-1", // Jake
  "f1ef5f56-4e2b-4b70-8a8f-a5c67dfdd333:R32-2", // Jake
  "f1ef5f56-4e2b-4b70-8a8f-a5c67dfdd333:R32-3", // Jake
  "f1ef5f56-4e2b-4b70-8a8f-a5c67dfdd333:R32-4", // Jake
  "f1ef5f56-4e2b-4b70-8a8f-a5c67dfdd333:R32-9", // Jake
  "f1ef5f56-4e2b-4b70-8a8f-a5c67dfdd333:R32-10", // Jake
  "f1ef5f56-4e2b-4b70-8a8f-a5c67dfdd333:R32-11", // Jake
]);

// Returns slot names that are auto-filled (and should not score) for a player.
export function autofilledSlotsFor(playerId: string): string[] {
  const slots: string[] = [];
  for (const key of AUTOFILLED_PICKS) {
    const colon = key.indexOf(":");
    if (key.slice(0, colon) === playerId) slots.push(key.slice(colon + 1));
  }
  return slots;
}

// Strips auto-filled picks before passing to scorePlayer / scorePart3.
export function filterAutofilledPicks(
  playerId: string,
  picks: BracketPick[]
): BracketPick[] {
  return picks.filter((p) => !AUTOFILLED_PICKS.has(`${playerId}:${p.slot}`));
}
