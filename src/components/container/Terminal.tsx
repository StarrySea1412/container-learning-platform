"use client";

import { useEffect, useRef, useState } from "react";
import type { TermLine } from "@/lib/container-sandbox-engine";

interface TerminalProps {
  lines: TermLine[];
  prompt: string;
  value: string;
  onChange: (v: string) => void;
  onSubmit: (v: string) => void;
  candidates: string[];
}

export default function Terminal({ lines, prompt, value, onChange, onSubmit, candidates }: TerminalProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);

  useEffect(() => {
    boxRef.current?.scrollTo({ top: boxRef.current.scrollHeight });
  }, [lines]);

  const submit = () => {
    const v = value.trim();
    if (v) {
      setHistory((h) => [...h.filter((x) => x !== v), v]);
      onSubmit(v);
    }
    onChange("");
    setHistIdx(-1);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); submit(); return; }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length === 0) return;
      const idx = histIdx < 0 ? history.length - 1 : Math.max(0, histIdx - 1);
      setHistIdx(idx);
      onChange(history[idx]);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (histIdx < 0) return;
      const idx = histIdx + 1;
      if (idx >= history.length) { setHistIdx(-1); onChange(""); } else { setHistIdx(idx); onChange(history[idx]); }
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      const parts = value.split(" ");
      const last = parts[parts.length - 1];
      if (!last) return;
      const hit = candidates.filter((c) => c.startsWith(last));
      if (hit.length === 1) {
        parts[parts.length - 1] = hit[0];
        onChange(parts.join(" "));
      } else if (hit.length > 1) {
        // 多个候选：补全到公共前缀
        let prefix = hit[0];
        for (const h of hit) { while (!h.startsWith(prefix)) prefix = prefix.slice(0, -1); }
        parts[parts.length - 1] = prefix;
        onChange(parts.join(" "));
      }
      return;
    }
    if (e.key === "l" && e.ctrlKey) { e.preventDefault(); onSubmit("__clear__"); }
  };

  return (
    <div
      ref={boxRef}
      className="term term-scroll h-full overflow-y-auto rounded-xl p-4 cursor-text"
      onClick={() => inputRef.current?.focus()}
    >
      {lines.map((l, i) => (
        <div key={i} className={`whitespace-pre-wrap break-all ${l.c ? "c-" + l.c : ""}`}>{l.text || "\u00a0"}</div>
      ))}
      <div className="flex items-center gap-2 mt-1">
        <span className="c-g whitespace-pre">{prompt}</span>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKey}
          className="flex-1 bg-transparent outline-none border-none text-[#d7e2f0] font-[inherit] caret-sky-400"
          autoFocus
          spellCheck={false}
          autoComplete="off"
          aria-label="终端输入"
        />
      </div>
    </div>
  );
}
