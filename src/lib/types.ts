export interface PlayerScore {
  name: string;
  score: number;
  delta: number; // yuan amount win/loss
}

export interface GameSession {
  id: string;
  date: string;
  title: string;
  rate: number; // yuan per point, e.g. 10
  players: PlayerScore[];
  imageUrl?: string;
}

export interface AnalyzeResponse {
  success: boolean;
  players?: PlayerScore[];
  error?: string;
  rawText?: string;
}
