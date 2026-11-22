import React from 'react';
import type { MarblePalette } from '../types/game.js';

const PALETTE_TOKENS: Record<
  MarblePalette,
  { base: string; edge: string; spec: string; ring: string }
> = {
  neutral: {
    base: 'radial-gradient(circle at 32% 28%, #D4D4D8 0%, #71717A 62%, #3F3F46 100%)',
    edge: '#52525B',
    spec: 'rgba(255, 255, 255, 0.55)',
    ring: 'rgba(161, 161, 170, 0.35)'
  },
  crimson: {
    base: 'radial-gradient(circle at 32% 28%, #FCA5A5 0%, #EF4444 52%, #991B1B 100%)',
    edge: '#F87171',
    spec: 'rgba(255, 255, 255, 0.78)',
    ring: 'rgba(239, 68, 68, 0.45)'
  },
  sapphire: {
    base: 'radial-gradient(circle at 32% 28%, #93C5FD 0%, #3B82F6 52%, #1D4ED8 100%)',
    edge: '#60A5FA',
    spec: 'rgba(255, 255, 255, 0.78)',
    ring: 'rgba(59, 130, 246, 0.45)'
  },
  emerald: {
    base: 'radial-gradient(circle at 32% 28%, #6EE7B7 0%, #10B981 52%, #047857 100%)',
    edge: '#34D399',
    spec: 'rgba(255, 255, 255, 0.78)',
    ring: 'rgba(16, 185, 129, 0.45)'
  },
  amber: {
    base: 'radial-gradient(circle at 32% 28%, #FDE68A 0%, #F59E0B 52%, #B45309 100%)',
    edge: '#FBBF24',
    spec: 'rgba(255, 255, 255, 0.78)',
    ring: 'rgba(245, 158, 11, 0.45)'
  }
};

interface MarblePawnProps {
  color: MarblePalette;
  size?: number;
  isTurn?: boolean;
  label?: string;
}

export const MarblePawn: React.FC<MarblePawnProps> = ({
  color,
  size = 28,
  isTurn = false,
  label
}) => {
  const tokens = PALETTE_TOKENS[color] || PALETTE_TOKENS.neutral;
  const specSize = Math.max(5, Math.round(size * 0.24));

  return (
    <span
      className={`marble-pawn ${isTurn ? 'is-active-turn' : ''}`}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: tokens.base,
        border: `1.5px solid ${tokens.edge}`,
        boxShadow: isTurn
          ? `0 0 0 3px ${tokens.ring}, 0 4px 10px rgba(0, 0, 0, 0.35)`
          : '0 2px 6px rgba(0, 0, 0, 0.28)',
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        transition: 'transform 0.18s ease, box-shadow 0.18s ease'
      }}
      title={label}
    >
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: Math.round(size * 0.16),
          left: Math.round(size * 0.2),
          width: specSize,
          height: specSize,
          borderRadius: '50%',
          background: tokens.spec,
          pointerEvents: 'none'
        }}
      />
    </span>
  );
};
