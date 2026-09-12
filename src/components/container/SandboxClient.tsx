"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Terminal from "./Terminal";
import { useSandbox } from "@/hooks/use-sandbox";
import { ContainerEngine, TermLine, fmtSize } from "@/lib/container-sandbox-engine";

type Tab = "containers" | "images" | "networks" | "volumes";
type Selection = { kind: Tab; name: string } | null;

interface SandboxClientProps {
  seedCommands?: string[];
  seedFactory?: () => ContainerEngine;
  editableFile?: string;
  quickCommands?: string[];
  height?: string;
  /** 每次终端命令执行后回调（挑战页做目标校验用） */
  onAfterCommand?: (engine: ContainerEngine) => void;
}

const STATUS_STYLE: Record<string, string> = {
  running: "bg-emerald-400/15 text-emerald-500 border-emerald-400/40",
  exited: "bg-slate-400/15 text-slate-500 border-slate-400/40",
  paused: "bg-amber-400/15 text-amber-600 border-amber-400/40",
  created: "bg-sky-400/15 text-sky-600 border-sky-400/40",
};

function shortCwd(cwd: string) {
  return cwd.replace(/^\/root/, "~") || "/";
}

export default function SandboxClient({ seedCommands = [], seedFactory, editableFile, quickCommands = [], height = "h-[560px]", onAfterCommand }: SandboxClientProps) {
  const { engine, version } = useSandbox(seedFactory);
  const [lines, setLines] = useState<TermLine[]>([
    { text: "🐳 容器沙盒已就绪（一切都在你的浏览器里，放心折腾）", c: "c" },
    { text: "输入 help 查看支持的命令；右侧面板点击任意对象可反查命令。", c: "d" },
  ]);
  const [input, setInput] = useState("");
  const [tab, setTab] = useState<Tab>("containers");
  const [sel, setSel] = useState<Selection>(null);
  const seeded = useRef(false);
  const [fileContent, setFileContent] = useState("");

  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    if (seedCommands.length) {
      const out: TermLine[] = [{ text: "—— 正在为你布置故障现场 ——", c: "y" }];
      for (const cmd of seedCommands) {
        out.push({ text: `$ ${cmd}`, c: "b" });
        engine.exec(cmd).forEach((l) => out.push(l));
      }
      out.push({ text: "—— 情报如上，开始排查吧 ——", c: "y" });
      setLines((prev) => [...prev, ...out]);
    }
    if (editableFile) setFileContent(engine.vfs.readFile(editableFile) ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const run = useCallback((raw: string) => {
    if (raw === "__clear__") { setLines([]); return; }
    const out = engine.exec(raw);
    setLines((prev) => [...prev.slice(-800), { text: `${promptStr(engine)}${raw}`, c: "b" }, ...out]);
    onAfterCommand?.(engine);
  }, [engine, onAfterCommand]);

  const candidates = useMemo(() => {
    const base = ["docker", "help", "curl", "ls", "cat", "cd", "pwd", "echo", "mkdir", "rm", "tree"];
    const subs = ["run", "ps", "images", "pull", "build", "logs", "exec", "stop", "start", "rm", "rmi", "inspect", "volume", "network", "compose", "history", "system", "stats"];
    const names = [
      ...engine.containers.map((c) => c.name),
      ...engine.images.map((i) => `${i.repo}:${i.tag}`),
      ...engine.volumes.map((v) => v.name),
      ...engine.networks.map((n) => n.name),
    ];
    return [...base, ...subs, ...names];
  }, [engine, version]);

  const selCommand = useMemo(() => {
    if (!sel) return null;
    if (sel.kind === "containers") return `docker inspect ${sel.name}`;
    if (sel.kind === "images") return `docker history ${sel.name}`;
    if (sel.kind === "volumes") return `docker volume inspect ${sel.name}`;
    return `docker network inspect ${sel.name}`;
  }, [sel]);

  const promptStr0 = promptStr(engine);

  return (
    <div className="grid gap-4 lg:grid-cols-2" style={{ minHeight: 480 }}>
      {/* ============ 左：终端 ============ */}
      <div className="flex flex-col gap-2">
        <div className={`${height} flex flex-col overflow-hidden border border-white/30 shadow-[0_14px_44px_rgba(23,68,118,0.25)]`} style={{ background: "#0b1220", borderRadius: 22, backdropFilter: "blur(8px)" }}>
          <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-white/5">
            <div className="flex gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-400/80" />
              <span className="w-3 h-3 rounded-full bg-amber-400/80" />
              <span className="w-3 h-3 rounded-full bg-emerald-400/80" />
            </div>
            <span className="text-xs text-slate-500 font-mono">root@docker-lab — sandbox</span>
            <button
              onClick={() => setLines([])}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              清屏
            </button>
          </div>
          <div className="flex-1 min-h-0">
            <Terminal
              lines={lines}
              prompt={promptStr0}
              value={input}
              onChange={setInput}
              onSubmit={run}
              candidates={candidates}
            />
          </div>
        </div>
        {quickCommands.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {quickCommands.map((c) => (
              <button
                key={c}
                onClick={() => setInput(c)}
                className="term !text-[11px] px-2.5 py-1 rounded-full border border-white/15 hover:border-sky-400/60 text-slate-300 transition-colors"
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ============ 右：可视化面板 ============ */}
      <div className={`${height} flex flex-col card overflow-hidden`}>
        <div className="flex border-b border-white/50 bg-white/25">
          {([["containers", "容器"], ["images", "镜像"], ["networks", "网络"], ["volumes", "卷"]] as [Tab, string][]).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`flex-1 py-2 text-sm font-medium transition-colors relative ${
                tab === k ? "text-sky-600" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {label}
              {k === "containers" && engine.runningContainers().length > 0 && (
                <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-600">
                  {engine.runningContainers().length} 运行中
                </span>
              )}
              {tab === k && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-500" />}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto thin-scroll p-3 space-y-2">
          <AnimatePresence mode="popLayout">
            {tab === "containers" && <ContainerPanel key="cp" engine={engine} sel={sel} onSelect={setSel} />}
            {tab === "images" && <ImagePanel key="ip" engine={engine} sel={sel} onSelect={setSel} />}
            {tab === "networks" && <NetworkPanel key="np" engine={engine} sel={sel} onSelect={setSel} />}
            {tab === "volumes" && <VolumePanel key="vp" engine={engine} sel={sel} onSelect={setSel} />}
          </AnimatePresence>
        </div>

        {/* 反查命令栏 */}
        <AnimatePresence>
          {selCommand && sel && (
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              className="border-t border-white/50 bg-white/35 px-3 py-2 flex items-center gap-2"
            >
              <span className="text-xs text-slate-500 shrink-0">对应命令</span>
              <code className="term !text-[11px] flex-1 px-2 py-1 rounded text-sky-300 truncate">{selCommand}</code>
              <button
                onClick={() => setInput(selCommand)}
                className="text-xs px-3 py-1 rounded-md bg-sky-500 text-white hover:bg-sky-600 transition-colors shrink-0"
              >
                填入终端
              </button>
              <button onClick={() => setSel(null)} className="text-xs text-slate-400 hover:text-slate-600 shrink-0">✕</button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ============ 可选：文件编辑器（挑战用） ============ */}
      {editableFile && (
        <div className="lg:col-span-2 card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-white/50 bg-white/30">
            <span className="text-xs font-mono text-slate-600">{editableFile}（可直接编辑，保存到虚拟磁盘后用 docker build 构建）</span>
            <span className="text-[10px] text-slate-400">编辑即保存</span>
          </div>
          <textarea
            value={fileContent}
            onChange={(e) => {
              setFileContent(e.target.value);
              engine.vfs.writeFile(editableFile, e.target.value);
              engine.notify();
            }}
            spellCheck={false}
            className="w-full h-44 p-4 font-mono text-[12.5px] leading-relaxed bg-[#0b1220] text-[#d7e2f0] outline-none resize-y"
          />
        </div>
      )}
    </div>
  );
}

function promptStr(engine: ContainerEngine) {
  return `root@docker-lab:${shortCwd(engine.cwd)}# `;
}

/* ============ 容器面板 ============ */
function ContainerPanel({ engine, sel, onSelect }: { engine: ContainerEngine; sel: Selection; onSelect: (s: Selection) => void }) {
  const list = [...engine.containers].reverse();
  if (list.length === 0) return <EmptyPanel text="还没有容器。去终端试试 docker run -d -p 8080:80 nginx:alpine" />;
  return (
    <>
      {list.map((c) => (
        <motion.div
          key={c.id + c.name}
          layout
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          onClick={() => onSelect(sel?.name === c.name && sel.kind === "containers" ? null : { kind: "containers", name: c.name })}
          className={`rounded-xl border p-3 cursor-pointer transition-colors ${
            sel?.kind === "containers" && sel.name === c.name
              ? "border-sky-400/70 bg-white/70 ring-2 ring-sky-200/70"
              : "bg-white/45 border-white/60 hover:border-sky-300/80"
          }`}
        >
          <div className="flex items-center gap-2">
            <motion.span
              animate={c.status === "running" ? { scale: [1, 1.25, 1] } : {}}
              transition={{ repeat: Infinity, duration: 2 }}
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${c.status === "running" ? "bg-emerald-500" : c.status === "paused" ? "bg-amber-500" : "bg-slate-400"}`}
            />
            <span className="font-mono text-sm font-semibold text-slate-800 truncate">{c.name}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${STATUS_STYLE[c.status]}`}>{c.status}</span>
            {c.exitCode !== undefined && c.exitCode !== 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-600 font-mono">exit {c.exitCode}</span>
            )}
            <span className="ml-auto text-xs text-slate-400 font-mono truncate">{c.imageRef}</span>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {c.ports.map((p) => (
              <span key={p.hostPort} className="text-[10px] px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200 font-mono">
                :{p.hostPort} → {p.containerPort}
              </span>
            ))}
            {c.mounts.map((m, i) => (
              <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 border border-violet-200 font-mono">
                {m.volName ?? m.hostPath} → {m.dest}
              </span>
            ))}
            {c.limits?.memoryMB && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-200 font-mono">mem {c.limits.memoryMB}MB</span>
            )}
          </div>
          <AnimatePresence>
            {sel?.kind === "containers" && sel.name === c.name && c.logs.length > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="term mt-2 rounded-lg p-2 text-[11px] max-h-28 overflow-y-auto term-scroll">
                  {c.logs.slice(-8).map((l, i) => (
                    <div key={i} className={l.c ? "c-" + l.c : ""}>{l.text}</div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      ))}
    </>
  );
}

/* ============ 镜像面板（分层堆叠视图） ============ */
function ImagePanel({ engine, sel, onSelect }: { engine: ContainerEngine; sel: Selection; onSelect: (s: Selection) => void }) {
  const list = [...engine.images].reverse();
  if (list.length === 0) return <EmptyPanel text="本地还没有镜像。试试 docker pull nginx:alpine 或 docker build -t app ." />;
  return (
    <>
      {list.map((img) => {
        const size = img.layers.reduce((s, l) => s + l.sizeMB, 0);
        const selected = sel?.kind === "images" && sel.name === `${img.repo}:${img.tag}`;
        return (
          <motion.div
            key={img.repo + img.tag + img.createdAt}
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            onClick={() => onSelect(selected ? null : { kind: "images", name: `${img.repo}:${img.tag}` })}
            className={`rounded-xl border p-3 cursor-pointer transition-colors ${
              selected ? "border-sky-400/70 bg-white/70 ring-2 ring-sky-200/70" : "bg-white/45 border-white/60 hover:border-sky-300/80"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">📦</span>
              <span className="font-mono text-sm font-semibold text-slate-800">{img.repo}:{img.tag}</span>
              <span className="ml-auto text-xs font-mono text-slate-500">{fmtSize(size)} · {img.layers.length} 层</span>
            </div>
            <AnimatePresence>
              {selected && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="mt-2 space-y-1">
                    {[...img.layers].reverse().map((l, i) => (
                      <motion.div
                        key={l.id + i}
                        initial={{ x: -16, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: i * 0.05 }}
                        className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border text-[11px] font-mono ${
                          l.cached ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-slate-50"
                        }`}
                      >
                        <span className={`px-1 rounded ${l.cached ? "text-emerald-600" : "text-slate-400"}`}>{l.cached ? "CACHED" : `layer ${img.layers.length - i}`}</span>
                        <span className="flex-1 truncate text-slate-600">{l.instruction}</span>
                        <span className="text-slate-400 shrink-0">{fmtSize(l.sizeMB)}</span>
                      </motion.div>
                    ))}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1.5">💡 自下而上：底层是基础镜像，上层叠改动。docker history 同款视角。</div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </>
  );
}

/* ============ 网络面板 ============ */
function NetworkPanel({ engine, sel, onSelect }: { engine: ContainerEngine; sel: Selection; onSelect: (s: Selection) => void }) {
  return (
    <>
      {engine.networks.map((n) => {
        const selected = sel?.kind === "networks" && sel.name === n.name;
        return (
          <motion.div
            key={n.name}
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => onSelect(selected ? null : { kind: "networks", name: n.name })}
            className={`rounded-xl border p-3 cursor-pointer transition-colors ${
              selected ? "border-sky-400/70 bg-white/70 ring-2 ring-sky-200/70" : "bg-white/45 border-white/60 hover:border-sky-300/80"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">🌐</span>
              <span className="font-mono text-sm font-semibold text-slate-800">{n.name}</span>
              <span className="text-[10px] text-slate-400 font-mono">{n.subnet}</span>
              {n.name === "bridge" && <span className="text-[10px] text-slate-400">(默认网络，无 DNS)</span>}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {n.containers.length === 0 && <span className="text-[11px] text-slate-400">（没有容器接入）</span>}
              {n.containers.map((cn) => (
                <span key={cn} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono">🟢 {cn}</span>
              ))}
            </div>
          </motion.div>
        );
      })}
    </>
  );
}

/* ============ 卷面板 ============ */
function VolumePanel({ engine, sel, onSelect }: { engine: ContainerEngine; sel: Selection; onSelect: (s: Selection) => void }) {
  if (engine.volumes.length === 0) return <EmptyPanel text="还没有卷。docker run -v mydata:/data redis:alpine 就会创建一个。" />;
  return (
    <>
      {engine.volumes.map((v) => {
        const selected = sel?.kind === "volumes" && sel.name === v.name;
        return (
          <motion.div
            key={v.name}
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => onSelect(selected ? null : { kind: "volumes", name: v.name })}
            className={`rounded-xl border p-3 cursor-pointer transition-colors ${
              selected ? "border-sky-400/70 bg-white/70 ring-2 ring-sky-200/70" : "bg-white/45 border-white/60 hover:border-sky-300/80"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">💾</span>
              <span className="font-mono text-sm font-semibold text-slate-800">{v.name}</span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono mt-1">{v.mountpoint}</div>
            {v.mountedBy.length > 0 && (
              <div className="flex gap-1.5 mt-1.5 flex-wrap">
                {v.mountedBy.map((m) => (
                  <span key={m} className="text-[10px] px-1.5 py-0.5 rounded bg-violet-50 text-violet-600 border border-violet-200 font-mono">被 {m} 挂载</span>
                ))}
              </div>
            )}
          </motion.div>
        );
      })}
    </>
  );
}

function EmptyPanel({ text }: { text: string }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full min-h-40 flex items-center justify-center text-sm text-slate-400 px-6 text-center">
      {text}
    </motion.div>
  );
}
