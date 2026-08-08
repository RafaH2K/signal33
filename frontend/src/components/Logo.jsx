export default function Logo({ className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2 font-display font-semibold tracking-wide-caps uppercase ${className}`}>
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <circle cx="9" cy="9" r="8" stroke="currentColor" strokeWidth="1" />
        <circle cx="9" cy="9" r="2" fill="currentColor" />
      </svg>
      signal33
    </span>
  );
}
