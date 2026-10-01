import React, { useState } from 'react';
import Crest from './Crest';

export function formatKickoffTime(utcString) {
  if (!utcString) return 'Kickoff TBD';
  try {
    const date = new Date(utcString);
    if (isNaN(date.getTime())) return 'Kickoff TBD';

    const weekday = date.toLocaleDateString(undefined, { weekday: 'short' });
    const month = date.toLocaleDateString(undefined, { month: 'short' });
    const day = date.toLocaleDateString(undefined, { day: 'numeric' });
    const time = date.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    return `${weekday}, ${month} ${day} · ${time}`;
  } catch {
    return 'Kickoff TBD';
  }
}

export default function MatchCard({ match }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const isFinished = match.status === 'finished';
  const isLive = match.status === 'live';
  const isUpcoming = match.status === 'upcoming';
  const hasGoals = Array.isArray(match.goals) && match.goals.length > 0;
  const isClickable = isFinished || isLive;

  const toggleExpand = () => {
    if (isClickable) {
      setIsExpanded((prev) => !prev);
    }
  };

  const handleKeyDown = (e) => {
    if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      setIsExpanded((prev) => !prev);
    }
  };

  return (
    <div
      className={`match-card ${isClickable ? 'clickable' : ''} ${isExpanded ? 'expanded' : ''}`}
      onClick={toggleExpand}
      onKeyDown={handleKeyDown}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      aria-expanded={isClickable ? isExpanded : undefined}
    >
      <div className="match-main-row">
        {/* Home Team */}
        <div className="team home-team">
          <span className="team-name" title={match.home.name}>
            {match.home.short || match.home.name}
          </span>
          <Crest
            src={match.home.crest}
            name={match.home.name}
            shortName={match.home.short}
            size={32}
          />
        </div>

        {/* Center: Score or Kickoff / Status */}
        <div className="match-center">
          {isFinished && (
            <div className="score-box">
              <span className="score-num">{match.homeScore ?? 0}</span>
              <span className="score-sep">-</span>
              <span className="score-num">{match.awayScore ?? 0}</span>
              <span className="status-badge finished-badge">FT</span>
            </div>
          )}

          {isLive && (
            <div className="score-box live-score-box">
              <span className="score-num">{match.homeScore ?? 0}</span>
              <span className="score-sep">-</span>
              <span className="score-num">{match.awayScore ?? 0}</span>
              <span className="status-badge live-badge">
                <span className="pulse-dot"></span> LIVE
              </span>
            </div>
          )}

          {isUpcoming && (
            <div className="upcoming-box">
              <span className="kickoff-time">{formatKickoffTime(match.kickoffUtc)}</span>
              <span className="status-badge upcoming-badge">Upcoming</span>
            </div>
          )}
        </div>

        {/* Away Team */}
        <div className="team away-team">
          <Crest
            src={match.away.crest}
            name={match.away.name}
            shortName={match.away.short}
            size={32}
          />
          <span className="team-name" title={match.away.name}>
            {match.away.short || match.away.name}
          </span>
        </div>

        {/* Expand Chevron Indicator */}
        {isClickable && (
          <div className="expand-indicator" title={isExpanded ? 'Collapse goals' : 'View goals'}>
            <svg
              className={`chevron-icon ${isExpanded ? 'rotated' : ''}`}
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        )}
      </div>

      {/* Expanded Goal Details */}
      {isExpanded && isClickable && (
        <div className="match-details" onClick={(e) => e.stopPropagation()}>
          <div className="details-header">
            <span className="details-title">Match Goals</span>
          </div>

          {!hasGoals ? (
            <div className="no-goals-notice">
              Goal details not available for this match.
            </div>
          ) : (
            <div className="goals-timeline">
              {match.goals.map((goal, idx) => {
                const isHomeGoal = goal.team === 'home';
                return (
                  <div
                    key={idx}
                    className={`goal-item ${isHomeGoal ? 'goal-home' : 'goal-away'}`}
                  >
                    <span className="goal-minute">
                      {goal.minute !== null && goal.minute !== undefined
                        ? `${goal.minute}'`
                        : '•'}
                    </span>
                    <span className="goal-ball-icon" aria-hidden="true">⚽</span>
                    <div className="goal-info">
                      <span className="goal-scorer">{goal.scorer}</span>
                      {goal.penalty && <span className="goal-tag penalty-tag">PEN</span>}
                      {goal.ownGoal && <span className="goal-tag owngoal-tag">OG</span>}
                    </div>
                    <span className="goal-team-label">
                      {isHomeGoal ? match.home.short : match.away.short}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
