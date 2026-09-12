"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DemoLayerCache, DemoPortMap, DemoContainerVsVM, DemoOverlayFS, DemoReconcileLoop, DemoNamespace, DemoCgroups } from "@/components/container/demos";
import { LayersStack3DDemo, PortFlow3DDemo } from "@/components/container/Demo3D";

const TABS = [
  { key: "layer-cache", label: "🧱 分层缓存", tag: "2D", comp: <DemoLayerCache /> },
  { key: "port", label: "🔀 端口映射", tag: "2D", comp: <DemoPortMap /> },
  { key: "vm", label: "⚖️ 容器 vs 虚拟机", tag: "2D", comp: <DemoContainerVsVM /> },
  { key: "cow", label: "🥞 写时复制", tag: "2D", comp: <DemoOverlayFS /> },
  { key: "reconcile", label: "🔁 调和循环", tag: "K8s", comp: <DemoReconcileLoop /> },
  { key: "namespace", label: "🕶️ namespace", tag: "原理", comp: <DemoNamespace /> },
  { key: "cgroups", label: "⚡ cgroups", tag: "原理", comp: <DemoCgroups /> },
  { key: "layers3d", label: "🧊 镜像分层", tag: "3D", comp: <LayersStack3DDemo /> },
  { key: "port3d", label: "🚢 端口包流", tag: "3D", comp: <PortFlow3DDemo /> },
];

export default function DemosPage() {
  const [tab, setTab] = useState(TABS[4].key);
  const active = TABS.find((t) => t.key === tab)!;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-slate-800 mb-2">🎬 动画实验室</h1>
      <p className="text-slate-500 mb-6">
        概念不值得背，值得亲眼看一遍：2D 动画拆流程，Three.js 3D 场景可以拖拽旋转、点击探索。
        这些动画也内嵌在各课程正文里。
      </p>

      <div className="flex flex-wrap gap-2 mb-5">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`relative px-4 py-2 rounded-full text-sm font-medium transition-all ${
              tab === t.key ? "text-white" : "text-slate-600 hover:text-sky-700 bg-white/60 border border-white/80"
            }`}
          >
            {tab === t.key && (
              <motion.div layoutId="demo-tab-pill" className="absolute inset-0 rounded-full bg-sky-500 shadow-lg shadow-sky-300" transition={{ type: "spring", stiffness: 400, damping: 32 }} />
            )}
            <span className="relative z-10">{t.label}</span>
            <span className={`relative z-10 ml-1 text-[9px] px-1 py-0.5 rounded ${tab === t.key ? "bg-white/25 text-white" : "bg-sky-100 text-sky-600"}`}>{t.tag}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={active.key}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.22 }}
        >
          {active.comp}
        </motion.div>
      </AnimatePresence>

      <div className="text-xs text-slate-400 mt-6">
        💡 3D 场景支持拖拽旋转；「镜像分层」可以拉开层间距、点击每一层看它的故事；「端口包流」有洪峰模式和端口冲突剧本。
      </div>
    </div>
  );
}
