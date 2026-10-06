import { CopyButton } from "./copy-button";

export function CodeBlock({ code, label }: { code: string; label: string }) {
  return (
    <div className="relative">
      <pre
        tabIndex={0}
        aria-label={label}
        className="overflow-x-auto rounded-panel border-[1.5px] border-ink bg-card p-5 pr-28 text-sm leading-relaxed"
        style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" }}
      >
        {code}
      </pre>
      <CopyButton text={code} label="Copy" className="absolute right-3 top-3" />
    </div>
  );
}
