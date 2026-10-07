import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-16 sm:px-6">
      <h1 className="text-5xl font-light">No page at this address.</h1>
      <p className="mt-4 max-w-prose text-lg">
        If you followed a link to a kuota, the mint may be mistyped or the launch has not
        confirmed yet.
      </p>
      <Link
        href="/providers"
        className="mt-6 inline-flex min-h-12 items-center rounded-full bg-accent px-5 font-semibold text-accent-ink hover:bg-accent-deep"
      >
        See live kuota
      </Link>
    </div>
  );
}
