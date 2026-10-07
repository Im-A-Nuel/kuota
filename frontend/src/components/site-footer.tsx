import Link from "next/link";
import { LogoMark } from "./icons";

const linkClass = "inline-flex min-h-11 items-center text-sm text-mute hover:text-accent";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 md:flex-row md:items-start md:justify-between">
        <div className="max-w-md">
          <p className="inline-flex items-center gap-2 text-lg font-semibold">
            <LogoMark />
            kuota
          </p>
          <p className="mt-3 text-sm text-mute">
            Kuota is a prepaid service credit for API calls. It is not an investment and nothing
            here promises a price.
          </p>
        </div>
        <ul className="flex flex-wrap gap-x-8">
          <li>
            <Link href="/providers" className={linkClass}>Providers</Link>
          </li>
          <li>
            <Link href="/launch" className={linkClass}>Launch a kuota</Link>
          </li>
          <li>
            <a href="https://github.com/Im-A-Nuel/kuota" target="_blank" rel="noreferrer" className={linkClass}>
              Source on GitHub
            </a>
          </li>
        </ul>
      </div>
    </footer>
  );
}
