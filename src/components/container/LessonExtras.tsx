"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { AdvancedNote, SandboxExercise } from "@/types";
import Markdown from "./Markdown";

/* ---------- 高手折叠区 ---------- */
export function AdvancedSection({ notes }: { notes: AdvancedNote[] }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="my-5 rounded-[20px] border border-white/60 bg-emerald-50/55 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] overflow-hidden">
      <button
        onClick={() => setOpen(open === -1 ? null : -1)}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-100/60 transition-colors"
      >
        <span>🧗</span> 高手折叠区（生产实战 / 源码 / 性能数据——菜鸟可跳过）
        <motion.span animate={{ rotate: open === -1 ? 180 : 0 }} className="ml-auto text-emerald-400 text-xs">▼</motion.span>
      </button>
      <AnimatePresence>
        {open === -1 && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-4 pb-4 space-y-3">
              {notes.map((n, i) => (
                <AdvancedItem key={i} note={n} index={i} open={open === i} onToggle={() => setOpen(open === i ? -1 : i)} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AdvancedItem({ note, index, open, onToggle }: { note: AdvancedNote; index: number; open: boolean; onToggle: () => void }) {
  return (
    <div className="rounded-lg border border-emerald-200 bg-white overflow-hidden">
      <button onClick={onToggle} className="w-full text-left px-3 py-2 text-sm font-medium text-slate-700 hover:bg-emerald-50 transition-colors flex items-center gap-2">
        <span className="text-emerald-500 font-mono text-xs">{String(index + 1).padStart(2, "0")}</span>
        {note.title}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-3 pb-3 text-sm text-slate-600">
              <Markdown>{note.body}</Markdown>
              {note.links && note.links.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {note.links.map((l) => (
                    <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="text-xs px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition-colors">
                      🔗 {l.label}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------- 沙盒练习任务 ---------- */
export function SandboxExerciseBlock({ exercise, sandboxHref }: { exercise: SandboxExercise; sandboxHref: string }) {
  const [showHint, setShowHint] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  return (
    <div className="my-5 rounded-[20px] border border-white/60 bg-sky-50/55 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] p-4">
      <div className="text-sm font-semibold text-sky-800 mb-1.5">🧪 沙盒任务（去 <a href={sandboxHref} className="underline underline-offset-2">沙盒</a> 里完成）</div>
      <div className="text-sm text-slate-700 leading-relaxed">{exercise.task}</div>
      <div className="flex flex-wrap gap-2 mt-3">
        {exercise.hint && (
          <button onClick={() => setShowHint(!showHint)} className="text-xs px-3 py-1.5 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors">
            💡 {showHint ? "收起提示" : "看提示"}
          </button>
        )}
        {exercise.solution && exercise.solution.length > 0 && (
          <button onClick={() => setShowSolution(!showSolution)} className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
            🔑 {showSolution ? "收起参考答案" : "参考答案（先自己试！）"}
          </button>
        )}
      </div>
      <AnimatePresence>
        {showHint && exercise.hint && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="mt-2 text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">{exercise.hint}</div>
          </motion.div>
        )}
        {showSolution && exercise.solution && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="term mt-2 rounded-lg p-3 text-xs space-y-1">
              {exercise.solution.map((c, i) => (
                <div key={i} className="c-g">$ <span className="text-slate-200">{c}</span></div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
