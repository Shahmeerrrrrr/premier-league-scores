import React, { useState } from 'react';

export function getTeamInitials(name, shortName) {
  const candidate = shortName || name || 'FC';
  const clean = candidate.replace(/^(FC|AFC)\s+/i, '').replace(/\s+(FC|AFC)$/i, '').trim();
  const words = clean.split(/[\s'-]+/).filter(Boolean);
  if (words.length >= 2) {
    return words.slice(0, 3).map(w => w[0]).join('').toUpperCase();
  }
  return clean.slice(0, 3).toUpperCase();
}

export default function Crest({ src, name, shortName, size = 28 }) {
  const [hasError, setHasError] = useState(false);
  const initials = getTeamInitials(name, shortName);

  if (!src || hasError) {
    return (
      <div
        className="crest-fallback"
        style={{ width: size, height: size, fontSize: Math.max(10, Math.floor(size * 0.38)) }}
        title={name}
        aria-label={name}
      >
        {initials}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name || 'Team crest'}
      className="crest-img"
      style={{ width: size, height: size }}
      loading="lazy"
      onError={() => setHasError(true)}
    />
  );
}
