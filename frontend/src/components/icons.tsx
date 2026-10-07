// Small hand-drawn icon set. Every icon is decorative (aria-hidden); the text next to it
// carries the meaning.

type P = { className?: string };

export function ArrowRight({ className = "" }: P) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true" className={className}>
      <path d="M5 12h13M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Arrow inside a circle, used on the primary CTA only (see DESIGN.md). */
export function ArrowBadge() {
  return (
    <span aria-hidden="true" className="-mr-3 inline-flex size-7 items-center justify-center rounded-full bg-accent-ink text-accent">
      <ArrowRight />
    </span>
  );
}

export function CheckDot({ className = "" }: P) {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" className={className}>
      <circle cx="10" cy="10" r="10" fill="currentColor" />
      <path d="m6 10.2 2.6 2.6L14.2 7" fill="none" stroke="var(--accent-ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function WalletIcon({ className = "" }: P) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path
        d="M3 7.5A2.5 2.5 0 0 1 5.5 5H19v3M3 7.5V17a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1H5.5A2.5 2.5 0 0 1 3 7.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="16.5" cy="13.5" r="1.3" fill="currentColor" />
    </svg>
  );
}

/** Logo mark placeholder: a lowercase k in a blue rounded square, until a real logo exists. */
export function LogoMark() {
  return (
    <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="var(--accent)" />
      <path d="M11 7v18M11 18l8.5-8M14.5 14.5 21 25" stroke="var(--accent-ink)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}
