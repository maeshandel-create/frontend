import React from 'react';
import { Trophy, ShieldAlert, ArrowUpRight, ArrowDownRight, X } from 'lucide-react';
import type { PersonalMatchResult } from '../types/game.js';

interface EloResultModalProps {
  data: PersonalMatchResult | null;
  onClose: () => void;
}

export const EloResultModal: React.FC<EloResultModalProps> = ({ data, onClose }) => {
  if (!data) return null;

  const isPositive = data.eloChange >= 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        style={{ maxWidth: 400, textAlign: 'center' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            className="btn-flat"
            style={{ padding: 6 }}
            aria-label="Close result modal"
          >
            <X size={15} />
          </button>
        </div>

        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            margin: '0 auto 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: data.isAborted
              ? '#F4F4F5'
              : data.won
                ? '#ECFDF5'
                : '#FEF2F2',
            border: `1px solid ${
              data.isAborted ? '#D4D4D8' : data.won ? '#A7F3D0' : '#FECACA'
            }`,
            color: data.isAborted ? '#52525B' : data.won ? '#059669' : '#DC2626'
          }}
        >
          {data.isAborted ? <ShieldAlert size={24} /> : <Trophy size={24} />}
        </div>

        <h2 style={{ fontSize: '1.25rem', fontWeight: 900, letterSpacing: '0.06em' }}>
          {data.isAborted
            ? 'MATCH ABORTED'
            : data.won
              ? 'VICTORY'
              : `PLACEMENT #${data.placement}`}
        </h2>

        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 4 }}>
          {data.isAborted
            ? data.reason || 'Match ended with no ELO adjustment.'
            : data.won
              ? 'You reached the goal baseline first!'
              : `${data.winnerUsername || 'Opponent'} reached the goal line first.`}
        </p>

        {!data.isAborted && (
          <div
            style={{
              marginTop: 18,
              padding: '14px 16px',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--bg-app)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                WALLRUSH RATING
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '1.25rem',
                  fontWeight: 900,
                  color: 'var(--text-primary)'
                }}
              >
                {data.newElo} ELO
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                Previous: {data.previousElo}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                  padding: '5px 10px',
                  borderRadius: 9999,
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.88rem',
                  fontWeight: 800,
                  background: isPositive ? '#ECFDF5' : '#FEF2F2',
                  color: isPositive ? '#047857' : '#B91C1C',
                  border: `1px solid ${isPositive ? '#A7F3D0' : '#FECACA'}`
                }}
              >
                {isPositive ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
                {isPositive ? `+${data.eloChange}` : data.eloChange}
              </span>
              {data.isQueueMatch && data.won && (
                <div
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    color: '#059669',
                    marginTop: 4
                  }}
                >
                  {data.queueBonusMultiplier}x Queue Bonus
                </div>
              )}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="btn-flat btn-primary"
          style={{ width: '100%', marginTop: 18, padding: '10px 16px' }}
        >
          Continue
        </button>
      </div>
    </div>
  );
};
