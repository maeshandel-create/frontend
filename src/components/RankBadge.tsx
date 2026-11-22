import React from 'react';
import aeonMarbleImg from '../assets/aeon-marble.png';

export const getDisplayTitle = (
  elo?: number,
  title?: string | null,
  earnedTitle?: string | null,
  isAdmin?: boolean
): string | null => {
  const custom = (title || earnedTitle || '').trim();
  if (custom.toUpperCase() === 'AEON') return 'AEON';
  if (isAdmin) return 'The Game Master';
  if (custom === 'Godlike') return 'Godlike';
  if (typeof elo === 'number') {
    if (elo >= 3800) return 'Grandmaster';
    if (elo >= 2800) return 'Master';
    if (elo >= 1800) return 'Expert';
  }
  return custom || null;
};

export const getTitleBadgeClass = (displayTitle: string, isAdmin?: boolean): string => {
  if (displayTitle.trim().toUpperCase() === 'AEON') return 'title-aeon';
  if (isAdmin || displayTitle === 'The Game Master') return 'title-gamemaster';
  if (displayTitle === 'Godlike') return 'title-godlike';
  if (displayTitle === 'Grandmaster') return 'title-grandmaster';
  if (displayTitle === 'Master') return 'title-master';
  return 'title-expert';
};

interface RankBadgeProps {
  elo?: number;
  title?: string | null;
  earnedTitle?: string | null;
  isAdmin?: boolean;
  starSize?: number;
  style?: React.CSSProperties;
}

export const RankBadge: React.FC<RankBadgeProps> = ({
  elo,
  title,
  earnedTitle,
  isAdmin,
  starSize = 11,
  style
}) => {
  const displayTitle = getDisplayTitle(elo, title, earnedTitle, isAdmin);
  if (!displayTitle) return null;

  const badgeClass = getTitleBadgeClass(displayTitle, isAdmin);
  const isAeon = displayTitle.trim().toUpperCase() === 'AEON';
  const orbSize = Math.max(13, starSize + 2);

  return (
    <span className={`badge-title ${badgeClass}`} style={style}>
      {isAeon && (
        <img
          src={aeonMarbleImg}
          alt=""
          aria-hidden="true"
          width={orbSize}
          height={orbSize}
          className="aeon-marble-icon"
          style={{ width: orbSize, height: orbSize }}
        />
      )}
      <span>{displayTitle}</span>
    </span>
  );
};
