"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

const NAV = [
  { href: "/", label: "首页" },
  { href: "/courses", label: "课程" },
  { href: "/demos", label: "动画" },
  { href: "/sandbox", label: "沙盒" },
  { href: "/challenges", label: "挑战" },
  { href: "/resources", label: "资源" },
];

export default function GlassNav() {
  const [closed, setClosed] = useState(false); // 手动完全关闭（✕）
  const [autoHidden, setAutoHidden] = useState(false); // 下滑自动收起
  const lastY = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const dy = y - lastY.current;
      lastY.current = y;
      if (closed) return;
      if (y < 120) setAutoHidden(false);
      else if (dy > 6) setAutoHidden(true);
      else if (dy < -6) setAutoHidden(false);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [closed]);

  const hidden = closed || autoHidden;

  return (
    <>
      <AnimatePresence>
        {!hidden && (
          <motion.header
            key="nav"
            initial={{ y: -90, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="sticky top-0 z-50 px-4 pt-4 pb-2"
          >
            <div className="glass-nav max-w-5xl mx-auto h-14 flex items-center gap-4 pl-6 pr-2.5">
              <Link href="/" className="flex items-center gap-2 font-bold text-slate-800 shrink-0">
                <span className="text-xl">🐳</span>
                <span>容器学习平台</span>
                <span className="text-[10px] font-normal px-1.5 py-0.5 rounded-full bg-sky-500/15 text-sky-600 border border-sky-400/30">v0.1</span>
              </Link>
              <nav className="flex gap-0.5 ml-auto">
                {NAV.map((n) => (
                  <Link key={n.href} href={n.href} className="px-3.5 py-1.5 rounded-full text-sm text-slate-600 hover:text-sky-700 hover:bg-white/70 transition-all">
                    {n.label}
                  </Link>
                ))}
              </nav>
              {/* 液态玻璃关闭按钮：完全收起（不会随滚动自动回来） */}
              <button
                onClick={() => setClosed(true)}
                aria-label="收起导航"
                title="收起导航（下滑会自动隐藏，上滑恢复）"
                className="nav-glass-close shrink-0"
              >
                <svg width="13" height="13" viewBox="0 0 12 12" fill="none">
                  <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </motion.header>
        )}
      </AnimatePresence>

      {/* 隐藏时：右上角小玻璃按钮，点一下恢复 */}
      <AnimatePresence>
        {hidden && (
          <motion.button
            key="restore"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 24 }}
            onClick={() => { setClosed(false); setAutoHidden(false); }}
            aria-label="展开导航"
            title="展开导航"
            className="nav-glass-close fixed top-4 right-4 z-50 w-11 h-11"
          >
            <span className="text-lg leading-none">🐳</span>
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}
