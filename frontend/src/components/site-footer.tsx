import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t-[1.5px] border-ink">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 text-sm sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div className="max-w-md">
          <p className="font-display text-2xl font-extrabold leading-none">kuota</p>
          <p className="mt-3 text-mute">
            Kuota is a prepaid service credit for API calls. It is not an investment and nothing
            here promises a price.
          </p>
        </div>
        <ul className="flex flex-wrap gap-x-6 gap-y-1 font-semibold">
          <li>
            <Link href="/providers" className="inline-flex min-h-11 items-center underline underline-offset-4">
              Providers
            </Link>
          </li>
          <li>
            <Link href="/launch" className="inline-flex min-h-11 items-center underline underline-offset-4">
              Launch a kuota
            </Link>
          </li>
          <li>
            <a
              href="https://github.com/Im-A-Nuel/kuota"
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center underline underline-offset-4"
            >
              Source on GitHub
            </a>
          </li>
        </ul>
      </div>
    </footer>
  );
}
