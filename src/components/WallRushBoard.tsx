import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  Clock,
  Footprints,
  GripHorizontal,
  GripVertical,
  Check,
  X,
  Zap,
  RotateCw
} from 'lucide-react';
import type {
  MarblePalette,
  MatchPlayerState,
  PlacedWall,
  PublicGameState,
  WallOrientation
} from '../types/game.js';
import { MarblePawn } from './MarblePawn.js';
import { RankBadge } from './RankBadge.js';

interface WallRushBoardProps {
  gameState: PublicGameState;
  currentPlayerId: string;
  onMovePawn: (r: number, c: number) => void;
  onPlaceWall: (r: number, c: number, orientation: WallOrientation) => void;
  onLeaveMatch: () => void;
}

type ToolMode = 'MOVE' | 'WALL_H' | 'WALL_V';

const WALL_COLOR_HEX: Record<MarblePalette, { fill: string; border: string }> = {
  crimson: { fill: '#EF4444', border: '#991B1B' },
  sapphire: { fill: '#3B82F6', border: '#1D4ED8' },
  emerald: { fill: '#10B981', border: '#047857' },
  amber: { fill: '#F59E0B', border: '#B45309' },
  neutral: { fill: '#71717A', border: '#3F3F46' }
};

const GOAL_LABEL: Record<MatchPlayerState['goalEdge'], string> = {
  TOP: 'Goal: Top Row (9)',
  BOTTOM: 'Goal: Bottom Row (1)',
  LEFT: 'Goal: Left Col (A)',
  RIGHT: 'Goal: Right Col (I)'
};

const MODE_LABELS: Record<PublicGameState['mode'], string> = {
  CLASSIC_1V1: 'Classic 1v1 Duel',
  OVERDRIVE_1V1: 'Overdrive 1v1 Duel',
  CLASSIC_4P: 'Classic 4-Player Crossfire',
  OVERDRIVE_4P: 'Overdrive 4-Player Crossfire'
};

const canPlaceWallClientCheck = (
  r: number,
  c: number,
  orientation: WallOrientation,
  walls: PlacedWall[]
): boolean => {
  if (r < 0 || r > 7 || c < 0 || c > 7) return false;
  for (const w of walls) {
    if (w.r === r && w.c === c) return false; // exact same intersection (H or V crossing)
    if (orientation === 'H' && w.orientation === 'H' && w.r === r && Math.abs(w.c - c) === 1) {
      return false;
    }
    if (orientation === 'V' && w.orientation === 'V' && w.c === c && Math.abs(w.r - r) === 1) {
      return false;
    }
  }
  return true;
};

export const WallRushBoard: React.FC<WallRushBoardProps> = ({
  gameState,
  currentPlayerId,
  onMovePawn,
  onPlaceWall,
  onLeaveMatch
}) => {
  const [toolMode, setToolMode] = useState<ToolMode>('MOVE');
  const [hoverWall, setHoverWall] = useState<{ r: number; c: number } | null>(null);
  const [pendingWall, setPendingWall] = useState<{
    r: number;
    c: number;
    orientation: WallOrientation;
  } | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(15);

  const isMyTurn = gameState.turnPlayerId === currentPlayerId;
  const me = gameState.players.find((p) => p.id === currentPlayerId) || null;
  const maxWalls = gameState.maxPlayers === 2 ? 10 : 5;

  // Sync server-authoritative turn countdown
  useEffect(() => {
    if (!gameState.turnDeadline) {
      setSecondsLeft(15);
      return;
    }
    const offset = Date.now() - gameState.serverNow;
    const updateClock = () => {
      const remainingMs = gameState.turnDeadline! - (Date.now() - offset);
      setSecondsLeft(Math.max(0, Math.ceil(remainingMs / 1000)));
    };
    updateClock();
    const interval = setInterval(updateClock, 250);
    return () => clearInterval(interval);
  }, [gameState.turnDeadline, gameState.serverNow, gameState.turnNumber]);

  // Clear pending wall preview when turn changes
  useEffect(() => {
    setPendingWall(null);
    setHoverWall(null);
  }, [gameState.turnNumber, gameState.turnPlayerId]);

  // Keyboard shortcut: press R to toggle Horizontal / Vertical wall mode
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') {
        setToolMode((prev) => (prev === 'WALL_H' ? 'WALL_V' : 'WALL_H'));
        setPendingWall((prev) =>
          prev ? { ...prev, orientation: prev.orientation === 'H' ? 'V' : 'H' } : null
        );
      } else if (e.key === 'm' || e.key === 'M' || e.key === 'Escape') {
        setToolMode('MOVE');
        setPendingWall(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const validMoveSet = useMemo(() => {
    const s = new Set<string>();
    if (!isMyTurn) return s;
    for (const m of gameState.validMovesForTurn) {
      s.add(`${m.r},${m.c}`);
    }
    return s;
  }, [gameState.validMovesForTurn, isMyTurn]);

  const boostPadSet = useMemo(() => {
    const s = new Set<string>();
    for (const b of gameState.boostPads) {
      s.add(`${b.r},${b.c}`);
    }
    return s;
  }, [gameState.boostPads]);

  const activeWallOrientation: WallOrientation = toolMode === 'WALL_V' ? 'V' : 'H';

  const handleIntersectionClick = (r: number, c: number) => {
    if (!isMyTurn || !me || me.wallsLeft <= 0) return;
    const orientation: WallOrientation = toolMode === 'WALL_V' ? 'V' : 'H';
    if (!canPlaceWallClientCheck(r, c, orientation, gameState.walls)) return;

    // On touch/small screens, first tap previews the ghost wall, second tap or Confirm button places it
    const isTouchOrCompact =
      typeof window !== 'undefined' &&
      (window.innerWidth <= 820 || 'ontouchstart' in window);

    if (isTouchOrCompact) {
      if (
        pendingWall &&
        pendingWall.r === r &&
        pendingWall.c === c &&
        pendingWall.orientation === orientation
      ) {
        onPlaceWall(r, c, orientation);
        setPendingWall(null);
      } else {
        setPendingWall({ r, c, orientation });
      }
      return;
    }

    onPlaceWall(r, c, orientation);
  };

  const renderPlayerCard = (p: MatchPlayerState) => {
    const isTurn = gameState.turnPlayerId === p.id;
    const isSelf = p.id === currentPlayerId;

    return (
      <div
        key={p.id}
        className={`wr-player-hud-card ${isTurn ? 'is-turn' : ''} ${isSelf ? 'is-self' : ''}`}
      >
        <div className="wr-player-hud-left">
          <MarblePawn color={p.color} size={30} isTurn={isTurn} label={p.username} />
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span className="wr-player-hud-name">
                {p.username}
                {isSelf ? ' (You)' : ''}
              </span>
              <RankBadge elo={p.elo} title={p.title} isAdmin={p.isAdmin} />
            </div>
            <div className="wr-player-hud-sub">
              <span>{GOAL_LABEL[p.goalEdge]}</span>
              <span>·</span>
              <span>{p.elo} ELO</span>
            </div>
          </div>
        </div>

        <div className="wr-player-hud-right">
          <div className="wr-walls-label">WALLS ({p.wallsLeft}/{maxWalls})</div>
          <div className="wr-walls-pips" aria-label={`${p.wallsLeft} walls remaining`}>
            {Array.from({ length: maxWalls }, (_, idx) => {
              const filled = idx < p.wallsLeft;
              const palette = WALL_COLOR_HEX[p.color] || WALL_COLOR_HEX.neutral;
              return (
                <span
                  key={idx}
                  className="wr-wall-pip"
                  style={{
                    background: filled ? palette.fill : 'var(--border-subtle)',
                    opacity: filled ? 1 : 0.45
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const ghostWall =
    pendingWall ||
    (isMyTurn &&
    (toolMode === 'WALL_H' || toolMode === 'WALL_V') &&
    hoverWall &&
    me &&
    me.wallsLeft > 0
      ? { r: hoverWall.r, c: hoverWall.c, orientation: activeWallOrientation }
      : null);

  const isGhostValid = ghostWall
    ? canPlaceWallClientCheck(ghostWall.r, ghostWall.c, ghostWall.orientation, gameState.walls)
    : false;

  const turnPlayer = gameState.players.find((p) => p.id === gameState.turnPlayerId);

  return (
    <div className="wr-match-shell">
      {/* Top Match Header */}
      <header className="wr-match-header">
        <button
          type="button"
          onClick={onLeaveMatch}
          className="btn-flat"
          style={{ padding: '7px 12px', fontSize: '0.78rem' }}
        >
          <ArrowLeft size={14} />
          <span>Leave Match</span>
        </button>

        <div className="wr-match-header-center">
          <span className="wr-match-title">MARBLE WALLRUSH</span>
          <span className="wr-mode-pill">{MODE_LABELS[gameState.mode]}</span>
        </div>

        <div
          className={`wr-turn-clock ${secondsLeft <= 5 ? 'is-urgent' : ''} ${
            isMyTurn ? 'is-my-turn' : ''
          }`}
        >
          <Clock size={14} />
          <span>
            {isMyTurn ? 'YOUR TURN' : `${turnPlayer?.username || 'Turn'}`} · {secondsLeft}s
          </span>
        </div>
      </header>

      {/* Broadcast / Event Banner */}
      {gameState.broadcastMessage && (
        <div className="wr-broadcast-banner">{gameState.broadcastMessage}</div>
      )}

      {/* Main Board & Player HUD Stage */}
      <div className="wr-stage">
        {/* Players HUD Grid */}
        <div className="wr-players-hud-grid">
          {gameState.players.map((p) => renderPlayerCard(p))}
        </div>

        {/* 9x9 Tactical Grid Board */}
        <div className="wr-board-frame">
          <div className="wr-board-col-labels">
            {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'].map((letter) => (
              <span key={letter}>{letter}</span>
            ))}
          </div>

          <div className="wr-board-middle">
            <div className="wr-board-row-labels">
              {[9, 8, 7, 6, 5, 4, 3, 2, 1].map((num) => (
                <span key={num}>{num}</span>
              ))}
            </div>

            <div
              className="wr-grid-9x9"
              onMouseLeave={() => setHoverWall(null)}
            >
              {/* 81 Grid Cells */}
              {Array.from({ length: 81 }, (_, idx) => {
                const r = Math.floor(idx / 9);
                const c = idx % 9;
                const key = `${r},${c}`;
                const isValidMove = validMoveSet.has(key);
                const isBoostPad = boostPadSet.has(key);
                const occupant = gameState.players.find(
                  (p) => p.pos.r === r && p.pos.c === c
                );
                const isLastMoveTo =
                  gameState.lastTurn?.to?.r === r && gameState.lastTurn?.to?.c === c;

                return (
                  <button
                    key={key}
                    type="button"
                    disabled={!isValidMove}
                    onClick={() => {
                      if (isValidMove) {
                        setPendingWall(null);
                        onMovePawn(r, c);
                      }
                    }}
                    className={`wr-cell ${isValidMove ? 'is-valid-move' : ''} ${
                      isBoostPad ? 'is-boost-pad' : ''
                    } ${isLastMoveTo ? 'is-last-dest' : ''} ${
                      r === 0 ? 'is-top-goal' : ''
                    } ${r === 8 ? 'is-bottom-goal' : ''}`}
                    style={{
                      gridRow: r + 1,
                      gridColumn: c + 1
                    }}
                    aria-label={`Cell ${String.fromCharCode(65 + c)}${9 - r}`}
                  >
                    {isBoostPad && !occupant && (
                      <span className="wr-boost-icon" title="Overdrive Boost Pad (+1 tile glide)">
                        <Zap size={14} />
                      </span>
                    )}

                    {occupant && (
                      <MarblePawn
                        color={occupant.color}
                        size={28}
                        isTurn={occupant.id === gameState.turnPlayerId}
                        label={occupant.username}
                      />
                    )}

                    {isValidMove && !occupant && <span className="wr-move-target-dot" />}
                  </button>
                );
              })}

              {/* Committed Walls Layer */}
              {gameState.walls.map((w) => {
                const palette = WALL_COLOR_HEX[w.color] || WALL_COLOR_HEX.neutral;
                const topPct = ((w.r + 1) / 9) * 100;
                const leftPct = ((w.c + 1) / 9) * 100;
                const spanPct = (2 / 9) * 100;

                return (
                  <div
                    key={w.id}
                    className={`wr-placed-wall ${
                      w.orientation === 'H' ? 'is-horizontal' : 'is-vertical'
                    }`}
                    style={
                      w.orientation === 'H'
                        ? {
                            top: `calc(${topPct}% - 4px)`,
                            left: `calc(${(w.c / 9) * 100}% + 3px)`,
                            width: `calc(${spanPct}% - 6px)`,
                            height: '8px',
                            background: palette.fill,
                            borderColor: palette.border
                          }
                        : {
                            left: `calc(${leftPct}% - 4px)`,
                            top: `calc(${(w.r / 9) * 100}% + 3px)`,
                            height: `calc(${spanPct}% - 6px)`,
                            width: '8px',
                            background: palette.fill,
                            borderColor: palette.border
                          }
                    }
                    title={
                      typeof w.turnsLeft === 'number'
                        ? `Phased Wall (${Math.ceil(w.turnsLeft / gameState.players.length)} rounds remaining)`
                        : 'Wall Barrier'
                    }
                  />
                );
              })}

              {/* Ghost Wall Preview Layer */}
              {ghostWall && (
                <div
                  className={`wr-placed-wall is-ghost ${
                    isGhostValid ? 'is-valid' : 'is-invalid'
                  }`}
                  style={
                    ghostWall.orientation === 'H'
                      ? {
                          top: `calc(${((ghostWall.r + 1) / 9) * 100}% - 4px)`,
                          left: `calc(${(ghostWall.c / 9) * 100}% + 3px)`,
                          width: `calc(${(2 / 9) * 100}% - 6px)`,
                          height: '8px'
                        }
                      : {
                          left: `calc(${((ghostWall.c + 1) / 9) * 100}% - 4px)`,
                          top: `calc(${(ghostWall.r / 9) * 100}% + 3px)`,
                          height: `calc(${(2 / 9) * 100}% - 6px)`,
                          width: '8px'
                        }
                  }
                />
              )}

              {/* 8x8 Interactive Wall Intersection Hotspots (active when placing a wall on your turn) */}
              {isMyTurn &&
                (toolMode === 'WALL_H' || toolMode === 'WALL_V') &&
                me &&
                me.wallsLeft > 0 &&
                Array.from({ length: 64 }, (_, wIdx) => {
                  const wr = Math.floor(wIdx / 8);
                  const wc = wIdx % 8;
                  const topPct = ((wr + 1) / 9) * 100;
                  const leftPct = ((wc + 1) / 9) * 100;
                  const isSelected =
                    pendingWall?.r === wr && pendingWall?.c === wc;

                  return (
                    <button
                      key={`int-${wr}-${wc}`}
                      type="button"
                      onMouseEnter={() => setHoverWall({ r: wr, c: wc })}
                      onClick={() => handleIntersectionClick(wr, wc)}
                      className={`wr-wall-hotspot ${isSelected ? 'is-selected' : ''}`}
                      style={{
                        top: `${topPct}%`,
                        left: `${leftPct}%`
                      }}
                      aria-label={`Place ${
                        toolMode === 'WALL_H' ? 'horizontal' : 'vertical'
                      } wall at ${String.fromCharCode(65 + wc)}${8 - wr}`}
                    />
                  );
                })}
            </div>
          </div>
        </div>

        {/* Mobile / Touch Pending Wall Confirmation Bar */}
        {pendingWall && isMyTurn && (
          <div className="wr-confirm-wall-bar">
            <span>
              Place {pendingWall.orientation === 'H' ? 'Horizontal' : 'Vertical'} Wall at{' '}
              <strong>
                {String.fromCharCode(65 + pendingWall.c)}
                {8 - pendingWall.r}
              </strong>
              ?
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                type="button"
                onClick={() => {
                  onPlaceWall(pendingWall.r, pendingWall.c, pendingWall.orientation);
                  setPendingWall(null);
                }}
                className="btn-flat btn-primary"
                style={{ padding: '6px 12px', fontSize: '0.78rem' }}
              >
                <Check size={14} />
                <span>Confirm Wall</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  setPendingWall((prev) =>
                    prev
                      ? { ...prev, orientation: prev.orientation === 'H' ? 'V' : 'H' }
                      : null
                  )
                }
                className="btn-flat"
                style={{ padding: '6px 10px', fontSize: '0.78rem' }}
              >
                <RotateCw size={13} />
                <span>Rotate</span>
              </button>
              <button
                type="button"
                onClick={() => setPendingWall(null)}
                className="btn-flat"
                style={{ padding: '6px 10px', fontSize: '0.78rem' }}
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Bottom Action Toolbar (Move Marble vs Place Horizontal / Vertical Wall) */}
        <div className="wr-toolbar">
          <button
            type="button"
            onClick={() => {
              setToolMode('MOVE');
              setPendingWall(null);
            }}
            className={`wr-tool-btn ${toolMode === 'MOVE' ? 'is-active' : ''}`}
          >
            <Footprints size={16} />
            <span>Move Marble</span>
          </button>

          <button
            type="button"
            disabled={!me || me.wallsLeft <= 0}
            onClick={() => {
              setToolMode('WALL_H');
              setPendingWall((prev) => (prev ? { ...prev, orientation: 'H' } : null));
            }}
            className={`wr-tool-btn ${toolMode === 'WALL_H' ? 'is-active' : ''}`}
          >
            <GripHorizontal size={16} />
            <span>Horizontal Wall ({me?.wallsLeft ?? 0})</span>
          </button>

          <button
            type="button"
            disabled={!me || me.wallsLeft <= 0}
            onClick={() => {
              setToolMode('WALL_V');
              setPendingWall((prev) => (prev ? { ...prev, orientation: 'V' } : null));
            }}
            className={`wr-tool-btn ${toolMode === 'WALL_V' ? 'is-active' : ''}`}
          >
            <GripVertical size={16} />
            <span>Vertical Wall ({me?.wallsLeft ?? 0})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
