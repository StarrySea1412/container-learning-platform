"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import SandboxClient from "@/components/container/SandboxClient";
import { challenges } from "@/data/challenges";
import { createSeedEngine, evaluateCheck } from "@/lib/container-sandbox-engine";
import type { Challenge } from "@/types";

const DIFF_COLOR: Record<string, string> = {
  "简单": "bg-emerald-100 text-emerald-700",
  "中等": "bg-amber-100 text-amber-700",
  "困难": "bg-rose-100 text-rose-700",
};

export default function ChallengesPage() {
  const [active, setActive] = useState<Challenge | null>(null);

  if (active) return <ChallengeRun challenge={active} onBack={() => setActive(null)} />;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-slate-800 mb-2">🚨 场景挑战 · 事故复盘</h1>
      <p className="text-slate-500 mb-8 max-w-3xl">
        带剧情的实战演练：每个挑战都从真实生产事故改编。初始故障现场已布置好，目标是可逐条验证的，
        实在卡住了再看提示和参考答案——<strong className="text-slate-700">高手和菜鸟看同一个挑战，收获的是不同的深度</strong>。
      </p>
      <div className="grid md:grid-cols-2 gap-4">
        {challenges.map((c) => (
          <button
            key={c.id}
            onClick={() => setActive(c)}
            className="card p-5 text-left hover:border-sky-300 hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl">{c.icon}</span>
              <div className="flex-1">
                <div className="font-bold text-slate-800 group-hover:text-sky-600 transition-colors">{c.title}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full ${DIFF_COLOR[c.difficulty]}`}>{c.difficulty}</span>
                  <span className="text-xs text-slate-400">⏱ 约 {c.minutes} 分钟</span>
                </div>
              </div>
            </div>
            <p className="text-sm text-slate-500 mt-3 leading-relaxed">{c.story}</p>
            <div className="text-xs text-sky-600 mt-3">{c.goals.length} 个验证目标 · 点击进入故障现场 →</div>
          </button>
        ))}
        <div className="card p-5 border-dashed opacity-60 flex flex-col justify-center">
          <div className="font-bold text-slate-400">更多事故筹备中</div>
          <div className="text-sm text-slate-400 mt-1 leading-relaxed">计划中的下一批：JVM 容器内存陷阱、日志撑爆磁盘、DNS 偶发 5 秒延迟。想看哪个事故的复盘？</div>
        </div>
      </div>
    </div>
  );
}

function ChallengeRun({ challenge: c, onBack }: { challenge: Challenge; onBack: () => void }) {
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [showSolution, setShowSolution] = useState(false);

  const check = useCallback((engine: import("@/lib/container-sandbox-engine").ContainerEngine) => {
    setDone((prev) => {
      const next = { ...prev };
      for (const g of c.goals) {
        if (!next[g.id] && evaluateCheck(engine, g.check)) next[g.id] = true;
      }
      return next;
    });
  }, [c]);

  const allDone = c.goals.every((g) => done[g.id]);
  const doneCount = c.goals.filter((g) => done[g.id]).length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <button onClick={onBack} className="text-xs text-slate-400 hover:text-sky-600 mb-4">← 返回挑战列表</button>

      <div className="card p-5 mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-4xl">{c.icon}</span>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-900">{c.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-[11px] px-2 py-0.5 rounded-full ${DIFF_COLOR[c.difficulty]}`}>{c.difficulty}</span>
              <span className="text-xs text-slate-400">⏱ 约 {c.minutes} 分钟</span>
            </div>
          </div>
        </div>
        <p className="text-sm text-slate-600 mt-3 leading-relaxed">{c.scene}</p>
      </div>

      {/* 目标清单 */}
      <div className="card p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold text-slate-700">🎯 验证目标（自动检测）</div>
          <span className="text-xs text-slate-400">{doneCount}/{c.goals.length}</span>
        </div>
        <div className="space-y-2">
          {c.goals.map((g, i) => (
            <motion.div key={g.id} className="flex items-start gap-3">
              <motion.span
                animate={done[g.id] ? { scale: [1, 1.4, 1] } : {}}
                className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0 ${
                  done[g.id] ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-400"
                }`}
              >
                {done[g.id] ? "✓" : i + 1}
              </motion.span>
              <div className="flex-1">
                <div className={`text-sm ${done[g.id] ? "text-emerald-700 line-through" : "text-slate-700"}`}>{g.desc}</div>
                <details className="mt-0.5">
                  <summary className="text-xs text-amber-600 cursor-pointer select-none">卡住了？看这一步的提示</summary>
                  <div className="text-xs text-slate-500 mt-1">{g.hint}</div>
                </details>
              </div>
            </motion.div>
          ))}
        </div>
        <AnimatePresence>
          {allDone && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-4 rounded-[20px] bg-emerald-50/60 backdrop-blur-xl border border-white/70 p-4"
            >
              <div className="font-bold text-emerald-700">🎉 事故解决！复盘要点</div>
              <div className="text-sm text-slate-600 mt-1.5 leading-relaxed">{c.takeaway}</div>
              <button
                onClick={() => setShowSolution(!showSolution)}
                className="text-xs px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-600 hover:border-sky-400 mt-3 transition-colors"
              >
                {showSolution ? "收起参考解法" : "对照参考解法"}
              </button>
              {showSolution && (
                <div className="term mt-2 rounded-lg p-3 text-xs space-y-1">
                  {c.solution.map((s, i) => <div key={i} className="c-g">$ <span className="text-slate-200">{s}</span></div>)}
                </div>
              )}
              <Link href="/challenges" className="inline-block text-xs text-sky-600 hover:underline mt-3 ml-2">下一个挑战 →</Link>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <SandboxClient
        key={c.id}
        seedCommands={c.initialCommands}
        seedFactory={() => createSeedEngine()}
        editableFile={c.editableFile}
        onAfterCommand={check}
        quickCommands={c.quickCommands ?? ["docker ps -a", "docker images"]}
        height="h-[520px]"
      />
    </div>
  );
}
