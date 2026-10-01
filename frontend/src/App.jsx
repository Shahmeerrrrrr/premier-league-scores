import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchCurrentMatchday,
  fetchMatches,
  fetchTable,
} from './api';
import MatchdayNav from './components/MatchdayNav';
import MatchCard from './components/MatchCard';
import StandingsTable from './components/StandingsTable';
import { HugeiconsIcon } from '@hugeicons/react';
import { ThreeDRotateIcon } from '@hugeicons/core-free-icons';

export default function App() {
  const [currentView, setCurrentView] = useState('matches'); // 'matches' | 'table'
  const [matchday, setMatchday] = useState(null);
  const [matchdayLabel, setMatchdayLabel] = useState('');
  const [matches, setMatches] = useState([]);
  const [table, setTable] = useState([]);

  const [loadingMatches, setLoadingMatches] = useState(true);
  const [loadingTable, setLoadingTable] = useState(false);
  const [matchesError, setMatchesError] = useState(null);
  const [tableError, setTableError] = useState(null);

  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Initial load: fetch current matchday
  useEffect(() => {
    let isMounted = true;
    async function initCurrentMatchday() {
      try {
        const data = await fetchCurrentMatchday();
        if (isMounted) {
          setMatchday(data.matchday);
          setMatchdayLabel(data.label);
        }
      } catch (err) {
        if (isMounted) {
          // Fallback to matchday 1 if current group lookup fails
          setMatchday(1);
          setMatchdayLabel('Matchday 1');
        }
      }
    }
    initCurrentMatchday();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch matches for the selected matchday
  const loadMatches = useCallback(
    async (mDay, isBackground = false) => {
      if (!mDay) return;
      if (!isBackground) {
        setLoadingMatches(true);
        setMatchesError(null);
      } else {
        setIsRefreshing(true);
      }

      try {
        const data = await fetchMatches(mDay);
        setMatches(data);
        setLastRefreshed(new Date());
        setMatchesError(null);
      } catch (err) {
        if (!isBackground) {
          setMatchesError(err.message || 'Unable to load matches. Please try again.');
        }
      } finally {
        if (!isBackground) {
          setLoadingMatches(false);
        } else {
          setIsRefreshing(false);
        }
      }
    },
    []
  );

  // When matchday changes, fetch matches
  useEffect(() => {
    if (matchday !== null && currentView === 'matches') {
      loadMatches(matchday);
    }
  }, [matchday, currentView, loadMatches]);

  // 60-second polling interval for matches view
  useEffect(() => {
    if (currentView !== 'matches' || matchday === null) {
      return;
    }

    const intervalId = setInterval(() => {
      loadMatches(matchday, true);
    }, 60000);

    return () => {
      clearInterval(intervalId);
    };
  }, [currentView, matchday, loadMatches]);

  // Load standings table
  const loadTable = useCallback(async () => {
    setLoadingTable(true);
    setTableError(null);
    try {
      const data = await fetchTable();
      setTable(data);
      setTableError(null);
    } catch (err) {
      setTableError(err.message || 'Unable to load league table. Please try again.');
    } finally {
      setLoadingTable(false);
    }
  }, []);

  // When switching to table view, load table if empty
  useEffect(() => {
    if (currentView === 'table' && table.length === 0) {
      loadTable();
    }
  }, [currentView, table.length, loadTable]);

  // Manual refresh handler
  const handleManualRefresh = () => {
    if (currentView === 'matches' && matchday !== null) {
      loadMatches(matchday, true);
    } else if (currentView === 'table') {
      loadTable();
    }
  };

  const handleMatchdayChange = (newMatchday) => {
    if (newMatchday >= 1 && newMatchday <= 38) {
      setMatchday(newMatchday);
      setMatchdayLabel(`Matchday ${newMatchday}`);
    }
  };

  return (
    <div className="app-container">
      {/* Top Header */}
      <header className="app-header">
        <div className="header-inner">
          <div className="brand-group">
            <div className="brand-icon" title="Premier League Scores">
              <span className="brand-ball">
                <HugeiconsIcon
                  icon={ThreeDRotateIcon}
                  size={26}
                  color="currentColor"
                  strokeWidth={1.75}
                />
              </span>
            </div>
            <div>
              <h1 className="brand-title">Premier League Scores</h1>
              <p className="brand-subtitle">English Premier League Hub</p>
            </div>
          </div>

          {/* View Switcher Tabs */}
          <nav className="view-nav" aria-label="Views">
            <button
              type="button"
              className={`nav-tab ${currentView === 'matches' ? 'active' : ''}`}
              onClick={() => setCurrentView('matches')}
            >
              Fixtures & Scores
            </button>
            <button
              type="button"
              className={`nav-tab ${currentView === 'table' ? 'active' : ''}`}
              onClick={() => setCurrentView('table')}
            >
              Standings
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="main-content">
        {/* Controls Bar */}
        <section className="controls-bar">
          {currentView === 'matches' && matchday !== null && (
            <MatchdayNav
              matchday={matchday}
              label={matchdayLabel}
              onChangeMatchday={handleMatchdayChange}
              isLoading={loadingMatches}
            />
          )}

          <div className="status-refresh-group">
            {currentView === 'matches' && (
              <span className="auto-refresh-tag" title="Auto-refreshes every 60 seconds">
                <span className="pulse-indicator"></span> Auto-refreshes 60s
              </span>
            )}
            <button
              type="button"
              className="refresh-btn"
              onClick={handleManualRefresh}
              disabled={isRefreshing || loadingMatches || loadingTable}
              title="Refresh data"
            >
              <svg
                className={`refresh-icon ${isRefreshing ? 'spinning' : ''}`}
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
              </svg>
              <span>Refresh</span>
            </button>
          </div>
        </section>

        {/* View 1: Matches */}
        {currentView === 'matches' && (
          <section className="view-section matches-section">
            {loadingMatches ? (
              <div className="skeleton-list">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="match-card-skeleton">
                    <div className="skeleton-line line-team"></div>
                    <div className="skeleton-line line-score"></div>
                    <div className="skeleton-line line-team"></div>
                  </div>
                ))}
              </div>
            ) : matchesError ? (
              <div className="state-card error-card">
                <div className="state-icon">⚠️</div>
                <h2 className="state-heading">Unable to Load Matches</h2>
                <p className="state-message">{matchesError}</p>
                <button
                  type="button"
                  className="retry-btn"
                  onClick={() => loadMatches(matchday)}
                >
                  Try Again
                </button>
              </div>
            ) : matches.length === 0 ? (
              <div className="state-card empty-card">
                <div className="state-icon">📅</div>
                <h2 className="state-heading">No Matches Scheduled</h2>
                <p className="state-message">No matches scheduled for this matchday.</p>
              </div>
            ) : (
              <div className="matches-grid">
                {matches.map((match) => (
                  <MatchCard key={match.id} match={match} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* View 2: Standings Table */}
        {currentView === 'table' && (
          <section className="view-section table-section">
            {loadingTable ? (
              <div className="table-skeleton">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="skeleton-row"></div>
                ))}
              </div>
            ) : tableError ? (
              <div className="state-card error-card">
                <div className="state-icon">⚠️</div>
                <h2 className="state-heading">Unable to Load Standings</h2>
                <p className="state-message">{tableError}</p>
                <button
                  type="button"
                  className="retry-btn"
                  onClick={loadTable}
                >
                  Try Again
                </button>
              </div>
            ) : table.length === 0 ? (
              <div className="state-card empty-card">
                <div className="state-icon">📋</div>
                <h2 className="state-heading">No Standings Available</h2>
                <p className="state-message">League standings data is currently unavailable.</p>
              </div>
            ) : (
              <StandingsTable table={table} />
            )}
          </section>
        )}
      </main>

      {/* Footer with honest source credit and Arsenal pride */}
      <footer className="app-footer">
        <p>
          Data provided by{' '}
          <a
            href="https://www.openligadb.de"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link"
          >
            OpenLigaDB
          </a>
          . Live match status is derived from scheduled kickoff times. <br />This is made by an <span className="footer-arsenal">Arsenal</span> fan who is a proud <span className="footer-highlight">Gooner</span> and always <span className="footer-highlight">COYG!</span>
        </p>
      </footer>
    </div>
  );
}
