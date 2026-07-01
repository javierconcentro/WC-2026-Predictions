import { db, dbConfigured } from "@/lib/db";
import { currentPlayer, getConfig, part12Locked, bracketOpen, bracketLocked } from "@/lib/auth";
import JoinGate from "@/components/JoinGate";
import PicksEditor from "@/components/PicksEditor";
import { r32FromFixtures, r32ResolvedWinners } from "@/lib/bracket";
import { bracketLockedForPlayer } from "@/lib/bracket-locked-players";
import type { Fixture, Team } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PicksPage() {
  if (!dbConfigured()) {
    return (
      <p className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm">
        Environment not configured yet.
      </p>
    );
  }

  const [player, cfg] = await Promise.all([currentPlayer(), getConfig()]);
  if (!player) return <JoinGate />;

  const supabase = db();
  const [{ data: teams }, { data: r32 }] = await Promise.all([
    supabase.from("teams").select("*").order("name"),
    supabase.from("fixtures").select("*").eq("stage", "R32"),
  ]);
  const locked = part12Locked(cfg);

  const { matchups, slotLocks } = r32FromFixtures((r32 ?? []) as Fixture[], (teams ?? []) as Team[]);
  const resolvedWinners = r32ResolvedWinners((r32 ?? []) as Fixture[]);

  return (
    <PicksEditor
      playerName={player.name}
      teams={(teams ?? []) as Team[]}
      locked={locked}
      lockAt={cfg.lock_part12_at}
      bracketMatchups={matchups}
      bracketOpen={bracketOpen(cfg)}
      bracketLocked={bracketLocked(cfg) || bracketLockedForPlayer(player.id)}
      bracketSlotLocks={slotLocks}
      bracketResolvedWinners={resolvedWinners}
    />
  );
}
