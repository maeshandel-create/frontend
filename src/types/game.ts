export type WallRushMode =
  | 'CLASSIC_1V1'
  | 'OVERDRIVE_1V1'
  | 'CLASSIC_4P'
  | 'OVERDRIVE_4P';

export type MatchPhase = 'LOBBY' | 'GAMEPLAY' | 'GAME_OVER' | 'ABORTED';

export type MarblePalette = 'crimson' | 'sapphire' | 'emerald' | 'amber' | 'neutral';

export type WallOrientation = 'H' | 'V';

export interface CellCoord {
  r: number;
  c: number;
}

export interface PlacedWall {
  id: string;
  r: number;
  c: number;
  orientation: WallOrientation;
  ownerId: string;
  color: MarblePalette;
  turnsLeft: number | null;
}

export interface PlayerProfile {
  id: string;
  username: string;
  elo: number;
  peakElo: number;
  lastSeasonPeakElo: number;
  title?: string | null;
  earnedTitle?: string | null;
  godlikeStars: number;
  wins: number;
  losses: number;
  isAdmin: boolean;
  isBanned?: boolean;
}

export interface MatchPlayerState {
  id: string;
  username: string;
  elo: number;
  title: string | null;
  godlikeStars: number;
  isAdmin: boolean;
  seatIndex: number;
  color: MarblePalette;
  isReady: boolean;
  isConnected: boolean;
  pos: CellCoord;
  goalEdge: 'TOP' | 'BOTTOM' | 'LEFT' | 'RIGHT';
  wallsLeft: number;
  consecutiveTimeouts: number;
}

export interface PersonalMatchResult {
  won: boolean;
  placement: number;
  previousElo: number;
  newElo: number;
  eloChange: number;
  isQueueMatch: boolean;
  queueBonusMultiplier: number;
  isAborted: boolean;
  reason?: string;
  winnerUsername?: string;
}

export interface LastTurnSummary {
  actorId: string;
  actorUsername: string;
  action: 'MOVE' | 'WALL' | 'TIMEOUT_MOVE';
  from?: CellCoord;
  to?: CellCoord;
  boostedFrom?: CellCoord;
  wall?: { r: number; c: number; orientation: WallOrientation };
}

export interface PublicGameState {
  matchId: string;
  roomCode: string;
  visibility: 'public' | 'private';
  mode: WallRushMode;
  maxPlayers: 2 | 4;
  isQueueMatch: boolean;
  phase: MatchPhase;
  hostId: string;
  turnPlayerId: string | null;
  turnNumber: number;
  turnDeadline: number | null;
  serverNow: number;
  players: MatchPlayerState[];
  walls: PlacedWall[];
  boostPads: CellCoord[];
  validMovesForTurn: CellCoord[];
  lastTurn: LastTurnSummary | null;
  broadcastMessage: string | null;
  winner: {
    id: string;
    username: string;
    color: MarblePalette;
    eloChange: number;
    newElo: number;
  } | null;
  personalResult?: PersonalMatchResult;
}

export interface PublicLobbyInfo {
  roomCode: string;
  hostUsername: string;
  mode: WallRushMode;
  playerCount: number;
  maxPlayers: 2 | 4;
  createdAt: number;
}

export interface PublicLeaderboardEntry {
  rank: number;
  id: string;
  username: string;
  elo: number;
  peakElo: number;
  wins: number;
  losses: number;
  winRate: number;
  title: string | null;
  godlikeStars: number;
  isAdmin: boolean;
}
