import React, { useState, useEffect, useCallback } from 'react';
import {
  Play,
  Users,
  Trophy,
  Plus,
  Lock,
  Globe,
  Copy,
  Check,
  LogOut,
  RefreshCw,
  Search,
  Zap,
  UserX,
  ArrowLeft
} from 'lucide-react';
import { ApiService, HUB_URL } from '../services/api.js';
import { wsClient, type QueueStatusPayload } from '../services/ws.js';
import type {
  PlayerProfile,
  PublicGameState,
  PublicLeaderboardEntry,
  PublicLobbyInfo,
  WallRushMode
} from '../types/game.js';
import { MarblePawn } from './MarblePawn.js';
import { RankBadge } from './RankBadge.js';

interface LobbyViewProps {
  player: PlayerProfile;
  gameState: PublicGameState | null;
  publicLobbies: PublicLobbyInfo[];
  queueStatus: QueueStatusPayload | null;
  onLogout: () => void;
}

type LobbyTab = 'play' | 'custom' | 'leaderboard';

const MODE_OPTIONS: ReadonlyArray<{
  id: WallRushMode;
  label: string;
  players: string;
  desc: string;
}> = [
  {
    id: 'CLASSIC_1V1',
    label: 'Classic 1v1',
    players: '2 Players · 10 Walls',
    desc: 'Pure head-to-head tactical grid race across a 9x9 board.'
  },
  {
    id: 'OVERDRIVE_1V1',
    label: 'Overdrive 1v1',
    players: '2 Players · Boost Pads + Phased Walls',
    desc: 'Center boost pads grant +1 tile glide; walls dissolve after 6 rounds.'
  },
  {
    id: 'CLASSIC_4P',
    label: 'Classic 4P',
    players: '4 Players · 5 Walls Each',
    desc: 'Four-way crossfire from all 4 edges racing to the opposite baseline.'
  },
  {
    id: 'OVERDRIVE_4P',
    label: 'Overdrive 4P',
    players: '4 Players · Boost Pads + Phased Walls',
    desc: 'Four-player chaos with center momentum pads and 6-round phased barriers.'
  }
];

export const LobbyView: React.FC<LobbyViewProps> = ({
  player,
  gameState,
  publicLobbies,
  queueStatus,
  onLogout
}) => {
  const [activeTab, setActiveTab] = useState<LobbyTab>('play');
  const [selectedMode, setSelectedMode] = useState<WallRushMode>('CLASSIC_1V1');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  const [leaderboard, setLeaderboard] = useState<PublicLeaderboardEntry[]>([]);
  const [leaderboardSearch, setLeaderboardSearch] = useState('');
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  const fetchLeaderboard = useCallback(async (q?: string) => {
    setLoadingLeaderboard(true);
    try {
      const list = await ApiService.getLeaderboard(q);
      setLeaderboard(list);
    } catch {
      // Non-blocking
    } finally {
      setLoadingLeaderboard(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'leaderboard') {
      fetchLeaderboard(leaderboardSearch.trim() || undefined);
    }
  }, [activeTab, leaderboardSearch, fetchLeaderboard]);

  const handleCopyRoomCode = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 1800);
  };

  // =========================================================================
  // WAITING ROOM VIEW (When player is inside a LOBBY phase room)
  // =========================================================================
  if (gameState && gameState.phase === 'LOBBY') {
    const isHost = gameState.hostId === player.id;
    const meInLobby = gameState.players.find((p) => p.id === player.id);
    const allGuestsReady = gameState.players.every(
      (p) => p.id === gameState.hostId || p.isReady
    );
    const canStart =
      isHost &&
      gameState.players.length === gameState.maxPlayers &&
      allGuestsReady;

    return (
      <div className="wr-lobby-shell">
        <header className="wr-topbar">
          <div className="wr-topbar-brand">
            <span className="wr-brand-dot" />
            <span className="wr-brand-title">MARBLE WALLRUSH</span>
          </div>

          <button
            type="button"
            onClick={() => wsClient.send({ type: 'LEAVE_LOBBY' })}
            className="btn-flat"
            style={{ padding: '7px 12px', fontSize: '0.8rem' }}
          >
            <ArrowLeft size={14} />
            <span>Leave Room</span>
          </button>
        </header>

        <div className="wr-waiting-container">
          <div className="wr-waiting-card">
            <div className="wr-waiting-header">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="wr-room-badge">
                    {gameState.visibility === 'private' ? (
                      <Lock size={12} />
                    ) : (
                      <Globe size={12} />
                    )}
                    <span>{gameState.visibility.toUpperCase()} LOBBY</span>
                  </span>
                  <span className="wr-mode-pill">
                    {gameState.players.length}/{gameState.maxPlayers} Players
                  </span>
                </div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 900, marginTop: 6 }}>
                  Waiting for Players
                </h2>
              </div>

              <button
                type="button"
                onClick={() => handleCopyRoomCode(gameState.roomCode)}
                className="wr-room-code-box"
                title="Copy Room Code"
              >
                <span className="wr-room-code-label">CODE</span>
                <span className="wr-room-code-val">{gameState.roomCode}</span>
                {copiedCode ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
              </button>
            </div>

            {/* Mode Selector (Host can switch modes in lobby) */}
            <div className="wr-mode-selector-grid">
              {MODE_OPTIONS.map((opt) => {
                const isSelected = gameState.mode === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={!isHost}
                    onClick={() => wsClient.send({ type: 'SET_MODE', mode: opt.id })}
                    className={`wr-mode-option-card ${isSelected ? 'is-selected' : ''}`}
                  >
                    <div className="wr-mode-option-top">
                      <span className="wr-mode-option-name">{opt.label}</span>
                      <span className="wr-mode-option-meta">{opt.players}</span>
                    </div>
                    <p className="wr-mode-option-desc">{opt.desc}</p>
                  </button>
                );
              })}
            </div>

            {/* Seats Grid — Strictly Neutral Gray Marbles in Lobby per AGENTS.md */}
            <div className="wr-seats-grid">
              {Array.from({ length: gameState.maxPlayers }, (_, idx) => {
                const occupant = gameState.players[idx];
                return (
                  <div
                    key={idx}
                    className={`wr-seat-card ${occupant ? 'is-occupied' : 'is-empty'}`}
                  >
                    {occupant ? (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <MarblePawn color="neutral" size={32} label={occupant.username} />
                          <div>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                flexWrap: 'wrap'
                              }}
                            >
                              <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>
                                {occupant.username}
                              </span>
                              <RankBadge
                                elo={occupant.elo}
                                title={occupant.title}
                                isAdmin={occupant.isAdmin}
                              />
                            </div>
                            <span
                              style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: '0.73rem',
                                color: 'var(--text-secondary)'
                              }}
                            >
                              {occupant.elo} ELO · Seat #{idx + 1}
                            </span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span
                            className={`wr-ready-tag ${
                              occupant.id === gameState.hostId || occupant.isReady
                                ? 'is-ready'
                                : ''
                            }`}
                          >
                            {occupant.id === gameState.hostId
                              ? 'HOST'
                              : occupant.isReady
                                ? 'READY'
                                : 'NOT READY'}
                          </span>

                          {isHost && occupant.id !== player.id && (
                            <button
                              type="button"
                              onClick={() =>
                                wsClient.send({
                                  type: 'KICK_PLAYER',
                                  targetId: occupant.id
                                })
                              }
                              className="btn-flat"
                              style={{ padding: '5px 8px', color: '#DC2626' }}
                              title={`Kick ${occupant.username}`}
                            >
                              <UserX size={14} />
                            </button>
                          )}
                        </div>
                      </>
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Open Seat #{idx + 1} — Waiting for human player...
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer Actions */}
            <div className="wr-waiting-footer">
              {isHost ? (
                <button
                  type="button"
                  disabled={!canStart}
                  onClick={() => wsClient.send({ type: 'START_MATCH' })}
                  className="btn-flat btn-primary"
                  style={{ width: '100%', padding: '12px 18px', fontSize: '0.92rem' }}
                >
                  <Play size={16} />
                  <span>
                    {gameState.players.length < gameState.maxPlayers
                      ? `Waiting for Players (${gameState.players.length}/${gameState.maxPlayers})`
                      : !allGuestsReady
                        ? 'Waiting for Players to Ready Up'
                        : 'Start WallRush Match'}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => wsClient.send({ type: 'TOGGLE_READY' })}
                  className={`btn-flat ${meInLobby?.isReady ? '' : 'btn-primary'}`}
                  style={{ width: '100%', padding: '12px 18px', fontSize: '0.92rem' }}
                >
                  <Check size={16} />
                  <span>{meInLobby?.isReady ? 'Ready (Click to Unready)' : 'Ready Up'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // MAIN LOBBY HOME (Play | Custom Room | Leaderboard)
  // =========================================================================
  return (
    <div className="wr-lobby-shell">
      <header className="wr-topbar">
        <div className="wr-topbar-brand">
          <span className="wr-brand-dot" />
          <span className="wr-brand-title">MARBLE WALLRUSH</span>
        </div>

        <nav className="wr-topbar-nav" aria-label="WallRush navigation">
          <button
            type="button"
            onClick={() => setActiveTab('play')}
            className={`wr-nav-tab ${activeTab === 'play' ? 'is-active' : ''}`}
          >
            <Play size={14} />
            <span>Play</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('custom')}
            className={`wr-nav-tab ${activeTab === 'custom' ? 'is-active' : ''}`}
          >
            <Users size={14} />
            <span>Custom Room</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('leaderboard')}
            className={`wr-nav-tab ${activeTab === 'leaderboard' ? 'is-active' : ''}`}
          >
            <Trophy size={14} />
            <span>Leaderboard</span>
          </button>
        </nav>

        <div className="wr-topbar-right">
          <div className="wr-user-chip">
            <MarblePawn color="neutral" size={22} />
            <span className="wr-user-chip-name">{player.username}</span>
            <RankBadge
              elo={player.elo}
              title={player.title}
              earnedTitle={player.earnedTitle}
              isAdmin={player.isAdmin}
            />
            <span className="wr-user-chip-elo">{player.elo} ELO</span>
          </div>

          {HUB_URL && (
            <a
              href={HUB_URL}
              className="btn-flat"
              style={{ padding: '7px 11px', fontSize: '0.76rem', textDecoration: 'none' }}
              title="Return to Marble Games Hub"
            >
              Hub
            </a>
          )}

          <button
            type="button"
            onClick={onLogout}
            className="btn-flat"
            style={{ padding: '7px 10px' }}
            title="Log Out"
            aria-label="Log Out"
          >
            <LogOut size={14} />
          </button>
        </div>
      </header>

      <main className="wr-lobby-main">
        {activeTab === 'play' && (
          <div className="wr-play-layout">
            {/* Mode Selector Pills */}
            <div className="wr-mode-selector-grid">
              {MODE_OPTIONS.map((opt) => {
                const isSelected = selectedMode === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSelectedMode(opt.id)}
                    className={`wr-mode-option-card ${isSelected ? 'is-selected' : ''}`}
                  >
                    <div className="wr-mode-option-top">
                      <span className="wr-mode-option-name">{opt.label}</span>
                      <span className="wr-mode-option-meta">{opt.players}</span>
                    </div>
                    <p className="wr-mode-option-desc">{opt.desc}</p>
                  </button>
                );
              })}
            </div>

            {/* Primary Matchmaking Cards (Queue Match & Quick Match) */}
            <div className="wr-play-cards-grid">
              {/* Card 1: Ranked Queue Match */}
              <div className="wr-action-card">
                <div className="wr-action-card-top">
                  <span className="wr-bonus-pill">1.5x ELO WINNER BONUS</span>
                  <h2 className="wr-action-card-title">Queue Match</h2>
                  <p className="wr-action-card-desc">
                    Enter automated matchmaking for{' '}
                    <strong>
                      {MODE_OPTIONS.find((m) => m.id === selectedMode)?.label}
                    </strong>
                    . Match starts automatically as soon as all seats fill.
                  </p>
                </div>

                {queueStatus?.inQueue ? (
                  <div className="wr-queue-active-box">
                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#047857' }}>
                      Searching for Players ({queueStatus.queueSize}/{queueStatus.required})...
                    </div>
                    <button
                      type="button"
                      onClick={() => wsClient.send({ type: 'LEAVE_QUEUE' })}
                      className="btn-flat"
                      style={{ width: '100%' }}
                    >
                      Cancel Queue
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      wsClient.send({ type: 'JOIN_QUEUE', mode: selectedMode })
                    }
                    className="btn-flat btn-primary"
                    style={{ width: '100%', padding: '13px 18px', fontSize: '0.92rem' }}
                  >
                    <Zap size={16} />
                    <span>Find Queue Match</span>
                  </button>
                )}
              </div>

              {/* Card 2: Quick Match (Join Random Public Lobby) */}
              <div className="wr-action-card">
                <div className="wr-action-card-top">
                  <span className="wr-standard-pill">INSTANT PUBLIC ROOM</span>
                  <h2 className="wr-action-card-title">Quick Match</h2>
                  <p className="wr-action-card-desc">
                    Jump immediately into an open public lobby for{' '}
                    <strong>
                      {MODE_OPTIONS.find((m) => m.id === selectedMode)?.label}
                    </strong>{' '}
                    or host a new room if none are waiting.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    wsClient.send({ type: 'JOIN_RANDOM_LOBBY', mode: selectedMode })
                  }
                  className="btn-flat"
                  style={{
                    width: '100%',
                    padding: '13px 18px',
                    fontSize: '0.92rem',
                    borderColor: '#09090B',
                    fontWeight: 800
                  }}
                >
                  <Play size={16} />
                  <span>Join Quick Match</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'custom' && (
          <div className="wr-custom-layout">
            <div className="wr-play-cards-grid">
              {/* Create Public or Private Room */}
              <div className="wr-action-card">
                <div className="wr-action-card-top">
                  <h2 className="wr-action-card-title">Create Custom Lobby</h2>
                  <p className="wr-action-card-desc">
                    Host a public room listed in the browser or a private room accessible only via
                    6-character room code.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() =>
                      wsClient.send({
                        type: 'CREATE_LOBBY',
                        visibility: 'public',
                        mode: selectedMode
                      })
                    }
                    className="btn-flat btn-primary"
                    style={{ flex: 1, padding: '11px 14px' }}
                  >
                    <Globe size={15} />
                    <span>Create Public</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      wsClient.send({
                        type: 'CREATE_LOBBY',
                        visibility: 'private',
                        mode: selectedMode
                      })
                    }
                    className="btn-flat"
                    style={{ flex: 1, padding: '11px 14px' }}
                  >
                    <Lock size={15} />
                    <span>Create Private</span>
                  </button>
                </div>
              </div>

              {/* Join by 6-Character Room Code */}
              <div className="wr-action-card">
                <div className="wr-action-card-top">
                  <h2 className="wr-action-card-title">Join by Room Code</h2>
                  <p className="wr-action-card-desc">
                    Enter a 6-character room code shared by a friend to join their private or
                    public match.
                  </p>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (roomCodeInput.trim().length >= 4) {
                      wsClient.send({
                        type: 'JOIN_LOBBY',
                        roomCode: roomCodeInput.trim().toUpperCase()
                      });
                    }
                  }}
                  style={{ display: 'flex', gap: 8 }}
                >
                  <input
                    type="text"
                    maxLength={8}
                    placeholder="ENTER CODE"
                    value={roomCodeInput}
                    onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                    className="input-flat"
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 800,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase'
                    }}
                  />
                  <button
                    type="submit"
                    disabled={roomCodeInput.trim().length < 4}
                    className="btn-flat btn-primary"
                    style={{ padding: '10px 16px' }}
                  >
                    <Plus size={15} />
                    <span>Join</span>
                  </button>
                </form>
              </div>
            </div>

            {/* Active Public Lobbies Browser */}
            <div className="wr-action-card" style={{ marginTop: 16 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 12
                }}
              >
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800 }}>
                  Open Public Lobbies ({publicLobbies.length})
                </h3>
                <button
                  type="button"
                  onClick={() => wsClient.send({ type: 'GET_PUBLIC_LOBBIES' })}
                  className="btn-flat"
                  style={{ padding: '6px 10px', fontSize: '0.76rem' }}
                >
                  <RefreshCw size={13} />
                  <span>Refresh</span>
                </button>
              </div>

              {publicLobbies.length === 0 ? (
                <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
                  No open public lobbies right now. Create one above or start a Quick Match.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {publicLobbies.map((lobby) => (
                    <div key={lobby.roomCode} className="wr-seat-card is-occupied">
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>
                          {lobby.hostUsername}&apos;s Room ·{' '}
                          <span style={{ fontFamily: 'var(--font-mono)' }}>{lobby.roomCode}</span>
                        </div>
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                          {MODE_OPTIONS.find((m) => m.id === lobby.mode)?.label || lobby.mode} ·{' '}
                          {lobby.playerCount}/{lobby.maxPlayers} Players
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          wsClient.send({ type: 'JOIN_LOBBY', roomCode: lobby.roomCode })
                        }
                        className="btn-flat btn-primary"
                        style={{ padding: '7px 14px', fontSize: '0.8rem' }}
                      >
                        Join
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div className="wr-action-card">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                flexWrap: 'wrap',
                marginBottom: 14
              }}
            >
              <div>
                <h2 className="wr-action-card-title">WallRush Top 10 Standings</h2>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  Authoritative ELO ratings stored on Dedicated WallRush Database
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ position: 'relative' }}>
                  <Search
                    size={14}
                    style={{
                      position: 'absolute',
                      left: 10,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-muted)'
                    }}
                  />
                  <input
                    type="text"
                    value={leaderboardSearch}
                    onChange={(e) => setLeaderboardSearch(e.target.value)}
                    placeholder="Search player..."
                    className="input-flat"
                    style={{ paddingLeft: 30, width: 190, fontSize: '0.8rem' }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => fetchLeaderboard(leaderboardSearch.trim() || undefined)}
                  className="btn-flat"
                  style={{ padding: '8px 10px' }}
                >
                  <RefreshCw size={14} />
                </button>
              </div>
            </div>

            {loadingLeaderboard ? (
              <div style={{ padding: 28, textAlign: 'center', color: 'var(--text-muted)' }}>
                Loading standings...
              </div>
            ) : leaderboard.length === 0 ? (
              <div style={{ padding: 28, textAlign: 'center', color: 'var(--text-muted)' }}>
                No ranked players found yet. Complete a match to claim #1.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {leaderboard.map((entry) => (
                  <div key={entry.id} className="wr-seat-card is-occupied">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 900,
                          fontSize: '0.92rem',
                          width: 26,
                          color: entry.rank <= 3 ? '#059669' : 'var(--text-secondary)'
                        }}
                      >
                        #{entry.rank}
                      </span>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>
                            {entry.username}
                          </span>
                          <RankBadge
                            elo={entry.elo}
                            title={entry.title}
                            isAdmin={entry.isAdmin}
                          />
                        </div>
                        <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)' }}>
                          {entry.wins}W / {entry.losses}L ({entry.winRate}% WR) · Peak{' '}
                          {entry.peakElo}
                        </div>
                      </div>
                    </div>

                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 900,
                        fontSize: '0.95rem'
                      }}
                    >
                      {entry.elo} ELO
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
