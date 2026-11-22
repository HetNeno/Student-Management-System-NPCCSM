/**
 * Nova's bot avatar (inline SVG). States:
 *  - idle:     gentle eye blink
 *  - thinking: pulsing antenna, scanning eyes, halo ring
 * All motion is CSS and disabled under prefers-reduced-motion.
 */
export default function NovaAvatar({ size = 32, thinking = false, className = '' }) {
  return (
    <span
      className={`nova-avatar relative inline-flex shrink-0 items-center justify-center rounded-xl bg-[#8B2635] shadow-md shadow-[#8B2635]/25 ${thinking ? 'is-thinking' : ''} ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {thinking && <span className="nova-halo absolute inset-0 rounded-xl" />}
      <svg viewBox="0 0 32 32" width={size * 0.72} height={size * 0.72} fill="none">
        <line x1="16" y1="3.5" x2="16" y2="8" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
        <circle className="nova-antenna" cx="16" cy="3.2" r="2" fill="#FBD38D" />
        <rect x="5" y="8" width="22" height="17" rx="6" fill="#fff" />
        <rect x="3" y="14" width="2.5" height="6" rx="1.2" fill="#fff" opacity=".85" />
        <rect x="26.5" y="14" width="2.5" height="6" rx="1.2" fill="#fff" opacity=".85" />
        <g className="nova-eyes">
          <rect x="10" y="13.5" width="4" height="5" rx="2" fill="#8B2635" />
          <rect x="18" y="13.5" width="4" height="5" rx="2" fill="#8B2635" />
        </g>
        <path d="M12.5 21.5c1.9 1.3 5.1 1.3 7 0" stroke="#8B2635" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </span>
  );
}
