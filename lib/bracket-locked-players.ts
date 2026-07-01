// The bracket was reopened (global bracket_lock_at moved) so players who never
// submitted a bracket can still make their picks. Players who had ALREADY made
// picks at the moment of reopening must stay locked — they can't change theirs.
//
// This is a snapshot of who had bracket/bronze picks when the bracket reopened
// on 2026-07-01. Anyone NOT in this set (e.g. a newcomer, or someone who had
// made no picks) is free to build and complete a bracket. Snapshotting a set is
// necessary because the editor auto-saves incrementally: a "has any picks now"
// check would lock a new player out after their very first pick.
export const BRACKET_LOCKED_PLAYERS = new Set<string>([
  "ec4272bd-0415-4b97-9c08-10ee4cbd4c34", // Inigo
  "f1ef5f56-4e2b-4b70-8a8f-a5c67dfdd333", // Jake
  "375179d2-79ae-468b-80fb-d6e8d3760d88", // Javier
  "c9e82a8a-beb8-4e78-b3f0-b69ff8f2eafc", // Liz (re-locked after finishing champion/bronze)
  "81f29bee-d75c-4941-996c-77d2eae37e52", // Mahdi
  "6b02ce5b-008c-4ff7-9c55-8202ba8800cf", // Sam
  "d1610945-e4c4-4342-99d8-4e9a70c66d06", // Tao
  "bd18be90-9070-4bb0-912c-e59e64b77565", // Tom
  "0c20361b-fe91-422d-9a95-33a51040366c", // Zoe
]);

export function bracketLockedForPlayer(playerId: string): boolean {
  return BRACKET_LOCKED_PLAYERS.has(playerId);
}
