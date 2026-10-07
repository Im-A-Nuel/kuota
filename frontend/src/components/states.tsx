import Link from "next/link";
import { btnPrimary, btnSecondary } from "@/lib/ui";

export function SampleNotice({ what }: { what: string }) {
  return (
    <p role="note" className="flex gap-3 rounded-control bg-accent-wash px-4 py-3 text-sm">
      <span aria-hidden="true" className="mt-1.5 size-2 shrink-0 rounded-full bg-accent" />
      <span>
        <strong className="font-semibold">Sample data.</strong> {what} No backend is connected, so
        nothing here is on-chain.
      </span>
    </p>
  );
}

/** Errors use a mark plus ink text, so they never read as the blue action colour. */
export function AlertMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" className="mt-0.5 shrink-0 text-ink">
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
    <div className="rounded-panel border border-dashed border-line-strong p-8">
      <p className="text-2xl font-light">{title}</p>
      <p className="mt-2 max-w-prose text-mute">{body}</p>
      {action && (
        <Link href={action.href} className={`${btnPrimary} mt-5`}>
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
    <div role="alert" className="flex gap-3 rounded-panel border-2 border-ink p-6">
      <AlertMark />
      <div>
        <p className="text-xl font-normal">{title}</p>
        <p className="mt-1 max-w-prose text-mute">{body}</p>
        {onRetry && (
          <button type="button" onClick={onRetry} className={`${btnSecondary} mt-4`}>
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
        <div key={i} className="skeleton h-6" style={{ width: `${92 - i * 14}%` }} />
      ))}
    </div>
  );
}
