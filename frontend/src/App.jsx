import { useEffect, useState } from 'react';
import { getRefuges, getStatus, planRoutes } from './api';
import { RouteCard } from './components/RouteCard';
import { Legend } from './components/Legend';
import { MapView } from './components/MapView';
import { PlaceField } from './components/PlaceField';
import { ThresholdControl } from './components/ThresholdControl';
import { StatusBar } from './components/StatusBar';
import { RefugePanel } from './components/RefugePanel';
import { Home } from './components/Home';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useLiveLocation } from './hooks/useLiveLocation';
import { haversineM } from './geo';

// Calibrated against real Melbourne CBD peak-hour data — see
// backend/scripts/calibrate_threshold.py. 100 (the original discovery-deck
// default) meant almost every route always showed LOW; 45 is the actual
// 75th percentile of real route averages at peak.
const DEFAULT_THRESHOLD = 45;

const DEFAULT_REFUGE_POINT = { lat: -37.8136, lon: 144.9646, label: 'central Melbourne' };

// How close the device's live position must be to a route's start before
// "Start" begins turn-by-turn-style following. Generous enough to absorb
// ordinary GPS drift in a dense CBD, tight enough to catch "not there yet".
const JOURNEY_START_RADIUS_M = 150;

export default function App() {
  // Landing screen first, always — 'home' | 'plan' | 'refuge'. Every screen
  // leads back here rather than piling more onto one long page.
  const [screen, setScreen] = useState('home');
  const [threshold, setThreshold] = useLocalStorage('hush-threshold', DEFAULT_THRESHOLD);
  const [favourites, setFavourites] = useLocalStorage('hush-favourites', []);
  const [from, setFrom] = useState(null);
  const [to, setTo] = useState(null);
  const [result, setResult] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null);
  const liveLocation = useLiveLocation();
  const [journeyRouteId, setJourneyRouteId] = useState(null);
  const [pendingJourneyRoute, setPendingJourneyRoute] = useState(null);
  const [journeyNotice, setJourneyNotice] = useState(null);
  const [refuges, setRefuges] = useState(null);
  const [refugeOrigin, setRefugeOrigin] = useState(null);
  const [refugeLoading, setRefugeLoading] = useState(false);
  const [refugeNote, setRefugeNote] = useState(null);

  useEffect(() => {
    getStatus()
      .then((s) => setStatus({ source: s.data_source, age_min: s.data_age_min }))
      .catch(() => {});
  }, []);

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

  async function planTrip(fromPlace, toPlace) {
    setError(null);
    if (!fromPlace || !toPlace) {
      setError('Choose both a starting place and a destination from the suggestions.');
      return;
    }
    setLoading(true);
    stopJourney();
    try {
      const res = await planRoutes(fromPlace, toPlace);
      setResult(res);
      setSelectedId(res.routes[0]?.id ?? null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function findRoutes() {
    planTrip(from, to);
  }

  // "Take me there" from the refuge list/map: reuses whichever point the
  // refuge search was made from as the route's start, so the user isn't
  // asked to fill in the trip planner again for a place they already found.
  function planRouteTo(destPlace) {
    const start = refugeOrigin || from;
    if (!start) {
      setError('We need a starting point first — use "Use my current location" above.');
      return;
    }
    setFrom(start);
    setTo(destPlace);
    setScreen('plan');
    planTrip(start, destPlace);
  }

  function toggleLiveLocation() {
    if (liveLocation.tracking) {
      liveLocation.stop();
    } else {
      liveLocation.start();
    }
  }

  // "Start": begin following the device's live position, but only once we
  // can confirm the device is actually near this route's starting point —
  // otherwise "following" would just snap the map to wherever the device
  // really is, nowhere near the planned trip.
  function startJourney(route) {
    setJourneyNotice(null);
    setPendingJourneyRoute(route);
    if (!liveLocation.tracking) liveLocation.start();
  }

  function stopJourney() {
    setJourneyRouteId(null);
    setPendingJourneyRoute(null);
    setJourneyNotice(null);
  }

  useEffect(() => {
    if (!pendingJourneyRoute) return;
    if (liveLocation.error) {
      setJourneyNotice(liveLocation.error);
      setPendingJourneyRoute(null);
      return;
    }
    if (!liveLocation.position) return;

    const [startLon, startLat] = pendingJourneyRoute.geometry.coordinates[0];
    const distance = haversineM(
      liveLocation.position.lat,
      liveLocation.position.lon,
      startLat,
      startLon,
    );
    if (distance <= JOURNEY_START_RADIUS_M) {
      setJourneyRouteId(pendingJourneyRoute.id);
      setJourneyNotice(null);
    } else {
      setJourneyRouteId(null);
      setJourneyNotice(
        `You're about ${Math.round(distance)} m from the start of this route — get there, then tap Start again.`,
      );
    }
    setPendingJourneyRoute(null);
  }, [liveLocation.position, liveLocation.error, pendingJourneyRoute]);

  // Shown automatically on arrival at the refuge screen — no click needed.
  // Lives here, not inside RefugePanel, because the map on that screen needs
  // the same refuges + origin the list does.
  function findNearbyRefuges() {
    setRefugeLoading(true);
    setRefugeNote(null);

    const fetchFor = async (lat, lon, label) => {
      try {
        const { refuges: found } = await getRefuges(lat, lon);
        setRefuges(found);
        setRefugeOrigin({ lat, lon, label: label || 'Current location' });
        if (label) setRefugeNote(`Showing quiet spaces near ${label}.`);
      } catch (err) {
        setRefugeNote(err.message);
      } finally {
        setRefugeLoading(false);
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchFor(pos.coords.latitude, pos.coords.longitude, null),
        () => {
          const p = from || DEFAULT_REFUGE_POINT;
          fetchFor(p.lat, p.lon, p.label || DEFAULT_REFUGE_POINT.label);
        },
        { timeout: 8000 },
      );
    } else {
      const p = from || DEFAULT_REFUGE_POINT;
      fetchFor(p.lat, p.lon, p.label || DEFAULT_REFUGE_POINT.label);
    }
  }

  useEffect(() => {
    if (screen === 'refuge') findNearbyRefuges();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  const hasRoutes = result && result.routes.length > 0;

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <span className="logo">hush</span>
          <span className="logo-sub">Sensory-aware wayfinding · Melbourne CBD</span>
        </div>
        {screen === 'plan' ? (
          <ThresholdControl threshold={threshold} onChange={setThreshold} />
        ) : null}
      </header>

      {screen === 'plan' ? <StatusBar data={status} /> : null}

      {screen !== 'home' ? (
        <div className="back-nav">
          <button type="button" className="link-button" onClick={() => setScreen('home')}>
            ← Home
          </button>
        </div>
      ) : null}

      {screen === 'home' ? <Home onNavigate={setScreen} /> : null}

      {screen === 'refuge' ? (
        <main className="layout">
          <div className="layout__panel">
            <RefugePanel
              refuges={refuges}
              loading={refugeLoading}
              note={refugeNote}
              onPlanRoute={planRouteTo}
              onRefresh={findNearbyRefuges}
            />
          </div>
          <div className="layout__map">
            <MapView
              from={refugeOrigin}
              refuges={refuges}
              onPlanRouteToRefuge={planRouteTo}
              liveLocation={liveLocation.position}
              liveLocationTracking={liveLocation.tracking}
              onToggleLiveLocation={toggleLiveLocation}
            />
          </div>
        </main>
      ) : null}

      {screen === 'plan' ? (
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
                    journeyAvailable={from?.label === 'Current location'}
                    journeying={journeyRouteId === r.id}
                    onStartJourney={() => startJourney(r)}
                    onStopJourney={stopJourney}
                    journeyNotice={
                      selectedId === r.id && journeyRouteId !== r.id ? journeyNotice : null
                    }
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
              liveLocation={liveLocation.position}
              liveLocationTracking={liveLocation.tracking}
              onToggleLiveLocation={toggleLiveLocation}
              journeyActive={journeyRouteId !== null && journeyRouteId === selectedId}
            />
          </div>
        </main>
      ) : null}
    </div>
  );
}
