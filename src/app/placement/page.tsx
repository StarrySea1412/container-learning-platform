"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { quiz, tracks, type TrackId } from "@/data/placement";

const DOMAIN_LABEL: Record<string, string> = {
  docker: "Docker 基础",
  image: "镜像与构建",
  ops: "运维排障",
  k8s: "K8s 概念",
  principle: "底层原理",
};

function recommend(wrongDomains: string[]): TrackId {
  if (wrongDomains.length === 0) return "sre";
  if (wrongDomains.length >= 4) return "zero";
  // 错 1-3 题：重灾区在 docker/image 基础面 → 跳级轨补体系；ops/principle 薄弱 → SRE 轨
  const basic = wrongDomains.filter((d) => d === "docker" || d === "image").length;
  return basic > wrongDomains.length / 2 ? "skip" : "sre";
}

export default function PlacementPage() {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [revealed, setRevealed] = useState(false);

  const answeredAll = Object.keys(answers).length === quiz.length;
  const wrong = useMemo(
    () =>
      quiz.filter((q) => {
        const a = answers[q.id];
        return a === undefined || !q.options[a]?.correct;
      }),
    [answers]
  );
  const wrongDomains = [...new Set(wrong.map((q) => q.domain))];
  const track = tracks[recommend(wrongDomains)];

  const pick = (qid: string, idx: number) => {
    if (revealed) return;
    setAnswers((p) => ({ ...p, [qid]: idx }));
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-slate-800 mb-2">🎯 10 题定位测试</h1>
      <p className="text-slate-500 mb-8 max-w-3xl">
        十个真实场景，每个只有一个最佳答案。<strong className="text-slate-700">答错不丢人——每个选项的解析本身就是考点</strong>，
        做完按你的错误分布推荐学习轨道。
      </p>

      {/* 进度 */}
      <div className="mb-6 flex items-center gap-3">
        <div className="flex-1 h-2 rounded-full bg-slate-200/70 overflow-hidden">
          <motion.div
            className="h-full bg-sky-500 rounded-full"
            animate={{ width: `${(Object.keys(answers).length / quiz.length) * 100}%` }}
          />
        </div>
        <span className="text-xs text-slate-400 shrink-0">{Object.keys(answers).length}/{quiz.length}</span>
      </div>

      {/* 题目 */}
      <div className="space-y-5">
        {quiz.map((q, qi) => {
          const picked = answers[q.id];
          return (
            <div key={q.id} className="card p-5">
              <div className="flex items-start gap-3 mb-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-sky-500/15 text-sky-600 text-xs flex items-center justify-center font-bold mt-0.5">{qi + 1}</span>
                <p className="text-[15px] text-slate-800 leading-relaxed font-medium">{q.scene}</p>
              </div>
              <div className="space-y-2 ml-9">
                {q.options.map((o, oi) => {
                  const isPicked = picked === oi;
                  const showRight = revealed && o.correct;
                  const showWrong = revealed && isPicked && !o.correct;
                  return (
                    <button
                      key={oi}
                      onClick={() => pick(q.id, oi)}
                      className={`w-full text-left px-3.5 py-2.5 rounded-xl border text-sm transition-all ${
                        showRight
                          ? "border-emerald-400 bg-emerald-50/80 text-emerald-800"
                          : showWrong
                            ? "border-rose-300 bg-rose-50/80 text-rose-700"
                            : isPicked
                              ? "border-sky-400 bg-sky-50/80 text-slate-800"
                              : "border-white/60 bg-white/40 text-slate-600 hover:border-sky-300 hover:bg-white/70"
                      }`}
                    >
                      <span className="mr-2 font-mono text-xs opacity-60">{"ABCD"[oi]}</span>
                      {o.text}
                      {showRight && <span className="ml-2 text-emerald-600">✓ 最佳答案</span>}
                      {showWrong && <span className="ml-2 text-rose-500">✗ 你选的</span>}
                    </button>
                  );
                })}
              </div>
              <AnimatePresence>
                {revealed && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="ml-9 mt-3 overflow-hidden"
                  >
                    <div className="text-xs text-slate-600 bg-slate-50/80 border border-slate-200 rounded-xl px-3.5 py-2.5 leading-relaxed">
                      <strong className="text-slate-700">解析：</strong>{q.explanation}
                      <span className="ml-2 inline-block px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-600 text-[10px]">{DOMAIN_LABEL[q.domain]}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* 提交 / 结果 */}
      {!revealed ? (
        <div className="mt-8 text-center">
          <button
            onClick={() => setRevealed(true)}
            disabled={!answeredAll}
            className={`px-8 py-3 rounded-full font-bold transition-all ${
              answeredAll
                ? "bg-sky-500 text-white hover:bg-sky-600 shadow-lg shadow-sky-500/25"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            }`}
          >
            {answeredAll ? "交卷，看我的轨道推荐 →" : `还剩 ${quiz.length - Object.keys(answers).length} 题没答`}
          </button>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8"
        >
          <div className="card p-6 border-sky-200">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-4xl">{track.icon}</span>
              <div className="flex-1">
                <div className="text-xs text-slate-400">答对 {quiz.length - wrong.length}/{quiz.length}，为你推荐</div>
                <div className="text-xl font-bold text-slate-800">{track.title}</div>
                <div className="text-xs text-slate-500 mt-0.5">{track.tagline}</div>
              </div>
            </div>
            <p className="text-sm text-slate-600 mt-3 leading-relaxed">{track.desc}</p>
            {wrong.length > 0 && (
              <div className="text-xs text-slate-500 mt-2">
                你的薄弱域：<strong className="text-amber-700">{wrongDomains.map((d) => DOMAIN_LABEL[d]).join(" · ")}</strong>
              </div>
            )}
            <div className="mt-4 space-y-2">
              {track.path.map((p, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <span className="w-5 h-5 rounded-full bg-sky-500 text-white text-[11px] flex items-center justify-center shrink-0">{i + 1}</span>
                  {p.href ? (
                    <Link href={p.href} className="text-sky-600 hover:underline">{p.step}</Link>
                  ) : (
                    <span className="text-slate-600">{p.step}</span>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-5 flex gap-3 flex-wrap">
              <Link href="/courses" className="text-xs px-4 py-2 rounded-full bg-sky-500 text-white hover:bg-sky-600 transition-colors">从第一站开始 →</Link>
              <button
                onClick={() => { setAnswers({}); setRevealed(false); window.scrollTo({ top: 0 }); }}
                className="text-xs px-4 py-2 rounded-full border border-slate-300 text-slate-500 hover:border-sky-400 transition-colors"
              >
                重新测一遍
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
