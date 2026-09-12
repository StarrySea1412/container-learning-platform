"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ContainerEngine, TermLine, createSeedEngine, fmtSize } from "@/lib/container-sandbox-engine";

/* 首页迷你沙盒：真引擎驱动的 30 秒实操课（build → run ×N → rm）
 * 铁律：终端里的每一行都来自 container-sandbox-engine 的真实输出，不造假词；
 * 每个可点元素都是有名字的真实对象（镜像、容器卡片），无装饰粒子。 */

type Phase = "idle" | "building" | "built";
interface UILine { key: number; text: string; c?: TermLine["c"]; kind: "cmd" | "out" }
interface CardInfo { name: string; hostPort: number }

const COLOR: Record<NonNullable<TermLine["c"]>, string> = {
  g: "text-emerald-400", r: "text-rose-400", y: "text-amber-300",
  c: "text-cyan-300", d: "text-slate-500", w: "text-slate-100", b: "text-sky-300",
};
const MAX_CARDS = 4;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function HeroMiniLab() {
  const reduce = useReducedMotion();
  const engRef = useRef<ContainerEngine | null>(null);
  const termRef = useRef<HTMLDivElement>(null);
  const busyRef = useRef(false);
  const seq = useRef(0);

  const [lines, setLines] = useState<UILine[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [cards, setCards] = useState<CardInfo[]>([]);
  const [everRan, setEverRan] = useState(false);
  const [busy, setBusy] = useState(false);
  const [typing, setTyping] = useState<string | null>(null);
  const [tower, setTower] = useState(0); // 0-3：分层塔生长进度
  const [inspect, setInspect] = useState<null | "base" | "copy" | "meta">(null);

  const syncCards = () => {
    const eng = engRef.current;
    if (!eng) return;
    setCards(eng.runningContainers().map((c) => ({ name: c.name, hostPort: c.ports[0]?.hostPort ?? 0 })));
  };

  useEffect(() => {
    engRef.current ??= createSeedEngine();
    syncCards();
  }, []);

  useEffect(() => {
    termRef.current?.scrollTo({ top: termRef.current.scrollHeight });
  }, [lines, typing]);

  const pushLine = (l: Omit<UILine, "key">) => setLines((p) => [...p, { ...l, key: ++seq.current }]);
  const pushAll = (ls: TermLine[]) => setLines((p) => [...p, ...ls.map((l) => ({ key: ++seq.current, text: l.text, c: l.c, kind: "out" as const }))]);

  /** 打字 + 真实执行 + 逐行吐输出（按真实时间推进：标签页被切走再回来会立刻补上进度，不会卡成慢动作） */
  const runCmd = async (cmd: string) => {
    const eng = engRef.current;
    if (!eng || busyRef.current) return;
    busyRef.current = true; setBusy(true);
    pushLine({ text: cmd, kind: "cmd" });
    if (reduce) {
      setTyping(null);
    } else {
      const t0 = performance.now();
      await new Promise<void>((res) => {
        const iv = setInterval(() => {
          const n = Math.min(cmd.length, Math.floor((performance.now() - t0) / 22));
          setTyping(cmd.slice(0, n));
          if (n >= cmd.length) { clearInterval(iv); res(); }
        }, 40);
      });
      setTyping(null);
      await sleep(160);
    }
    const out = eng.exec(cmd);
    if (!reduce) {
      const t1 = performance.now();
      let shown = 0;
      await new Promise<void>((res) => {
        const iv = setInterval(() => {
          const want = Math.min(out.length, Math.floor((performance.now() - t1) / 70));
          if (want > shown) { pushAll(out.slice(shown, want)); shown = want; }
          if (shown >= out.length) { clearInterval(iv); res(); }
        }, 50);
      });
    } else pushAll(out);
    busyRef.current = false; setBusy(false);
    syncCards();
  };

  const build = async () => {
    await runCmd("docker build -t my-web:1.0 /root/web");
    const ok = !!engRef.current?.findImage("my-web:1.0");
    if (ok) { setPhase("built"); if (!reduce) { for (let i = 1; i <= 3; i++) { setTower(i); await sleep(180); } } else setTower(3); }
  };
  const runOne = async () => {
    const n = cards.length + 1;
    await runCmd(`docker run -d --name web-${n} -p ${8079 + n}:80 my-web:1.0`);
    setEverRan(true);
  };
  const rmOne = async (name: string) => { await runCmd(`docker rm -f ${name}`); };
  const curlIt = async () => { await runCmd(`curl localhost:8080`); };

  const image = engRef.current && phase === "built" ? engRef.current.findImage("my-web:1.0") : null;
  const atCap = phase === "built" && cards.length >= MAX_CARDS;

  return (
    <div className="card glass p-4 sm:p-5 rounded-3xl" aria-label="迷你沙盒演示">
      {/* 标题栏 */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="font-semibold text-slate-800 text-sm">🧪 迷你沙盒 · 点一下，真的跑给你看</div>
        <div className={`text-xs font-medium shrink-0 ${cards.length > 0 ? "text-emerald-600" : "text-slate-400"}`}>
          ● {cards.length} 个容器运行中
        </div>
      </div>

      {/* 终端 */}
      <div ref={termRef} className="rounded-2xl bg-slate-950/95 border border-slate-800 px-4 py-3 h-[190px] overflow-y-auto font-mono text-[12.5px] leading-relaxed">
        {lines.length === 0 && !typing && (
          <div className="text-slate-500">← 点下面的蓝色按钮开始（每行输出都是页面里真引擎算出来的）</div>
        )}
        {lines.map((l) => (
          <div key={l.key} className={`whitespace-pre-wrap break-all ${l.kind === "cmd" ? "text-slate-100 font-semibold" : COLOR[l.c ?? "w"]}`}>
            {l.kind === "cmd" ? <span className="text-emerald-400">$ </span> : null}{l.text}
          </div>
        ))}
        <div className="text-slate-100">
          <span className="text-emerald-400">$ </span>
          {typing ?? <span className="inline-block w-2 h-4 align-middle bg-slate-300 animate-pulse" aria-hidden />}
        </div>
      </div>

      {/* 镜像 + 分层塔（点分层可查看每层真实内容） */}
      <AnimatePresence>
        {image && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mt-3"
          >
            <div className="flex items-center gap-4">
              <div className="flex flex-col gap-1 shrink-0" aria-label="镜像分层">
                <motion.button
                  animate={{ scaleX: tower >= 1 ? 1 : 0 }} style={{ originX: 0 }} transition={{ type: "spring", stiffness: 200, damping: 22 }}
                  onClick={() => setInspect(inspect === "base" ? null : "base")}
                  title="点开看基础层装了什么"
                  aria-label="查看基础层内容"
                  className={`h-3.5 w-40 rounded-md bg-sky-300/80 cursor-pointer hover:bg-sky-300 transition-colors ${inspect === "base" ? "ring-2 ring-sky-500" : ""}`}
                />
                <motion.button
                  animate={{ scaleX: tower >= 2 ? 1 : 0 }} style={{ originX: 0 }} transition={{ type: "spring", stiffness: 200, damping: 22 }}
                  onClick={() => setInspect(inspect === "copy" ? null : "copy")}
                  title="点开看这一层新增的文件"
                  aria-label="查看网页层内容"
                  className={`h-3.5 w-40 rounded-md bg-emerald-300/80 cursor-pointer hover:bg-emerald-300 transition-colors ${inspect === "copy" ? "ring-2 ring-emerald-500" : ""}`}
                />
                <motion.button
                  animate={{ scaleX: tower >= 3 ? 1 : 0 }} style={{ originX: 0 }} transition={{ type: "spring", stiffness: 200, damping: 22 }}
                  onClick={() => setInspect(inspect === "meta" ? null : "meta")}
                  title="点开看 EXPOSE 到底改了什么"
                  aria-label="查看 EXPOSE 元数据说明"
                  className={`h-2 w-40 rounded-md border border-dashed border-slate-400/70 cursor-pointer hover:border-slate-500 transition-colors ${inspect === "meta" ? "ring-2 ring-slate-400" : ""}`}
                />
              </div>
              <div className="text-xs text-slate-500 leading-relaxed min-w-0">
                <div>基础层 · nginx:alpine</div>
                <div>网页层 · 我们改的 index.html</div>
                <div>EXPOSE 80 · 只写元数据，不加层</div>
                <div className="text-slate-400/80 mt-0.5">👆 点分层条，看每层真实装了什么</div>
              </div>
              <div className="ml-auto text-xs font-mono px-2.5 py-1.5 rounded-lg bg-white/70 border border-white/90 text-slate-600 shrink-0">
                📦 my-web:1.0 · {Math.round(image.layers.reduce((s, l) => s + l.sizeMB, 0))}MB
              </div>
            </div>
            <AnimatePresence>
              {inspect && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-2 rounded-xl bg-slate-50/90 border border-slate-200/80 px-3 py-2 font-mono text-[11.5px] leading-relaxed space-y-0.5">
                    {inspect === "copy" && (() => {
                      const copyLayer = image.layers.find((l) => l.instruction.startsWith("COPY"));
                      const added = copyLayer?.filesAdded ?? {};
                      return (
                        <>
                          <div className="text-slate-500 font-semibold">网页层：{copyLayer?.instruction ?? "COPY"}</div>
                          {Object.keys(added).length === 0 && <div className="text-slate-400">（该层未记录到文件变化）</div>}
                          {Object.entries(added).map(([p, c]) => (
                            <div key={p}>
                              <span className="text-emerald-600 font-semibold">+ {p}</span>
                              <span className="text-slate-400"> · {fmtSize(c.length / 1024 / 1024)}</span>
                              <div className="text-slate-400 truncate">│ {c.split("\n").find((x) => x.trim())?.slice(0, 64)}</div>
                            </div>
                          ))}
                        </>
                      );
                    })()}
                    {inspect === "base" && (() => {
                      const base = engRef.current?.findImage("nginx:alpine");
                      const files = Object.entries(base?.files ?? {});
                      const totalMB = base?.layers.reduce((s, l) => s + l.sizeMB, 0) ?? 0;
                      return (
                        <>
                          <div className="text-slate-500 font-semibold">基础层：FROM nginx:alpine（官方镜像，{base?.layers.length ?? "-"} 个 registry 层 · 共 {fmtSize(totalMB)}）</div>
                          {files.map(([p, c]) => (
                            <div key={p}>
                              <span className="text-sky-600 font-semibold">· {p}</span>
                              <span className="text-slate-400"> · {fmtSize(c.length / 1024 / 1024)}</span>
                              <div className="text-slate-400 truncate">│ {c.split("\n").find((x) => x.trim())?.slice(0, 64)}</div>
                            </div>
                          ))}
                          <div className="text-slate-400">基础层的内容由官方构建，我们只往上叠自己的层。</div>
                        </>
                      );
                    })()}
                    {inspect === "meta" && (
                      <div className="text-slate-600">
                        EXPOSE 80 <span className="text-slate-400">—— 不新增文件层。它只是往镜像配置里写一句「这个镜像打算用 80 端口」，是给使用者（和 docker run -P）看的说明书，所以塔上是虚线。</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 容器卡片 */}
      <div className="mt-3 min-h-[52px] flex flex-wrap gap-2 items-center" aria-live="polite">
        <AnimatePresence>
          {cards.map((c) => (
            <motion.button
              key={c.name}
              layout
              initial={{ opacity: 0, scale: 0.7, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.6, y: -8 }}
              transition={{ type: "spring", stiffness: 320, damping: 24 }}
              onClick={() => rmOne(c.name)}
              disabled={busy}
              title={`点击 = docker rm -f ${c.name}`}
              aria-label={`删除容器 ${c.name}`}
              className="group cursor-pointer flex items-center gap-2 px-3 py-2 rounded-xl bg-white/75 border border-white/95 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all disabled:opacity-60"
            >
              <span className="font-mono text-sm font-bold text-slate-700">{c.name}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-100 text-sky-700 border border-sky-200">:{c.hostPort}</span>
              <span className="text-[10px] text-emerald-500 font-medium">● 运行中</span>
              <span className="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">🗑 删</span>
            </motion.button>
          ))}
        </AnimatePresence>
        {everRan && cards.length === 0 && !busy && (
          <div className="text-xs text-slate-400">0 个容器在跑——镜像 my-web:1.0 还在，上面再跑一个？</div>
        )}
        {cards.length === 0 && !everRan && (
          <div className="text-xs text-slate-300">跑起来之后，每个容器会在这里领到自己的名字和端口</div>
        )}
      </div>

      {/* 操作区 */}
      <div className="mt-3 flex flex-wrap gap-2 items-center">
        {phase === "idle" ? (
          <button
            onClick={build} disabled={busy}
            className="glass-btn glass-btn-primary cursor-pointer font-mono text-sm animate-[heropulse_2.2s_ease-in-out_infinite] motion-reduce:animate-none disabled:opacity-60"
          >
            {busy ? "⏳ 构建中…" : "▶ docker build -t my-web:1.0 /root/web"}
          </button>
        ) : (
          <button
            onClick={runOne} disabled={busy || atCap}
            title={atCap ? "端口占满了，先删一个容器再跑" : "同一个镜像，再跑一个全新容器"}
            className="glass-btn glass-btn-primary cursor-pointer font-mono text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? "⏳ 运行中…" : `▶ docker run -d --name web-${cards.length + 1} -p ${8080 + cards.length}:80 my-web:1.0`}
          </button>
        )}
        {phase === "built" && cards.length > 0 && (
          <button onClick={curlIt} disabled={busy}
            className="glass-btn cursor-pointer font-mono text-xs sm:text-sm disabled:opacity-60">
            🔎 验证：curl localhost:{cards[0]?.hostPort ?? 8080}
          </button>
        )}
      </div>
      {atCap && <div className="mt-2 text-xs text-amber-600">⚠ 8080–8083 占满了——真实机器的端口也是有限的，点上面的容器卡片删掉一个试试</div>}
      <div className="mt-2.5 text-xs text-slate-400">
        想敲更多命令？<Link href="/sandbox" className="text-sky-600 hover:underline">打开完整沙盒（60+ 条命令）→</Link>
      </div>
    </div>
  );
}
