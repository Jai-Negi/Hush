import { useState } from 'react';
import { planRoutes } from './api';
import { RouteCard } from './components/RouteCard';
import { Legend } from './components/Legend';

// Fixed demo pair for now — AC1.2.1 (search, on the other branch) replaces
// this with real input.
const DEMO_FROM = { label: 'Melbourne Central Station', lat: -37.8100, lon: 144.9628 };
const DEMO_TO = { label: 'Flinders Lane', lat: -37.8167, lon: 144.9655 };

// Calibrated against real Melbourne CBD peak-hour data — see
// backend/scripts/calibrate_threshold.py. 100 (the original discovery-deck
// default) meant almost every route always showed LOW; 45 is the actual
// 75th percentile of real route averages at peak.
const DEFAULT_THRESHOLD = 45;

export default function App() {
  const [threshold] = useState(DEFAULT_THRESHOLD);
  const [result, setResult] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function findRoutes() {
    setError(null);
    setLoading(true);
    try {
      const res = await planRoutes(DEMO_FROM, DEMO_TO);
      setResult(res);
      setSelectedId(res.routes[0]?.id ?? null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const hasRoutes = result && result.routes.length > 0;

  return (
    <div className="app">
      <header className="app-header">
        <span className="logo">hush</span>
      </header>
      <main className="layout">
        <section className="card" aria-label="Plan a trip">
          <h1>Plan your trip</h1>
          <p className="field-note">
            {DEMO_FROM.label} → {DEMO_TO.label} — fixed for now, real search
            arrives with AC1.2.1
          </p>
          <button type="button" className="button" onClick={findRoutes} disabled={loading}>
            {loading ? 'Finding calmer routes…' : 'Find calmer routes'}
          </button>
        </section>

        {error ? (
          <div className="notice" role="alert">
            <p>{error}</p>
          </div>
        ) : null}

        {hasRoutes ? (
          <section className="card" aria-label="Route results">
            <h2>
              Your routes — {result.routes.length}{' '}
              {result.routes.length === 1 ? 'option' : 'options'}
            </h2>
            <p className="field-note">
              Sorted by arrival. All routes are shown — none are hidden from you.
            </p>
            {result.routes.map((r) => (
              <RouteCard
                key={r.id}
                route={r}
                threshold={threshold}
                selected={selectedId === r.id}
                onSelect={() => setSelectedId(r.id)}
              />
            ))}
          </section>
        ) : null}

        {hasRoutes ? <Legend threshold={threshold} /> : null}
      </main>
    </div>
  );
}
