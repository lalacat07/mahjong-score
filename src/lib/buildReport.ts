import { PlayerScore, GameSession } from "./types";

export function buildReport(sessions: GameSession[]): {
  players: string[];
  totals: Record<string, number>;
  sessions: GameSession[];
} {
  const playerSet = new Set<string>();
  sessions.forEach((s) =>
    s.players.forEach((p) => playerSet.add(p.name))
  );
  const players = Array.from(playerSet);

  const totals: Record<string, number> = {};
  players.forEach((p) => (totals[p] = 0));

  sessions.forEach((session) => {
    session.players.forEach((p) => {
      totals[p.name] = (totals[p.name] || 0) + p.delta;
    });
  });

  return { players, totals, sessions };
}

export function formatDelta(delta: number, currency = "¥"): string {
  if (delta > 0) return `+${currency}${delta.toFixed(0)}`;
  if (delta < 0) return `-${currency}${Math.abs(delta).toFixed(0)}`;
  return `${currency}0`;
}

export function rankPlayers(players: PlayerScore[]): PlayerScore[] {
  return [...players].sort((a, b) => b.score - a.score);
}

export function validateScores(players: PlayerScore[]): boolean {
  const sum = players.reduce((acc, p) => acc + p.score, 0);
  return Math.abs(sum) <= 1; // allow rounding error of 1
}
