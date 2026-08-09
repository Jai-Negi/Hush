/* Static, literal inline icons. Decorative only — every icon sits beside a
 * text label that carries the same meaning (autism research: tightly aligned
 * icon and label, no clever or abstract symbols). No animation, currentColor. */

function Svg({ size = 18, children, strokeWidth = 1.8 }) {
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

/** LOW badge — a leaf (calm). */
export function LeafIcon(props) {
  return (
    <Svg {...props}>
      <path d="M5 19c8 0 14-4 14-13 0 0-13-2-13 7 0 2 1 4 3 5" />
      <path d="M5 19c1.5-3 3.5-5 6-6.5" />
    </Svg>
  );
}

/** HIGH badge — a caution triangle. */
export function CautionIcon(props) {
  return (
    <Svg {...props}>
      <path d="M12 4 3 19h18L12 4Z" />
      <path d="M12 10v4" />
      <path d="M12 17h.01" />
    </Svg>
  );
}

/** NO DATA badge — a dash (nothing measured). */
export function DashIcon(props) {
  return (
    <Svg {...props}>
      <path d="M6 12h12" />
    </Svg>
  );
}
