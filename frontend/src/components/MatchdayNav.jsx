import React from 'react';

export default function MatchdayNav({
  matchday,
  label,
  totalMatchdays = 38,
  onChangeMatchday,
  isLoading,
}) {
  const canGoPrev = matchday > 1;
  const canGoNext = matchday < totalMatchdays;

  return (
    <div className="matchday-nav">
      <button
        type="button"
        className="nav-btn prev-btn"
        disabled={!canGoPrev || isLoading}
        onClick={() => onChangeMatchday(matchday - 1)}
        aria-label="Previous matchday"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        <span>Previous</span>
      </button>

      <div className="matchday-title-container">
        <span className="matchday-headline">Matchday {matchday}</span>
        {label && label !== `Matchday ${matchday}` && (
          <span className="matchday-sublabel">{label}</span>
        )}
      </div>

      <button
        type="button"
        className="nav-btn next-btn"
        disabled={!canGoNext || isLoading}
        onClick={() => onChangeMatchday(matchday + 1)}
        aria-label="Next matchday"
      >
        <span>Next</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </div>
  );
}
