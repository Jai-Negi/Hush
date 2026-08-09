import { useEffect, useMemo, useRef } from 'react';
import { Layer, Map, Marker, Source } from '@vis.gl/react-maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { routeBadge, worstIsFlagged } from '../badges';

const MAP_STYLE =
  import.meta.env.VITE_MAP_STYLE || 'https://tiles.openfreemap.org/styles/positron';

// Muted route colours — calm, never alarm-red. Selected route is wider, not brighter.
const COLORS = { LOW: '#5F8268', HIGH: '#B0793F', 'NO DATA': '#8F8B82' };

const MELBOURNE_CENTER = { longitude: 144.9646, latitude: -37.8136, zoom: 14 };

function fitToPoints(map, points, { padding = 56, maxZoom = 16 } = {}) {
  if (!map || !points.length) return;
  let minLon = Infinity;
  let minLat = Infinity;
  let maxLon = -Infinity;
  let maxLat = -Infinity;
  for (const [lon, lat] of points) {
    if (lon < minLon) minLon = lon;
    if (lat < minLat) minLat = lat;
    if (lon > maxLon) maxLon = lon;
    if (lat > maxLat) maxLat = lat;
  }
  if (minLon === maxLon && minLat === maxLat) {
    map.jumpTo({ center: [minLon, minLat], zoom: Math.min(maxZoom, 15) });
    return;
  }
  map.fitBounds(
    [
      [minLon, minLat],
      [maxLon, maxLat],
    ],
    { padding, duration: 0, maxZoom },
  );
}

/** AC1.2.4: renders origin/destination and any routes US1.1 already produced.
 * Never recomputes routes — display only. */
export function MapView({ routes, threshold = 100, selectedId, onSelect, from, to }) {
  const mapRef = useRef(null);

  const routesGeoJson = useMemo(
    () => ({
      type: 'FeatureCollection',
      features: (routes || []).map((r) => ({
        type: 'Feature',
        geometry: r.geometry,
        properties: { id: r.id, color: COLORS[routeBadge(r, threshold)] },
      })),
    }),
    [routes, threshold],
  );

  const selected = (routes || []).find((r) => r.id === selectedId);

  const sensorsGeoJson = useMemo(
    () => ({
      type: 'FeatureCollection',
      features: (selected?.matched_sensors || []).map((s) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [s.lon, s.lat] },
        properties: { reading: s.reading },
      })),
    }),
    [selected],
  );

  // Fit without animation (no sudden motion). Prefer routes; else From/To pins.
  useEffect(() => {
    const map = mapRef.current?.getMap?.();
    if (!map) return;

    if (routes && routes.length > 0) {
      const points = [];
      for (const r of routes) {
        for (const [lon, lat] of r.geometry.coordinates) points.push([lon, lat]);
      }
      fitToPoints(map, points, { padding: 56 });
      return;
    }

    const points = [];
    if (from) points.push([from.lon, from.lat]);
    if (to) points.push([to.lon, to.lat]);
    fitToPoints(map, points, { padding: 64, maxZoom: 15 });
  }, [routes, from, to]);

  return (
    <div className="map-shell">
      <Map
        ref={mapRef}
        initialViewState={MELBOURNE_CENTER}
        mapStyle={MAP_STYLE}
        dragRotate={false}
        pitchWithRotate={false}
        touchPitch={false}
        attributionControl={{ compact: true }}
        onClick={(e) => {
          const map = mapRef.current?.getMap?.();
          if (!map || !routes?.length || !onSelect) return;
          const hit = map.queryRenderedFeatures(e.point, { layers: ['routes-line'] })[0];
          if (hit) onSelect(hit.properties.id);
        }}
      >
        {routes && routes.length > 0 ? (
          <Source id="routes" type="geojson" data={routesGeoJson}>
            <Layer
              id="routes-line"
              type="line"
              layout={{ 'line-cap': 'round', 'line-join': 'round' }}
              paint={{
                'line-color': ['get', 'color'],
                'line-width': ['case', ['==', ['get', 'id'], selectedId ?? -1], 6, 3],
                'line-opacity': [
                  'case',
                  ['==', ['get', 'id'], selectedId ?? -1],
                  0.95,
                  0.45,
                ],
              }}
            />
          </Source>
        ) : null}

        {selected ? (
          <Source id="sensors" type="geojson" data={sensorsGeoJson}>
            <Layer
              id="sensors-dots"
              type="circle"
              paint={{
                'circle-radius': 4,
                'circle-color': '#6D6A62',
                'circle-stroke-width': 1.5,
                'circle-stroke-color': '#F6F4EF',
              }}
            />
          </Source>
        ) : null}

        {from ? (
          <Marker longitude={from.lon} latitude={from.lat} anchor="bottom">
            <div className="map-pin">
              <span className="map-pin__dot" />
              <span className="map-pin__label">{from.label}</span>
            </div>
          </Marker>
        ) : null}
        {to ? (
          <Marker longitude={to.lon} latitude={to.lat} anchor="bottom">
            <div className="map-pin">
              <span className="map-pin__dot map-pin__dot--dest" />
              <span className="map-pin__label">{to.label}</span>
            </div>
          </Marker>
        ) : null}

        {selected?.worst && worstIsFlagged(selected, threshold) ? (
          <Marker longitude={selected.worst.lon} latitude={selected.worst.lat} anchor="left">
            <div className="worst-callout">
              <strong>{Math.round(selected.worst.value)} people/min</strong>
              <span>{selected.worst.street}</span>
            </div>
          </Marker>
        ) : null}
      </Map>
    </div>
  );
}
