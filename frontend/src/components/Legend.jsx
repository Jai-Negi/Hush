export function Legend({ threshold }) {
  return (
    <dl className="legend">
      <div>
        <dt className="badge badge--low">LOW</dt>
        <dd>Route average is at or below your limit of {threshold} people/min.</dd>
      </div>
      <div>
        <dt className="badge badge--high">HIGH</dt>
        <dd>Route average is above {threshold} people/min.</dd>
      </div>
      <div>
        <dt>
          <span className="flag">!</span>
        </dt>
        <dd>
          This route's worst single sensor is above your limit and more than double the
          route's own average. Shown on every route.
        </dd>
      </div>
      <div>
        <dt className="badge badge--nodata">NO DATA</dt>
        <dd>No sensor within 50 m of that segment. Never silently counted as low.</dd>
      </div>
    </dl>
  );
}
