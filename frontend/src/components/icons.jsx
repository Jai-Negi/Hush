/* Static, literal inline icons. Decorative only — every icon sits beside a
 * text label that carries the same meaning. No animation, currentColor.
 * Stub for AC1.2.1; extended as other screens need more icons. */

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

/** Start point — a map pin. */
export function PinIcon(props) {
  return (
    <Svg {...props}>
      <path d="M12 21s-6-5.2-6-10a6 6 0 0 1 12 0c0 4.8-6 10-6 10Z" />
      <circle cx="12" cy="11" r="2" />
    </Svg>
  );
}

/** Destination — a flag. */
export function FlagIcon(props) {
  return (
    <Svg {...props}>
      <path d="M6 21V4" />
      <path d="M6 5h11l-2 3 2 3H6" />
    </Svg>
  );
}
