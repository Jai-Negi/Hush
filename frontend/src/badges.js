/** LOW/HIGH/NO DATA badge for a route, based on its average density vs the
 * user's own threshold. Never assumes calm where nothing was measured. */
export function routeBadge(route, threshold) {
  if (route.avg_density === null || route.avg_density === undefined) return 'NO DATA';
  return route.avg_density <= threshold ? 'LOW' : 'HIGH';
}

/** Wall-clock arrival time, duration_min minutes from now. */
export function arrivalTime(durationMin) {
  const arrival = new Date(Date.now() + durationMin * 60_000);
  return arrival.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/** True when a route's worst single sensor is both above the user's own
 * threshold AND more than double the route's own average — the specific,
 * narrow condition for flagging an outlier, not just "reads high somewhere". */
export function worstIsFlagged(route, threshold) {
  if (!route.worst || route.avg_density === null || route.avg_density === undefined) {
    return false;
  }
  return route.worst.value > threshold && route.worst.value > 2 * route.avg_density;
}

// Quietest first: LOW routes before HIGH, unmeasured routes last (neither
// confirmed calm nor confirmed loud, but least informative to lead with).
const BADGE_RANK = { LOW: 0, HIGH: 1, 'NO DATA': 2 };

/** Reorders routes calm-first: LOW, then HIGH, then NO DATA. Within a group,
 * lower average pedestrian count comes first. */
export function sortRoutesByCalm(routes, threshold) {
  return [...routes].sort((a, b) => {
    const rankDiff = BADGE_RANK[routeBadge(a, threshold)] - BADGE_RANK[routeBadge(b, threshold)];
    if (rankDiff !== 0) return rankDiff;
    if (a.avg_density === null || b.avg_density === null) return 0;
    return a.avg_density - b.avg_density;
  });
}
