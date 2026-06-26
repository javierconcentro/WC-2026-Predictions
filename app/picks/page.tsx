import { db, dbConfigured } from "@/lib/db";
import { currentPlayer, getConfig, part12Locked, bracketOpen, bracketLocked } from "@/lib/auth";
import JoinGate from "@/components/JoinGate";
import PicksEditor from "@/components/PicksEditor";
import { fixedR32Matchups, R32_SLOT_LOCKS } from "@/lib/bracket";
import type { Team } from "@/lib/types";

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

  const { data: teams } = await db().from("teams").select("*").order("name");
  const locked = part12Locked(cfg);

  const matchups = fixedR32Matchups((teams ?? []) as Team[]);

  return (
    <PicksEditor
      playerName={player.name}
      teams={(teams ?? []) as Team[]}
      locked={locked}
      lockAt={cfg.lock_part12_at}
      bracketMatchups={matchups}
      bracketOpen={bracketOpen(cfg)}
      bracketLocked={bracketLocked(cfg)}
      bracketSlotLocks={R32_SLOT_LOCKS}
    />
  );
}
