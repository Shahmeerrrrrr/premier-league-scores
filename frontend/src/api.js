const API_BASE =
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' && window.location.hostname === 'localhost' && window.location.port === '5173'
    ? 'http://localhost:8000'
    : '');

/**
 * Handle API responses and extract error details
 */
async function request(endpoint) {
  const url = `${API_BASE}${endpoint}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      let message = 'The soccer data service is unavailable right now. Try again in a minute.';
      try {
        const errorData = await res.json();
        if (errorData && errorData.detail) {
          message = errorData.detail;
        }
      } catch {
        // Fall back to default message if body isn't JSON
      }
      throw new Error(message);
    }
    return await res.json();
  } catch (err) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      throw new Error('Unable to connect to the backend server. Please make sure the backend is running.');
    }
    throw err;
  }
}

export async function fetchHealth() {
  return request('/api/health');
}

export async function fetchCurrentMatchday() {
  return request('/api/current-matchday');
}

export async function fetchMatches(matchday, season) {
  const params = new URLSearchParams();
  if (matchday !== undefined && matchday !== null) {
    params.set('matchday', matchday);
  }
  if (season !== undefined && season !== null) {
    params.set('season', season);
  }
  return request(`/api/matches?${params.toString()}`);
}

export async function fetchTable(season) {
  const params = new URLSearchParams();
  if (season !== undefined && season !== null) {
    params.set('season', season);
  }
  const queryString = params.toString();
  return request(`/api/table${queryString ? `?${queryString}` : ''}`);
}
