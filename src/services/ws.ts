import { API_BASE, ApiService } from './api.js';
import type {
  PublicGameState,
  PublicLobbyInfo,
  WallOrientation,
  WallRushMode
} from '../types/game.js';

export interface QueueStatusPayload {
  inQueue: boolean;
  mode: WallRushMode;
  queueSize: number;
  required: number;
}

class WallRushWsClient {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private intentionalDisconnect = false;

  private stateListeners = new Set<(state: PublicGameState) => void>();
  private lobbiesListeners = new Set<(lobbies: PublicLobbyInfo[]) => void>();
  private queueListeners = new Set<(status: QueueStatusPayload) => void>();
  private lobbyLeftListeners = new Set<() => void>();
  private kickedListeners = new Set<(msg: string) => void>();
  private errorListeners = new Set<(msg: string) => void>();

  private getWsUrl(): string {
    const token = ApiService.getToken() || '';
    if (API_BASE) {
      const wsBase = API_BASE.replace(/^http/i, 'ws');
      return `${wsBase}/ws?token=${encodeURIComponent(token)}`;
    }
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname || 'localhost';
    return `${proto}//${host}:3003/ws?token=${encodeURIComponent(token)}`;
  }

  public async connect(): Promise<void> {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const token = ApiService.getToken();
    if (!token) return;

    this.intentionalDisconnect = false;

    return new Promise((resolve) => {
      const socket = new WebSocket(this.getWsUrl());
      this.ws = socket;

      socket.onopen = () => {
        this.startHeartbeat();
        resolve();
      };

      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(String(event.data));
          switch (msg.type) {
            case 'GAME_STATE':
              if (msg.state) {
                this.stateListeners.forEach((cb) => cb(msg.state));
              }
              break;
            case 'PUBLIC_LOBBIES':
              if (Array.isArray(msg.lobbies)) {
                this.lobbiesListeners.forEach((cb) => cb(msg.lobbies));
              }
              break;
            case 'QUEUE_STATUS':
              this.queueListeners.forEach((cb) =>
                cb({
                  inQueue: Boolean(msg.inQueue),
                  mode: msg.mode || 'CLASSIC_1V1',
                  queueSize: Number(msg.queueSize || 0),
                  required: Number(msg.required || 2)
                })
              );
              break;
            case 'LOBBY_LEFT':
              this.lobbyLeftListeners.forEach((cb) => cb());
              break;
            case 'KICKED_FROM_LOBBY':
              this.kickedListeners.forEach((cb) =>
                cb(msg.message || 'Removed from lobby by host.')
              );
              break;
            case 'ERROR':
              this.errorListeners.forEach((cb) =>
                cb(msg.message || 'Server rejected action.')
              );
              break;
          }
        } catch {
          // Ignore malformed frame
        }
      };

      socket.onclose = (ev) => {
        this.stopHeartbeat();
        if (this.ws === socket) {
          this.ws = null;
        }
        if (!this.intentionalDisconnect && ev.code !== 4000 && ev.code !== 4001 && ev.code !== 4003) {
          if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
          this.reconnectTimer = setTimeout(() => {
            this.connect().catch(() => {});
          }, 2000);
        }
        resolve();
      };

      socket.onerror = () => {
        resolve();
      };
    });
  }

  public disconnect(): void {
    this.intentionalDisconnect = true;
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.pingTimer = setInterval(() => {
      this.send({ type: 'PING' });
    }, 20_000);
  }

  private stopHeartbeat(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  public send(payload: Record<string, unknown>): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  public movePawn(r: number, c: number): void {
    this.send({ type: 'MOVE_PAWN', r, c });
  }

  public placeWall(r: number, c: number, orientation: WallOrientation): void {
    this.send({ type: 'PLACE_WALL', r, c, orientation });
  }

  public onState(cb: (state: PublicGameState) => void): () => void {
    this.stateListeners.add(cb);
    return () => this.stateListeners.delete(cb);
  }

  public onPublicLobbies(cb: (lobbies: PublicLobbyInfo[]) => void): () => void {
    this.lobbiesListeners.add(cb);
    return () => this.lobbiesListeners.delete(cb);
  }

  public onQueue(cb: (status: QueueStatusPayload) => void): () => void {
    this.queueListeners.add(cb);
    return () => this.queueListeners.delete(cb);
  }

  public onLobbyLeft(cb: () => void): () => void {
    this.lobbyLeftListeners.add(cb);
    return () => this.lobbyLeftListeners.delete(cb);
  }

  public onKicked(cb: (msg: string) => void): () => void {
    this.kickedListeners.add(cb);
    return () => this.kickedListeners.delete(cb);
  }

  public onError(cb: (msg: string) => void): () => void {
    this.errorListeners.add(cb);
    return () => this.errorListeners.delete(cb);
  }
}

export const wsClient = new WallRushWsClient();
