import React from 'react';
import Crest from './Crest';

export default function StandingsTable({ table = [], isLoading }) {
  const getZoneClass = (position, totalTeams) => {
    if (position >= 1 && position <= 4) return 'zone-champions-league';
    if (position === 5) return 'zone-europa-league';
    if (position > totalTeams - 3) return 'zone-relegation';
    return '';
  };

  const totalTeams = table.length || 20;

  return (
    <div className="standings-container">
      <div className="table-responsive">
        <table className="standings-table">
          <thead>
            <tr>
              <th className="th-pos" title="Position">#</th>
              <th className="th-team">Club</th>
              <th className="th-num" title="Matches Played">P</th>
              <th className="th-num" title="Matches Won">W</th>
              <th className="th-num" title="Matches Drawn">D</th>
              <th className="th-num" title="Matches Lost">L</th>
              <th className="th-num hide-mobile" title="Goals For">GF</th>
              <th className="th-num hide-mobile" title="Goals Against">GA</th>
              <th className="th-num" title="Goal Difference">GD</th>
              <th className="th-pts" title="Total Points">Pts</th>
            </tr>
          </thead>
          <tbody>
            {table.map((row) => {
              const zoneClass = getZoneClass(row.position, totalTeams);
              const gdFormatted = row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff;

              return (
                <tr key={row.position} className={`table-row ${zoneClass}`}>
                  <td className="td-pos">
                    <span className="pos-badge">{row.position}</span>
                  </td>
                  <td className="td-team">
                    <div className="team-cell">
                      <Crest
                        src={row.crest}
                        name={row.name}
                        shortName={row.short}
                        size={24}
                      />
                      <span className="team-full-name">{row.name}</span>
                      <span className="team-short-name">{row.short || row.name}</span>
                    </div>
                  </td>
                  <td className="td-num">{row.played}</td>
                  <td className="td-num">{row.won}</td>
                  <td className="td-num">{row.drawn}</td>
                  <td className="td-num">{row.lost}</td>
                  <td className="td-num hide-mobile">{row.goalsFor}</td>
                  <td className="td-num hide-mobile">{row.goalsAgainst}</td>
                  <td className="td-num td-gd">{gdFormatted}</td>
                  <td className="td-pts">
                    <strong>{row.points}</strong>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Standings Legend */}
      <div className="standings-legend">
        <div className="legend-item">
          <span className="legend-indicator ucl-indicator"></span>
          <span className="legend-text">Top 4: UEFA Champions League</span>
        </div>
        <div className="legend-item">
          <span className="legend-indicator uel-indicator"></span>
          <span className="legend-text">5th: UEFA Europa League</span>
        </div>
        <div className="legend-item">
          <span className="legend-indicator rel-indicator"></span>
          <span className="legend-text">Bottom 3: Relegation to Championship</span>
        </div>
      </div>
    </div>
  );
}
