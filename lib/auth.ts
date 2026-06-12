import { cookies } from "next/headers";
import { db } from "./db";
import type { Player, PoolConfig } from "./types";

export async function currentPlayer(): Promise<Player | null> {
  const jar = await cookies();
  const id = jar.get("player_id")?.value;
  if (!id) return null;
  const { data } = await db().from("players").select("*").eq("id", id).maybeSingle();
  return (data as Player) ?? null;
}

export async function isAdmin(): Promise<boolean> {
  const jar = await cookies();
  const v = jar.get("admin")?.value;
  return Boolean(v && process.env.ADMIN_PASSCODE && v === process.env.ADMIN_PASSCODE);
}

export async function getConfig(): Promise<PoolConfig> {
  const { data, error } = await db().from("config").select("*").eq("id", 1).single();
  if (error) throw error;
  return data as PoolConfig;
}

export function part12Locked(cfg: PoolConfig): boolean {
  return Date.now() >= new Date(cfg.lock_part12_at).getTime();
}

export function bracketOpen(cfg: PoolConfig): boolean {
  return Date.now() >= new Date(cfg.bracket_open_at).getTime();
}

export function bracketLocked(cfg: PoolConfig): boolean {
  return Date.now() >= new Date(cfg.bracket_lock_at).getTime();
}
