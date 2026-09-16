"use client";

import { useMemo, useState } from "react";
import { cheatsheet } from "@/data/cheatsheet";

export default function CheatsheetPage() {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const groups = useMemo(() => {
    if (!q) return cheatsheet;
    return cheatsheet
      .map((g) => ({
        ...g,
        entries: g.entries.filter(
          (e) => e.cmd.toLowerCase().includes(q) || e.desc.toLowerCase().includes(q) || (e.note ?? "").toLowerCase().includes(q)
        ),
      }))
      .filter((g) => g.entries.length > 0);
  }, [q]);

  const total = groups.reduce((s, g) => s + g.entries.length, 0);

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-slate-800 mb-2">📋 命令速查表</h1>
      <p className="text-slate-500 mb-5 max-w-3xl">
        每条都是真实 Docker 命令，带一句话用途和<strong className="text-slate-700">高手备注</strong>（坑与生产习惯）。
        点击任意命令即可复制——改一个容器名就能用。
      </p>

      <div className="flex items-center gap-3 mb-8">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索：端口、日志、瘦身、prune、-v …（支持中英文）"
          className="flex-1 px-4 py-2.5 rounded-[18px] border border-white/60 bg-white/60 backdrop-blur-xl text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-sky-400 shadow-sm"
        />
        <span className="text-xs text-slate-400 shrink-0 whitespace-nowrap">
          {total} 条{q && "（已过滤）"}
        </span>
      </div>

      <div className="space-y-8">
        {groups.map((g) => (
          <section key={g.id}>
            <div className="flex items-baseline gap-3 mb-3">
              <h2 className="text-xl font-bold text-slate-800">{g.icon} {g.title}</h2>
              <span className="text-xs text-slate-400">{g.desc}</span>
            </div>
            <div className="space-y-2.5">
              {g.entries.map((e) => (
                <CheatRow key={e.cmd} cmd={e.cmd} desc={e.desc} note={e.note} />
              ))}
            </div>
          </section>
        ))}
        {total === 0 && (
          <div className="card p-10 text-center text-slate-400">没有匹配「{query}」的命令——换个关键词试试。</div>
        )}
      </div>
    </div>
  );
}

function CheatRow({ cmd, desc, note }: { cmd: string; desc: string; note?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(cmd);
    } catch {
      // 剪贴板 API 不可用（非安全上下文）时降级：选中不算失败
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };
  const firstLine = cmd.split("\n")[0];
  const multi = cmd.includes("\n");
  return (
    <div
      onClick={copy}
      title="点击复制命令"
      className="card p-3.5 cursor-pointer hover:border-sky-300 hover:shadow-md transition-all group"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <code className="term inline-block px-2.5 py-1.5 rounded-lg text-[12.5px] leading-relaxed break-all whitespace-pre-wrap">
            {multi ? cmd : firstLine}
          </code>
          <div className="text-sm text-slate-600 mt-1.5 leading-relaxed">{desc}</div>
          {note && (
            <div className="text-xs text-slate-500 mt-1.5 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 leading-relaxed">
              <strong className="text-amber-700">高手备注：</strong>{note}
            </div>
          )}
        </div>
        <span
          className={`shrink-0 text-[11px] px-2 py-1 rounded-full border transition-all ${
            copied ? "bg-emerald-50 text-emerald-600 border-emerald-300" : "text-slate-400 border-white/60 group-hover:text-sky-500 group-hover:border-sky-300"
          }`}
        >
          {copied ? "✓ 已复制" : "复制"}
        </span>
      </div>
    </div>
  );
}
