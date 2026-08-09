import { useEffect, useState } from 'react';
import { planRoutes } from './api';
import { RouteCard } from './components/RouteCard';
import { Legend } from './components/Legend';
import { MapView } from './components/MapView';
import { PlaceField } from './components/PlaceField';
import { ThresholdControl } from './components/ThresholdControl';
import { useLocalStorage } from './hooks/useLocalStorage';

// Calibrated against real Melbourne CBD peak-hour data — see
// backend/scripts/calibrate_threshold.py. 100 (the original discovery-deck
// default) meant almost every route always showed LOW; 45 is the actual
// 75th percentile of real route averages at peak.
const DEFAULT_THRESHOLD = 45;

export default function App() {
  const [threshold, setThreshold] = useLocalStorage('hush-threshold', DEFAULT_THRESHOLD);
  const [favourites, setFavourites] = useLocalStorage('hush-favourites', []);
  const [from, setFrom] = useState(null);
  const [to, setTo] = useState(null);
  const [result, setResult] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // AC1.2.1: default From to current location when GPS is available on open.
  // Failures stay silent here — the user can still type a place or tap the button.
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setFrom({
          label: 'Current location',
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        }),
      () => {},
      { timeout: 8000 },
    );
  }, []);

  function applyCurrentLocation() {
    setError(null);
    if (!navigator.geolocation) {
      setError('This browser cannot share your location. Type a place instead.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setFrom({
          label: 'Current location',
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        }),
      () =>
        setError(
          'We could not read your location. Nothing is wrong — just type a starting place instead.',
        ),
      { timeout: 8000 },
    );
  }

  // AC1.2.5: favourites stay on this device only — no login.
  function saveFavourite(place) {
    if (!place) return;
    setFavourites((prev) =>
      prev.some((p) => p.label === place.label) ? prev : [...prev, place].slice(-8),
    );
  }

  function removeFavourite(label) {
    setFavourites((prev) => prev.filter((p) => p.label !== label));
  }

  async function findRoutes() {
    setError(null);
    if (!from || !to) {
      setError('Choose both a starting place and a destination from the suggestions.');
      return;
    }
    setLoading(true);
    try {
      const res = await planRoutes(from, to);
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
        <div>
          <span className="logo">hush</span>
          <span className="logo-sub">Sensory-aware wayfinding · Melbourne CBD</span>
        </div>
        <ThresholdControl threshold={threshold} onChange={setThreshold} />
      </header>

      <main className="layout">
        <div className="layout__panel">
          <section className="card" aria-label="Plan a trip">
            <h1>Plan your trip</h1>
            <p className="field-note">
              Search for a start and destination in central Melbourne. Your start
              defaults to your current location when GPS is available.
            </p>
            <PlaceField
              id="from"
              label="From"
              value={from}
              onSelect={setFrom}
              onUseCurrentLocation={applyCurrentLocation}
              tag={from?.label === 'Current location' ? 'Current location' : null}
            />
            <PlaceField id="to" label="To" value={to} onSelect={setTo} />

            {favourites.length > 0 ? (
              <div className="favourites">
                <p className="field-note">Saved places (kept on this device):</p>
                <ul>
                  {favourites.map((p) => (
                    <li key={p.label}>
                      <button
                        type="button"
                        className="chip"
                        onClick={() => (from ? setTo(p) : setFrom(p))}
                        title={from ? 'Use as destination' : 'Use as start'}
                      >
                        {p.label}
                      </button>
                      <button
                        type="button"
                        className="chip chip--remove"
                        aria-label={`Remove ${p.label} from saved places`}
                        onClick={() => removeFavourite(p.label)}
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <button type="button" className="button" onClick={findRoutes} disabled={loading}>
              {loading ? 'Finding calmer routes…' : 'Find calmer routes'}
            </button>

            {to ? (
              <button
                type="button"
                className="link-button"
                onClick={() => saveFavourite(to)}
              >
                Save “{to.label}” to this device
              </button>
            ) : null}
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
        </div>

        <div className="layout__map">
          <MapView
            routes={result?.routes}
            threshold={threshold}
            selectedId={selectedId}
            onSelect={setSelectedId}
            from={from}
            to={to}
          />
        </div>
      </main>
    </div>
  );
}
