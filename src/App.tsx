import React, { useState, useEffect, useRef } from 'react';
import { ApiService, HUB_URL } from './services/api.js';
import { wsClient, type QueueStatusPayload } from './services/ws.js';
import type {
  PersonalMatchResult,
  PlayerProfile,
  PublicGameState,
  PublicLobbyInfo
} from './types/game.js';
import { LobbyView } from './components/LobbyView.js';
import { WallRushBoard } from './components/WallRushBoard.js';
import { EloResultModal } from './components/EloResultModal.js';

export const App: React.FC = () => {
  const [player, setPlayer] = useState<PlayerProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState<boolean>(true);
  const [gameState, setGameState] = useState<PublicGameState | null>(null);
  const [publicLobbies, setPublicLobbies] = useState<PublicLobbyInfo[]>([]);
  const [queueStatus, setQueueStatus] = useState<QueueStatusPayload | null>(null);
  const [eloResult, setEloResult] = useState<PersonalMatchResult | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const playerRef = useRef<PlayerProfile | null>(null);
  useEffect(() => {
    playerRef.current = player;
  }, [player]);

  // 1. Federated Cross-Account SSO Handoff (?sso=<code>) + Session Restoration
  useEffect(() => {
    const initAuth = async () => {
      const params = new URLSearchParams(window.location.search);
      const ssoCode = params.get('sso');

      if (ssoCode) {
        params.delete('sso');
        const nextSearch = params.toString();
        const cleanUrl = `${window.location.pathname}${
          nextSearch ? `?${nextSearch}` : ''
        }${window.location.hash}`;
        window.history.replaceState({}, document.title, cleanUrl);

        try {
          const { player: synced } = await ApiService.exchangeSsoCode(ssoCode);
          setPlayer(synced);
          await wsClient.connect();
          setLoadingProfile(false);
          return;
        } catch (err) {
          console.warn('[WALLRUSH] SSO exchange failed:', err);
          ApiService.setToken(null);
        }
      }

      const token = ApiService.getToken();
      if (!token) {
        setLoadingProfile(false);
        return;
      }

      try {
        const { player: profile } = await ApiService.getMe();
        setPlayer(profile);
        await wsClient.connect();
      } catch {
        ApiService.setToken(null);
      } finally {
        setLoadingProfile(false);
      }
    };

    initAuth();
  }, []);

  // 2. WebSocket State & Event Subscriptions
  useEffect(() => {
    const unsubState = wsClient.onState((state) => {
      if (state.phase === 'GAME_OVER' || state.phase === 'ABORTED') {
        const current = playerRef.current;
        const result: PersonalMatchResult =
          state.personalResult ||
          (state.winner
            ? {
                won: state.winner.id === current?.id,
                placement: state.winner.id === current?.id ? 1 : 2,
                previousElo: current?.elo ?? 1200,
                newElo:
                  state.winner.id === current?.id
                    ? state.winner.newElo
                    : Math.max(0, (current?.elo ?? 1200) - state.winner.eloChange),
                eloChange:
                  state.winner.id === current?.id
                    ? state.winner.eloChange
                    : -state.winner.eloChange,
                isQueueMatch: state.isQueueMatch,
                queueBonusMultiplier: 1.5,
                isAborted: false,
                winnerUsername: state.winner.username
              }
            : {
                won: false,
                placement: 1,
                previousElo: current?.elo ?? 1200,
                newElo: current?.elo ?? 1200,
                eloChange: 0,
                isQueueMatch: state.isQueueMatch,
                queueBonusMultiplier: 1.5,
                isAborted: true,
                reason: state.broadcastMessage || 'Match aborted.'
              });

        setGameState(null);
        setQueueStatus(null);
        setEloResult(result);
        wsClient.send({ type: 'LEAVE_LOBBY' });
        ApiService.getMe()
          .then((res) => setPlayer(res.player))
          .catch(() => {});
        return;
      }

      setGameState(state);
      if (state.phase !== 'LOBBY') {
        setQueueStatus(null);
      }
    });

    const unsubLobbies = wsClient.onPublicLobbies((list) => {
      setPublicLobbies(list);
    });

    const unsubQueue = wsClient.onQueue((q) => {
      setQueueStatus(q.inQueue ? q : null);
    });

    const unsubLeft = wsClient.onLobbyLeft(() => {
      setGameState(null);
      ApiService.getMe()
        .then((res) => setPlayer(res.player))
        .catch(() => {});
    });

    const unsubKicked = wsClient.onKicked((msg) => {
      setGameState(null);
      setErrorBanner(msg);
      setTimeout(() => setErrorBanner(null), 4500);
    });

    const unsubError = wsClient.onError((msg) => {
      setErrorBanner(msg);
      setTimeout(() => setErrorBanner(null), 3800);
    });

    return () => {
      unsubState();
      unsubLobbies();
      unsubQueue();
      unsubLeft();
      unsubKicked();
      unsubError();
    };
  }, []);

  // 3. Report Live "Playing WallRush" Presence to Marble Games Hub
  useEffect(() => {
    if (!player) return;
    ApiService.reportPlayingPresence('wall-rush');
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        ApiService.reportPlayingPresence('wall-rush');
      }
    }, 45_000);

    const onHide = () => {
      ApiService.reportPlayingPresence(null);
    };
    window.addEventListener('pagehide', onHide);
    return () => {
      clearInterval(interval);
      window.removeEventListener('pagehide', onHide);
    };
  }, [player?.id]);

  // 4. Redirect Unauthenticated Visitors to Marble Games Hub (Unified SSO)
  useEffect(() => {
    if (!loadingProfile && !player && HUB_URL) {
      window.location.replace(HUB_URL);
    }
  }, [loadingProfile, player]);

  const handleLogout = () => {
    ApiService.reportPlayingPresence(null);
    ApiService.setToken(null);
    wsClient.disconnect();
    setPlayer(null);
    setGameState(null);
    if (HUB_URL) {
      const sep = HUB_URL.includes('?') ? '&' : '?';
      window.location.replace(`${HUB_URL}${sep}logout=1`);
    }
  };

  if (loadingProfile) {
    return (
      <div className="wr-loading-screen">
        <span>Connecting to WallRush Server...</span>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="wr-unauth-screen">
        <h1 style={{ fontSize: '1.25rem', fontWeight: 900, letterSpacing: '0.12em' }}>
          MARBLE WALLRUSH
        </h1>
        <p style={{ fontSize: '0.86rem', color: '#A1A1AA', maxWidth: 360 }}>
          {HUB_URL
            ? 'Redirecting to Marble Games Hub to sign in...'
            : 'Launch WallRush from the Marble Games Hub to sign in automatically.'}
        </p>
        {HUB_URL && (
          <a
            href={HUB_URL}
            className="btn-flat"
            style={{
              background: '#FFFFFF',
              color: '#09090B',
              textDecoration: 'none',
              padding: '10px 20px'
            }}
          >
            Open Marble Games Hub
          </a>
        )}
      </div>
    );
  }

  const isInActiveMatch = gameState && gameState.phase === 'GAMEPLAY';

  return (
    <div className="wr-app-root">
      {errorBanner && <div className="wr-error-toast">{errorBanner}</div>}

      {isInActiveMatch ? (
        <WallRushBoard
          gameState={gameState}
          currentPlayerId={player.id}
          onMovePawn={(r, c) => wsClient.movePawn(r, c)}
          onPlaceWall={(r, c, orientation) => wsClient.placeWall(r, c, orientation)}
          onLeaveMatch={() => wsClient.send({ type: 'LEAVE_LOBBY' })}
        />
      ) : (
        <LobbyView
          player={player}
          gameState={gameState}
          publicLobbies={publicLobbies}
          queueStatus={queueStatus}
          onLogout={handleLogout}
        />
      )}

      <EloResultModal data={eloResult} onClose={() => setEloResult(null)} />
    </div>
  );
};

export default App;
