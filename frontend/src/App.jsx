import { useEffect, useState } from 'react';
import { PlaceField } from './components/PlaceField';

export default function App() {
  const [from, setFrom] = useState(null);
  const [to, setTo] = useState(null);
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

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <span className="logo">hush</span>
          <span className="logo-sub">Sensory-aware wayfinding · Melbourne CBD</span>
        </div>
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

            {from && to ? (
              <p className="field-note" role="status">
                From {from.label} to {to.label}. Route finding comes next.
              </p>
            ) : null}
          </section>

          {error ? (
            <div className="notice" role="alert">
              <p>{error}</p>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
