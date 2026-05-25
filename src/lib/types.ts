export interface Warning {
  type: "duplicate" | "noName" | "duplicateName";
  message: string;
  indices?: number[];        // for game duplicates: 0-based game indices
  namePair?: [string, string]; // legacy — kept for backward compat, no longer emitted
  nameCluster?: string[];    // for fuzzy name duplicates: all names in the cluster (2+)
}

export interface PlayerScore {
  name: string;
  score: number;
  delta: number;       // yuan amount
  gameCount?: number;  // number of games this player participated in
}

export interface SingleGame {
  index: number;       // game number (1-based)
  time?: string;       // HH:MM if available
  players: PlayerScore[];
  valid: boolean;
}

export interface GameSession {
  id: string;
  date: string;
  title: string;
  rate: number;
  players: PlayerScore[];
  games?: SingleGame[];
  playerCount?: number;   // unique players across all games
  warnings?: Warning[];
}
