import { CopyButton } from "./copy-button";

export function CodeBlock({ code, label }: { code: string; label: string }) {
  return (
    <div className="relative">
      <pre
        tabIndex={0}
        aria-label={label}
        className="overflow-x-auto rounded-[18px] bg-[#0e1330] p-5 pr-24 text-sm leading-relaxed text-[#e3e8ff]"
        style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" }}
      >
        {code}
      </pre>
      <CopyButton
        text={code}
        label="Copy"
        className="absolute right-3 top-3 border-white/30 bg-white/10 text-white hover:bg-white hover:text-[#0e1330]"
      />
    </div>
  );
}
