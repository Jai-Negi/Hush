import { useEffect, useState } from 'react';
import { PinIcon, QuietIcon } from './icons';
import { PlaceField } from './PlaceField';

/** "Quiet space now" — nearest low-stimulation refuges, shown automatically,
 * no click required to see them. Purely presentational: App.jsx owns the
 * fetch, since the map on this screen needs the same data.
 *
 * Origin priority: live GPS → (if that's unavailable) a place searched here
 * — or, quicker, the start/destination already picked in "Plan a route" —
 * → the CBD centre as a last resort. `gpsDenied` is when the search field
 * appears, since GPS silently reusing a leftover trip-planner location would
 * be surprising. Once a location is picked, the search collapses to a
 * one-line bar (same pattern as the trip planner) so it doesn't crowd out
 * the results. */
export function RefugePanel({
  refuges,
  loading,
  note,
  onPlanRoute,
  onRefresh,
  gpsDenied,
  onSearchLocation,
  tripFrom,
  tripTo,
  origin,
  editingLocation,
  onEditLocation,
}) {
  const [expanded, setExpanded] = useState(false);
  const visibleCount = 3;
  const hasMore = refuges && refuges.length > visibleCount;

  useEffect(() => {
    setExpanded(false);
  }, [refuges]);

  return (
    <section className="card refuge-card" aria-label="Quiet spaces near you">
      <div className="refuge-card__head">
        <h2 className="heading-with-icon">
          <QuietIcon size={20} />
          Quiet spaces near you
        </h2>
        <button type="button" className="button button--secondary" onClick={onRefresh}>
          {loading ? 'Finding…' : 'Refresh'}
        </button>
      </div>
      <p className="field-note">Tap a place, or a marker on the map, for directions.</p>

      {gpsDenied && editingLocation ? (
        <div className="refuge-search">
          <PlaceField
            id="refuge-location"
            label="Search a location"
            onSelect={(place) => place && onSearchLocation?.(place)}
          />
          {tripFrom || tripTo ? (
            <div className="refuge-quick-picks">
              <p className="field-note">Or use a place from Plan a route:</p>
              <div className="refuge-quick-picks__row">
                {tripFrom ? (
                  <button
                    type="button"
                    className="chip"
                    onClick={() => onSearchLocation?.(tripFrom)}
                  >
                    {tripFrom.label}
                  </button>
                ) : null}
                {tripTo ? (
                  <button
                    type="button"
                    className="chip"
                    onClick={() => onSearchLocation?.(tripTo)}
                  >
                    {tripTo.label}
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {gpsDenied && !editingLocation ? (
        <div className="trip-bar">
          <p className="trip-bar__route">
            <PinIcon size={16} />
            {origin?.label}
          </p>
          <button type="button" className="link-button trip-bar__edit" onClick={onEditLocation}>
            Edit
          </button>
        </div>
      ) : null}

      {note ? <p className="field-note">{note}</p> : null}
      {loading && !refuges ? (
        <p className="status-live" role="status" aria-live="polite">
          Finding quiet spaces near you…
        </p>
      ) : null}
      {refuges ? (
        <>
          <ul className={`refuge-list${expanded ? ' refuge-list--expanded' : ''}`}>
            {refuges.map((r) => (
              <li key={r.name}>
                <strong>{r.name}</strong>
                <span>
                  {r.kind} · {(r.distance_m / 1000).toFixed(1)} km · about{' '}
                  {Math.max(1, Math.round(r.distance_m / 80))} min walk
                </span>
                <button
                  type="button"
                  className="link-button"
                  onClick={() => onPlanRoute?.({ label: r.name, lat: r.lat, lon: r.lon })}
                >
                  Take me there
                </button>
              </li>
            ))}
          </ul>
          {hasMore ? (
            <button
              type="button"
              className="link-button refuge-list__more"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? 'Show fewer' : `See ${refuges.length - visibleCount} more`}
            </button>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
