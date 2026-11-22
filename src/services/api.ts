import type {
  PlayerProfile,
  PublicLeaderboardEntry,
  PublicLobbyInfo
} from '../types/game.js';

const getLocalHost = () => {
  if (typeof window !== 'undefined' && window.location.hostname) {
    return window.location.hostname;
  }
  return 'localhost';
};

// WallRush Dedicated Backend (Render Account B)
const DEFAULT_API_URL = import.meta.env.PROD
  ? ''
  : `http://${getLocalHost()}:3003`;

export const API_BASE = (import.meta.env.VITE_API_URL || DEFAULT_API_URL)
  .trim()
  .replace(/\/+$/, '');

// Marble Games Hub Auth Server (Render Account A) for live Playing Presence heartbeats
const DEFAULT_HUB_AUTH_URL = import.meta.env.PROD
  ? 'https://backend-roullete-service.onrender.com'
  : `http://${getLocalHost()}:3002`;

export const HUB_AUTH_API_BASE = (
  import.meta.env.VITE_AUTH_API_URL || DEFAULT_HUB_AUTH_URL
)
  .trim()
  .replace(/\/+$/, '');

// Marble Games Hub Frontend URL (Same Vercel Account)
const DEFAULT_HUB_URL = import.meta.env.PROD
  ? ''
  : `http://${getLocalHost()}:5174`;

export const HUB_URL = (import.meta.env.VITE_HUB_URL || DEFAULT_HUB_URL)
  .trim()
  .replace(/\/+$/, '');

const TOKEN_STORAGE_KEY = 'wallrush_token';
const SHARED_HUB_TOKEN_KEY = 'marble_games_token';

export class ApiService {
  private static token: string | null =
    typeof window !== 'undefined'
      ? localStorage.getItem(TOKEN_STORAGE_KEY) ||
        localStorage.getItem(SHARED_HUB_TOKEN_KEY)
      : null;

  public static setToken(token: string | null) {
    this.token = token;
    if (typeof window === 'undefined') return;
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  }

  public static getToken(): string | null {
    return this.token;
  }

  /**
   * Exchanges the 30-second one-time SSO code with WallRush Backend (Render B),
   * which pulls the player's identity from GameListerServer (Render A) and upserts
   * into WallRush's dedicated Supabase B.
   */
  public static async exchangeSsoCode(
    code: string
  ): Promise<{ success: boolean; token: string; player: PlayerProfile }> {
    const res = await fetch(`${API_BASE}/api/auth/sso-exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Single sign-on handoff failed');
    if (data.token) {
      this.setToken(data.token);
    }
    return data;
  }

  public static async getMe(): Promise<{ player: PlayerProfile }> {
    const token = this.getToken();
    if (!token) throw new Error('Not authenticated');

    const res = await fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to verify session');
    return data;
  }

  public static async getPublicLobbies(): Promise<PublicLobbyInfo[]> {
    const res = await fetch(`${API_BASE}/api/lobbies`, { cache: 'no-store' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch lobbies');
    return data.lobbies || [];
  }

  public static async getLeaderboard(query?: string): Promise<PublicLeaderboardEntry[]> {
    const url = query
      ? `${API_BASE}/api/leaderboard?q=${encodeURIComponent(query)}`
      : `${API_BASE}/api/leaderboard`;
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch leaderboard');
    return data.leaderboard || [];
  }

  /**
   * Reports live "Playing WallRush" presence to Marble Games Hub so friends see it in real time.
   */
  public static async reportPlayingPresence(gameId: 'wall-rush' | null): Promise<void> {
    const token = this.getToken();
    if (!token || !HUB_AUTH_API_BASE) return;
    try {
      await fetch(`${HUB_AUTH_API_BASE}/api/presence/playing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ gameId }),
        keepalive: gameId === null
      });
    } catch {
      // Non-blocking presence update
    }
  }
}
