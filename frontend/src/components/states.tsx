import Link from "next/link";

export function SampleNotice({ what }: { what: string }) {
  return (
    <p
      role="note"
      className="rounded-control border-[1.5px] border-dashed border-ink bg-card px-3 py-2 text-sm"
    >
      <strong>Sample data.</strong> {what} No backend is connected, so nothing here is on-chain.
    </p>
  );
}

/** Errors use a mark plus ink text, so they never read as the vermilion action colour. */
export function AlertMark() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="mt-0.5 shrink-0 text-accent-text"
    >
      <path d="M12 3 22 20H2L12 3Z" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M12 10v4.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="12" cy="17.2" r="1.2" fill="currentColor" />
    </svg>
  );
}

export function ErrorNote({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <p id={id} className="flex gap-2 text-sm font-semibold">
      <AlertMark />
      <span>{children}</span>
    </p>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="rounded-panel border-[1.5px] border-dashed border-ink p-6">
      <p className="font-display text-xl font-bold">{title}</p>
      <p className="mt-1 max-w-prose text-mute">{body}</p>
      {action && (
        <Link
          href={action.href}
          className="mt-4 inline-flex min-h-11 items-center rounded-control bg-accent px-4 font-bold text-accent-ink hover:brightness-95"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}

export function ErrorState({
  title,
  body,
  onRetry,
}: {
  title: string;
  body: string;
  onRetry?: () => void;
}) {
  return (
    <div role="alert" className="flex gap-3 rounded-panel border-[3px] border-double border-ink p-6">
      <AlertMark />
      <div>
        <p className="font-display text-xl font-bold">{title}</p>
        <p className="mt-1 max-w-prose">{body}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 min-h-11 cursor-pointer rounded-control border-[1.5px] border-ink px-4 font-semibold hover:bg-ink hover:text-paper"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}

export function SkeletonLines({ count = 3, label }: { count?: number; label: string }) {
  return (
    <div role="status" aria-label={label} className="space-y-3">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="skeleton h-5" style={{ width: `${92 - i * 14}%` }} />
      ))}
    </div>
  );
}
