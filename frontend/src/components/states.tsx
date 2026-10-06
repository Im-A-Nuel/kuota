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
    <div role="alert" className="rounded-panel border-[1.5px] border-accent-text p-6">
      <p className="font-display text-xl font-bold text-accent-text">{title}</p>
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
