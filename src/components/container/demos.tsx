"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ---------- 分层与缓存 ---------- */
const BASE_LAYERS = [
  { label: "FROM node:20-alpine", note: "基础镜像", size: "130MB", key: "base" },
  { label: "COPY package.json .", note: "只拷依赖清单", size: "0.1MB", key: "pkg" },
  { label: "RUN npm ci --omit=dev", note: "装依赖（最慢）", size: "22MB", key: "npm" },
  { label: "COPY . .", note: "拷贝业务代码", size: "0.4MB", key: "src" },
  { label: "CMD [\"node\", \"server.js\"]", note: "元数据", size: "0MB", key: "cmd" },
];

export function DemoLayerCache() {
  const [stage, setStage] = useState<0 | 1 | 2>(0); // 0 未构建 1 首次构建 2 改 index.html 后重建
  const [built, setBuilt] = useState(false);
  const build = () => { setStage(1); setBuilt(true); };
  const rebuild = () => setStage(2);

  return (
    <div className="card p-4 my-4">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <div className="text-sm font-semibold text-slate-700">🧱 交互：镜像分层与构建缓存</div>
        <div className="flex gap-2">
          {!built
            ? <button onClick={build} className="text-xs px-3 py-1.5 rounded-lg bg-sky-500 text-white hover:bg-sky-600">▶ docker build .</button>
            : <button onClick={rebuild} disabled={stage === 2} className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-40">✏️ 改 index.html 后重新构建</button>}
          <button onClick={() => { setStage(0); setBuilt(false); }} className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 text-slate-500 hover:bg-slate-50">重置</button>
        </div>
      </div>
      <div className="space-y-1.5">
        {BASE_LAYERS.map((l, i) => {
          // 缓存规则：某层失效，它之上全部失效
          const cached = stage === 2 && i < 3;
          const justBuilt = stage === 2 && i >= 3;
          const visible = built;
          return (
            <AnimatePresence key={l.key}>
              {visible && (
                <motion.div
                  initial={{ opacity: 0, y: 14, scaleY: 0.6 }}
                  animate={{ opacity: 1, y: 0, scaleY: 1 }}
                  transition={{ delay: stage === 1 ? i * 0.16 : (cached ? i * 0.08 : 0.3 + (i - 3) * 0.16) }}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg border font-mono text-xs ${
                    cached ? "border-emerald-300 bg-emerald-50" : justBuilt ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-sans ${
                    cached ? "bg-emerald-500 text-white" : justBuilt ? "bg-amber-500 text-white" : "bg-slate-300 text-slate-600"
                  }`}>{cached ? "CACHED" : justBuilt ? "REBUILT" : "built"}</span>
                  <span className="text-slate-700">{l.label}</span>
                  <span className="text-slate-400 font-sans">{l.note}</span>
                  <span className="ml-auto text-slate-400">{l.size}</span>
                </motion.div>
              )}
            </AnimatePresence>
          );
        })}
      </div>
      {stage === 2 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-slate-500 mt-3 leading-relaxed">
          ⚡ 关键洞察：<strong className="text-emerald-600">前 3 层直接复用缓存</strong>（package.json 没变，npm ci 就不用重跑），只有改过的
          COPY . . 之上被重建。<strong>把最常变的层放最上面，最稳定的层放最下面</strong>——这一条排序策略就是 CI 提速 10 倍的秘密。
        </motion.div>
      )}
      {stage === 1 && (
        <div className="text-xs text-slate-500 mt-3">首次构建：5 层从下到上依次生成。现在假装你改了一行 index.html，再构建一次 →</div>
      )}
    </div>
  );
}

/* ---------- 端口映射 ---------- */
export function DemoPortMap() {
  const [phase, setPhase] = useState<0 | 1 | 2 | 3>(0); // 0 初始 1 数据包飞行 2 冲突演示 3 完成
  const fly = () => { setPhase(1); setTimeout(() => setPhase(3), 1600); };
  return (
    <div className="card p-4 my-4">
      <div className="text-sm font-semibold text-slate-700 mb-3">🔀 交互：端口映射 -p 8080:80</div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
          <div className="text-xs text-slate-400 mb-1">你的电脑（宿主机）</div>
          <div className="font-mono text-sm text-slate-700">localhost:<span className="text-sky-600 font-bold">8080</span></div>
        </div>
        <div className="relative w-24 h-8">
          {phase === 0 && <div className="text-center text-[10px] text-slate-400 pt-2">-p 8080:80</div>}
          {phase >= 1 && (
            <motion.div
              initial={{ x: -46, opacity: 0 }}
              animate={{ x: 46, opacity: [0, 1, 1, 0] }}
              transition={{ duration: 1.4, ease: "easeInOut" }}
              className="absolute top-1/2 -mt-2 left-1/2 w-4 h-4 rounded-full bg-sky-500"
            />
          )}
          <div className="absolute bottom-0 left-0 right-0 border-t-2 border-dashed border-sky-300" />
        </div>
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-center">
          <div className="text-xs text-sky-400 mb-1">容器内（隔离世界）</div>
          <div className="font-mono text-sm text-slate-700">:<span className="text-sky-600 font-bold">80</span> nginx</div>
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <button onClick={fly} className="text-xs px-3 py-1.5 rounded-lg bg-sky-500 text-white hover:bg-sky-600">▶ curl localhost:8080</button>
        <button onClick={() => setPhase(2)} className="text-xs px-3 py-1.5 rounded-lg border border-rose-300 text-rose-500 hover:bg-rose-50">再起一个容器也抢 8080？</button>
      </div>
      <AnimatePresence>
        {phase === 2 && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-2 text-xs font-mono text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            docker: Bind for 0.0.0.0:8080 failed: <strong>port is already allocated</strong>
            <span className="font-sans text-slate-500"> —— 一个宿主机端口同时只能映射给一个容器，这就是最常见的报错之一。</span>
          </motion.div>
        )}
        {phase === 3 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 text-xs text-slate-500">
            ✓ 请求命中容器。记住方向：<strong>宿主机端口在左，容器端口在右</strong>；容器之间互访用容器端口，不用宿主机端口。
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------- 容器 vs 虚拟机 ---------- */
const VM_STACK = [
  { label: "App A", c: "bg-indigo-100 border-indigo-300" },
  { label: "Guest OS (2GB+)", c: "bg-rose-100 border-rose-300" },
  { label: "App B", c: "bg-indigo-100 border-indigo-300" },
  { label: "Guest OS (2GB+)", c: "bg-rose-100 border-rose-300" },
  { label: "Hypervisor", c: "bg-slate-100 border-slate-300" },
  { label: "Host OS + 硬件", c: "bg-slate-100 border-slate-300" },
];
const CT_STACK = [
  { label: "App A", c: "bg-sky-100 border-sky-300" },
  { label: "App B", c: "bg-sky-100 border-sky-300" },
  { label: "App C", c: "bg-sky-100 border-sky-300" },
  { label: "Docker Engine（共享内核，MB 级）", c: "bg-emerald-100 border-emerald-300" },
  { label: "Host OS + 硬件", c: "bg-slate-100 border-slate-300" },
];

export function DemoContainerVsVM() {
  const [side, setSide] = useState<"vm" | "ct">("ct");
  const stack = side === "vm" ? VM_STACK : CT_STACK;
  return (
    <div className="card p-4 my-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold text-slate-700">⚖️ 交互：容器 vs 虚拟机</div>
        <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs">
          <button onClick={() => setSide("vm")} className={`px-3 py-1.5 ${side === "vm" ? "bg-slate-700 text-white" : "bg-white text-slate-500"}`}>虚拟机</button>
          <button onClick={() => setSide("ct")} className={`px-3 py-1.5 ${side === "ct" ? "bg-sky-500 text-white" : "bg-white text-slate-500"}`}>容器</button>
        </div>
      </div>
      <div className="space-y-1.5 max-w-md mx-auto">
        <AnimatePresence mode="popLayout">
          {stack.map((s, i) => (
            <motion.div
              key={side + s.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ delay: i * 0.07 }}
              className={`px-3 py-2 rounded-lg border text-center font-mono text-xs ${s.c}`}
            >
              {s.label}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <motion.div key={side} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-slate-500 mt-3 text-center">
        {side === "vm"
          ? "每个虚拟机都拖着一个完整 Guest OS——启动按分钟计，镜像按 GB 计。"
          : "所有容器共享同一个内核，只打包应用与依赖——启动按秒计，镜像按 MB 计。"}
      </motion.div>
    </div>
  );
}

/* ---------- overlayfs 写时复制 ---------- */
export function DemoOverlayFS() {
  const [copied, setCopied] = useState(false);
  return (
    <div className="card p-4 my-4">
      <div className="text-sm font-semibold text-slate-700 mb-3">🥞 交互：overlayfs 与写时复制（CoW）</div>
      <div className="grid gap-1.5 max-w-md mx-auto">
        <motion.div layout className={`px-3 py-2.5 rounded-lg border text-center font-mono text-xs ${copied ? "border-amber-400 bg-amber-50 ring-2 ring-amber-200" : "border-dashed border-slate-300 bg-slate-50 text-slate-400"}`}>
          {copied ? "可写层（upperdir）：/etc/config ← 你修改的副本在这里" : "可写层（upperdir）：空的"}
        </motion.div>
        <motion.div layout className="px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-center font-mono text-xs text-slate-600">
          镜像层 #2：/app（你 COPY 进来的）
        </motion.div>
        <motion.div layout className="px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-center font-mono text-xs text-slate-600">
          镜像层 #1：/etc/config、/bin、/lib（基础镜像）
        </motion.div>
      </div>
      <div className="flex justify-center gap-2 mt-3">
        <button onClick={() => setCopied(true)} className="text-xs px-3 py-1.5 rounded-lg bg-sky-500 text-white hover:bg-sky-600">▶ 在容器里修改 /etc/config</button>
        <button onClick={() => setCopied(false)} className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 text-slate-500 hover:bg-slate-50">重置</button>
      </div>
      <AnimatePresence>
        {copied && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-slate-500 mt-3 text-center">
            镜像层是<strong className="text-slate-700">只读</strong>的。修改一个文件时，Docker 先把它<strong className="text-amber-600">整个复制到可写层</strong>再改——这就是写时复制。
            容器删除后可写层整个蒸发，镜像纹丝不动。这也是「容器删了数据就没了」的底层原因。
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------- K8s 声明式调和循环 ---------- */
interface KPod { id: number; name: string; version: "v1" | "v2"; status: "running" | "creating" | "terminating"; bornAt: number }
let kpodSeq = 100;
const k8sName = () => `pod-web-${Math.random().toString(36).slice(2, 7)}`;
// 初始 Pod 用固定名字：随机名会导致 SSR 与客户端水合不一致
const SEED_NAMES = ["pod-web-a1b2c", "pod-web-d4e5f", "pod-web-x7y8z"];

export function DemoReconcileLoop() {
  const seed = (): KPod[] => SEED_NAMES.map((name) => ({ id: ++kpodSeq, name, version: "v1" as const, status: "running" as const, bornAt: Date.now() - 99999 }));
  const [desired, setDesired] = useState(3);
  const [pods, setPods] = useState<KPod[]>(seed);
  const [log, setLog] = useState<string[]>(["—— 集群就绪：deployment/web 声明期望 3 个副本 ——"]);
  const [rolling, setRolling] = useState(false);
  const [step, setStep] = useState(0); // 控制器循环：0 观察 1 对比 2 行动
  const logBoxRef = useRef<HTMLDivElement>(null);

  const podsRef = useRef(pods); podsRef.current = pods;
  const desiredRef = useRef(desired); desiredRef.current = desired;
  const rollingRef = useRef(rolling); rollingRef.current = rolling;

  const addLogs = (lines: string[]) => setLog((p) => [...p.slice(-60), ...lines]);
  const addLog = (t: string) => addLogs([t]);

  // 控制器永不停歇：循环步骤高亮 + 调和节拍
  useEffect(() => {
    const iv = setInterval(() => setStep((s) => (s + 1) % 3), 850);
    return () => clearInterval(iv);
  }, []);
  useEffect(() => {
    const iv = setInterval(() => {
      const now = Date.now();
      const logs: string[] = [];
      let next = podsRef.current.map((p) => {
        if (p.status === "creating" && now - p.bornAt > 1300) { logs.push(`${p.name}: ContainerCreating → Running`); return { ...p, status: "running" as const }; }
        return p;
      });
      const dying = next.filter((p) => p.status === "terminating");
      if (dying.length) { next = next.filter((p) => p.status !== "terminating"); logs.push(`已删除 ${dying.map((d) => d.name).join("、")}`); }
      const alive = next.filter((p) => p.status !== "terminating");
      const wantRoll = rollingRef.current;
      const spawn = (version: "v1" | "v2", why: string) => {
        const name = k8sName();
        next = [...next, { id: ++kpodSeq, name, version, status: "creating", bornAt: now }];
        logs.push(`控制器: 实际 ${alive.length} ≠ 期望 ${desiredRef.current} → ${why} ${name}${version === "v2" ? "（v2 新版本）" : ""}`);
      };
      if (wantRoll) {
        const v2Total = next.filter((p) => p.version === "v2").length;
        const v1 = alive.find((p) => p.version === "v1");
        if (v2Total < desiredRef.current) spawn("v2", "滚动更新，创建");
        else if (v1) { next = next.map((p) => (p.id === v1.id ? { ...p, status: "terminating" as const } : p)); logs.push(`滚动更新: 新版本已就位，退役 ${v1.name}`); }
      } else if (alive.length < desiredRef.current) {
        spawn("v1", "自愈，创建");
      } else if (alive.length > desiredRef.current) {
        const victim = alive[0];
        next = next.map((p) => (p.id === victim.id ? { ...p, status: "terminating" as const } : p));
        logs.push(`控制器: 实际 ${alive.length} ≠ 期望 ${desiredRef.current} → 缩容 ${victim.name}`);
      }
      if (next !== podsRef.current) setPods(next);
      if (logs.length) addLogs(logs);
      if (wantRoll && next.length > 0 && !next.some((p) => p.version === "v1")) { setRolling(false); addLogs(["✓ 滚动更新完成：deployment/web 已全部运行 v2"]); }
    }, 900);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => { logBoxRef.current?.scrollTo({ top: logBoxRef.current.scrollHeight }); }, [log]);

  const deletePod = (p: KPod) => {
    if (p.status === "terminating") return;
    setPods((prev) => prev.map((x) => (x.id === p.id ? { ...x, status: "terminating" as const } : x)));
    addLogs([`$ kubectl delete pod ${p.name}`, `pod ${p.name}: Terminating`]);
  };
  const scale = (n: number) => {
    const clamped = Math.max(0, Math.min(8, n));
    setDesired(clamped);
    addLog(`$ kubectl scale deployment web --replicas=${clamped}`);
  };
  const startRolling = () => { setRolling(true); addLog(`$ kubectl set image deployment/web web=my-web:2.0`); };
  const reset = () => { setDesired(3); setPods(seed()); setRolling(false); setLog(["—— 集群已重置：deployment/web 期望 3 个副本 ——"]); };

  const running = pods.filter((p) => p.status === "running").length;
  const STEPS = ["① 观察", "② 对比", "③ 行动"];

  return (
    <div className="card p-4 my-4">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <div className="text-sm font-semibold text-slate-700">🔁 交互：声明式调和循环（K8s 的心脏）</div>
        <div className="flex gap-2">
          <button onClick={startRolling} disabled={rolling} className="text-xs px-3 py-1.5 rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-40">▶ kubectl set image（滚动更新 v2）</button>
          <button onClick={reset} className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 text-slate-500 hover:bg-slate-50">重置</button>
        </div>
      </div>
      <div className="grid md:grid-cols-[230px_1fr] gap-3">
        {/* 控制平面 */}
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-3">
          <div className="text-xs text-indigo-400 mb-1">Deployment 控制器（大脑，永不下班）</div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-extrabold text-indigo-600">{desired}</span>
            <span className="text-xs text-slate-500">期望副本</span>
            <span className="ml-auto text-xs text-slate-500">实际 <strong className={running === desired ? "text-emerald-600" : "text-amber-600"}>{running}</strong>/{desired}</span>
          </div>
          <div className="flex gap-1 mb-2">
            {STEPS.map((s, i) => (
              <div key={s} className={`flex-1 text-center text-[10px] px-1 py-1 rounded transition-colors ${i === step ? "bg-indigo-500 text-white" : "bg-white/70 text-slate-400 border border-indigo-100"}`}>{s}</div>
            ))}
          </div>
          <div className="text-[10px] text-slate-400 mb-2">↑ 每 0.85 秒循环一圈，集群一辈子都在做这三步</div>
          <div className="flex items-center gap-2">
            <button onClick={() => scale(desired - 1)} disabled={desired <= 0} className="w-7 h-7 rounded-lg bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-30">−</button>
            <span className="text-xs font-mono text-slate-600">replicas={desired}</span>
            <button onClick={() => scale(desired + 1)} disabled={desired >= 8} className="w-7 h-7 rounded-lg bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-30">＋</button>
            <span className="text-[10px] text-slate-400">= kubectl scale</span>
          </div>
        </div>
        {/* Pod 舰队 */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 min-h-[150px]">
          <div className="text-xs text-slate-400 mb-2">节点上的 Pod（点任意 Pod = kubectl delete pod，看控制器怎么救）</div>
          <div className="flex flex-wrap gap-2">
            <AnimatePresence>
              {pods.map((p) => (
                <motion.button
                  key={p.id}
                  layout
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  transition={{ type: "spring", stiffness: 300, damping: 24 }}
                  onClick={() => deletePod(p)}
                  title={`点击删除 ${p.name}`}
                  className={`cursor-pointer px-2.5 py-1.5 rounded-lg border text-left font-mono text-[11px] transition-colors ${
                    p.status === "terminating" ? "border-rose-300 bg-rose-50 opacity-60"
                    : p.status === "creating" ? "border-amber-300 bg-amber-50"
                    : p.version === "v2" ? "border-indigo-300 bg-indigo-50 hover:bg-indigo-100"
                    : "border-slate-300 bg-white hover:bg-slate-100"
                  }`}
                >
                  <div className="text-slate-700">{p.name}</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`px-1 rounded text-[9px] ${p.version === "v2" ? "bg-indigo-500 text-white" : "bg-sky-500 text-white"}`}>{p.version}</span>
                    <span className={`text-[9px] ${p.status === "running" ? "text-emerald-500" : p.status === "creating" ? "text-amber-500" : "text-rose-400"}`}>● {p.status === "running" ? "Running" : p.status === "creating" ? "Creating…" : "Terminating"}</span>
                  </div>
                </motion.button>
              ))}
            </AnimatePresence>
            {pods.length === 0 && <div className="text-xs text-slate-400 py-4">0 个 Pod——期望是 {desired}，控制器马上会补齐…</div>}
          </div>
        </div>
      </div>
      {/* 事件流 */}
      <div ref={logBoxRef} className="mt-3 h-24 overflow-y-auto rounded-xl bg-slate-950/95 border border-slate-800 px-3 py-2 font-mono text-[11px] leading-relaxed text-slate-300 term-scroll">
        {log.map((l, i) => (
          <div key={i} className={l.startsWith("$") ? "text-emerald-400 font-semibold" : l.startsWith("✓") ? "text-emerald-300" : l.includes("Terminating") ? "text-rose-300" : ""}>{l}</div>
        ))}
      </div>
      <div className="text-xs text-slate-500 mt-2">
        你从没告诉集群「怎么做」——你只写了「我要几个」。剩下的观察、对比、行动全是控制器自己转出来的。这就是「声明式」三个字的全部含义。
      </div>
    </div>
  );
}

/* ---------- namespace：进程的视野切换器 ---------- */
const NS_ITEMS = [
  { key: "pid", label: "PID 进程号", syscall: "clone(CLONE_NEWPID)", view: "进程编号重新从 1 数起" },
  { key: "mnt", label: "MNT 挂载", syscall: "pivot_root", view: "根目录 / 换成自己的" },
  { key: "net", label: "NET 网络", syscall: "clone(CLONE_NEWNET)", view: "自己的网卡、自己的 IP" },
  { key: "uts", label: "UTS 主机名", syscall: "clone(CLONE_NEWUTS)", view: "自己的 hostname" },
  { key: "ipc", label: "IPC 通信", syscall: "clone(CLONE_NEWIPC)", view: "自己的进程间通信通道" },
  { key: "user", label: "USER 用户", syscall: "clone(CLONE_NEWUSER)", view: "容器内可以是 root，宿主机不是" },
] as const;
type NsKey = (typeof NS_ITEMS)[number]["key"];

export function DemoNamespace() {
  const [ns, setNs] = useState<Partial<Record<NsKey, boolean>>>({});
  const on = (k: NsKey) => !!ns[k];
  const toggle = (k: NsKey) => setNs((p) => ({ ...p, [k]: !p[k] }));
  const allOn = NS_ITEMS.every((i) => on(i.key));
  const isolated = NS_ITEMS.filter((i) => on(i.key)).length;

  return (
    <div className="card p-4 my-4">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <div className="text-sm font-semibold text-slate-700">🕶️ 交互：namespace = 给进程戴 VR 眼镜</div>
        <button
          onClick={() => setNs(allOn ? {} : Object.fromEntries(NS_ITEMS.map((i) => [i.key, true])))}
          className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600"
        >
          {allOn ? "↩ 关掉所有隔离" : "▶ 六个全开 = 一个容器"}
        </button>
      </div>
      <div className="grid md:grid-cols-[1fr_1.2fr] gap-3">
        {/* 左：开关面板 */}
        <div className="space-y-1.5">
          {NS_ITEMS.map((item) => (
            <button
              key={item.key}
              onClick={() => toggle(item.key)}
              className={`w-full text-left px-3 py-2 rounded-lg border text-xs transition-colors cursor-pointer ${
                on(item.key) ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-slate-50 hover:bg-slate-100"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`w-7 text-center px-1 py-0.5 rounded text-[10px] font-semibold ${on(item.key) ? "bg-emerald-500 text-white" : "bg-slate-300 text-slate-600"}`}>
                  {on(item.key) ? "ON" : "OFF"}
                </span>
                <span className="font-semibold text-slate-700">{item.label}</span>
                <span className="ml-auto font-mono text-[10px] text-slate-400">{item.syscall}</span>
              </div>
              <div className={`mt-0.5 text-[11px] ${on(item.key) ? "text-emerald-600" : "text-slate-400"}`}>{item.view}</div>
            </button>
          ))}
        </div>
        {/* 右：进程看到的世界 */}
        <div className="rounded-xl bg-slate-950/95 border border-slate-800 p-3 font-mono text-[11.5px] leading-relaxed text-slate-300 overflow-x-auto">
          <div className="text-slate-500"># 进程 PID 789（sleep 300）看到的世界：</div>
          <div className="mt-1.5"><span className="text-emerald-400">$ </span>ps aux</div>
          {on("pid") ? (
            <div className="text-slate-200">root&nbsp;&nbsp;1&nbsp;&nbsp;0.0&nbsp;&nbsp;sleep 300<br /><span className="text-slate-500"># 全世界只有自己，它还是 1 号</span></div>
          ) : (
            <div className="text-slate-200">1 systemd&nbsp;&nbsp; 42 sshd&nbsp;&nbsp; <span className="text-amber-300">789 sleep 300</span>&nbsp;&nbsp; 4022 nginx<br /><span className="text-slate-500"># 能看到宿主机全家</span></div>
          )}
          <div className="mt-1.5"><span className="text-emerald-400">$ </span>hostname</div>
          <div className="text-slate-200">{on("uts") ? "container-3f9a" : "my-dev-pc"}</div>
          <div className="mt-1.5"><span className="text-emerald-400">$ </span>ip -4 addr</div>
          <div className="text-slate-200">{on("net") ? "lo: 127.0.0.1/8\neth0: 172.17.0.2/16（自己的小世界）".split("\n").map((s, i) => <div key={i}>{s}</div>) : "eth0: 192.168.1.66（宿主机的网卡）"}</div>
          <div className="mt-1.5"><span className="text-emerald-400">$ </span>ls /</div>
          <div className="text-slate-200">{on("mnt") ? "app  bin  etc  usr（自己的根文件系统）" : "home  etc  usr  opt  data（宿主机的盘子）"}</div>
          <AnimatePresence>
            {allOn && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 rounded-lg bg-emerald-500/15 border border-emerald-400/40 px-2.5 py-1.5 text-emerald-300 text-[11px]">
                ✓ 六个空间全隔离——这就是一个容器的雏形。内核还是同一个，改变的只是「它看见什么」。
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <div className="text-xs text-slate-500 mt-2">
        已开 {isolated}/6。namespace 不创造任何东西，它只<strong className="text-slate-700">改变进程的视野</strong>——隔离是「看不见」，不是「不存在」。
      </div>
    </div>
  );
}

/* ---------- cgroups：电表与闸门 ---------- */
export function DemoCgroups() {
  const [cpu, setCpu] = useState(1); // 限额：核
  const [mem, setMem] = useState(256); // 限额：MB
  const [load, setLoad] = useState(45); // 模拟业务流量 0-100
  const cpuNeed = (load / 100) * 2; // 业务最高想吃 2 核
  const cpuUse = Math.min(cpuNeed, cpu);
  const throttled = cpuNeed > cpu + 0.001;
  const memUse = Math.round((load / 100) * 300);
  const oomed = memUse > mem;

  return (
    <div className="card p-4 my-4">
      <div className="text-sm font-semibold text-slate-700 mb-3">⚡ 交互：cgroups = 给容器装电表（资源限额）</div>
      <div className="grid md:grid-cols-[1fr_1fr] gap-3">
        <div className="space-y-2.5">
          <div>
            <div className="flex justify-between text-xs text-slate-500 mb-1"><span>CPU 限额（--cpus）</span><span className="font-mono text-sky-600">{cpu.toFixed(1)} 核</span></div>
            <input type="range" min={0.2} max={2} step={0.1} value={cpu} onChange={(e) => setCpu(Number(e.target.value))} className="w-full accent-sky-500" />
          </div>
          <div>
            <div className="flex justify-between text-xs text-slate-500 mb-1"><span>内存限额（-m）</span><span className="font-mono text-sky-600">{mem} MB</span></div>
            <input type="range" min={64} max={512} step={32} value={mem} onChange={(e) => setMem(Number(e.target.value))} className="w-full accent-sky-500" />
          </div>
          <div>
            <div className="flex justify-between text-xs text-slate-500 mb-1"><span>业务流量（模拟负载）</span><span className="font-mono text-amber-600">{load}%</span></div>
            <input type="range" min={0} max={100} step={5} value={load} onChange={(e) => setLoad(Number(e.target.value))} className="w-full accent-amber-500" />
          </div>
          <div className="rounded-lg bg-slate-50 border border-slate-200 px-2.5 py-1.5 font-mono text-[11px] text-slate-600 truncate">
            $ docker run --cpus={cpu.toFixed(1)} -m {mem}m my-app
          </div>
        </div>
        <div className="space-y-2.5">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-500">CPU 用量 / 限额</span>
              <span className={`font-mono ${throttled ? "text-amber-600 font-semibold" : "text-emerald-600"}`}>{cpuUse.toFixed(2)} / {cpu.toFixed(1)} 核{throttled ? " · 被限流" : ""}</span>
            </div>
            <div className="h-3.5 rounded-full bg-slate-100 border border-slate-200 overflow-hidden">
              <motion.div animate={{ width: `${Math.min(100, (cpuUse / 2) * 100)}%` }} className={`h-full ${throttled ? "bg-amber-400" : "bg-emerald-400"}`} />
            </div>
            {throttled && <div className="text-[11px] text-amber-600 mt-0.5">业务想吃 {cpuNeed.toFixed(2)} 核，但闸门只有 {cpu.toFixed(1)} 核——不报错，只是变慢（throttle）</div>}
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-500">内存用量 / 限额</span>
              <span className={`font-mono ${oomed ? "text-rose-500 font-semibold" : "text-emerald-600"}`}>{memUse} / {mem} MB{oomed ? " · 超限！" : ""}</span>
            </div>
            <div className="h-3.5 rounded-full bg-slate-100 border border-slate-200 overflow-hidden">
              <motion.div animate={{ width: `${Math.min(100, (memUse / 512) * 100)}%` }} className={`h-full ${oomed ? "bg-rose-400" : "bg-sky-400"}`} />
            </div>
          </div>
          <AnimatePresence>
            {oomed ? (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-xs font-mono text-rose-500 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                容器被内核 OOM 杀掉：<strong>exit 137 (OOMKilled)</strong>
                <span className="font-sans text-slate-500"> —— 和 Docker 篇那个 137 是同一把刀：超内存限制，内核直接开杀，控制器都救不了「吃太多」。</span>
              </motion.div>
            ) : (
              <div className="text-xs text-slate-500">内存也没到线。试试把流量拉满、再把两个限额拧小——感受 CPU「排队变慢」和内存「直接被杀」的区别。</div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <div className="text-xs text-slate-500 mt-3">
        namespace 管「<strong className="text-slate-700">看不见</strong>」，cgroups 管「<strong className="text-slate-700">用不多</strong>」。两样凑齐，一个普通进程才变成受约束的容器。
      </div>
    </div>
  );
}

/* ---------- 注册表 ---------- */
import { LayersStack3DDemo, PortFlow3DDemo } from "./Demo3D";

export function DemoRenderer({ name }: { name: string }) {
  switch (name) {
    case "layer-cache": return <DemoLayerCache />;
    case "port-map": return <DemoPortMap />;
    case "container-vm": return <DemoContainerVsVM />;
    case "overlayfs": return <DemoOverlayFS />;
    case "namespace-view": return <DemoNamespace />;
    case "cgroups-meter": return <DemoCgroups />;
    case "reconcile-loop": return <DemoReconcileLoop />;
    case "layers-3d": return <LayersStack3DDemo />;
    case "port-3d": return <PortFlow3DDemo />;
    default: return null;
  }
}
