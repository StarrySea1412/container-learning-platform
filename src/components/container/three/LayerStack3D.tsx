"use client";

import { useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, RoundedBox, Html, Float, Sparkles } from "@react-three/drei";
import * as THREE from "three";

export interface Layer3DItem {
  label: string;
  note: string;
  size: string;
  color: string;
}

export const DEMO_LAYERS: Layer3DItem[] = [
  { label: "FROM node:20-alpine", note: "基础镜像（只读）", size: "130MB", color: "#60a5fa" },
  { label: "COPY package.json ./", note: "依赖清单", size: "0.1MB", color: "#818cf8" },
  { label: "RUN npm ci", note: "安装依赖（缓存命中层）", size: "22MB", color: "#34d399" },
  { label: "COPY . .", note: "业务代码（最常变）", size: "0.4MB", color: "#fbbf24" },
  { label: 'CMD ["node", "server.js"]', note: "启动元数据", size: "0MB", color: "#f472b6" },
];

function Slab({ item, index, total, gap, selected, onSelect }: {
  item: Layer3DItem; index: number; total: number; gap: number;
  selected: number | null; onSelect: (i: number | null) => void;
}) {
  const [hover, setHover] = useState(false);
  const y = (index - (total - 1) / 2) * gap;
  const active = hover || selected === index;
  return (
    <Float speed={2.2} floatIntensity={0.12} rotationIntensity={0.04}>
      <RoundedBox
        args={[4.6, 0.5, 2.6]}
        radius={0.11}
        position={[0, y, 0]}
        onClick={(e) => { e.stopPropagation(); onSelect(selected === index ? null : index); }}
        onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { setHover(false); document.body.style.cursor = "auto"; }}
      >
        <meshStandardMaterial
          color={item.color}
          transparent
          opacity={active ? 0.96 : 0.74}
          emissive={item.color}
          emissiveIntensity={active ? 0.55 : 0.12}
          metalness={0.2}
          roughness={0.22}
        />
      </RoundedBox>
      <Html center position={[0, y, 1.75]} zIndexRange={[10, 0]}>
        <div
          className={`px-2 py-0.5 rounded-full border text-[10px] font-mono whitespace-nowrap backdrop-blur-md transition-all ${
            active ? "bg-white/90 text-slate-800 border-white shadow-lg scale-105" : "bg-white/45 text-slate-500 border-white/60"
          }`}
        >
          {item.label} · {item.size}
        </div>
      </Html>
    </Float>
  );
}

export default function LayerStack3D({ layers = DEMO_LAYERS }: { layers?: Layer3DItem[] }) {
  const [gap, setGap] = useState(1.1);
  const [selected, setSelected] = useState<number | null>(null);
  const sel = selected !== null ? layers[selected] : null;

  return (
    <div className="relative rounded-[22px] overflow-hidden border border-white/50 bg-gradient-to-b from-sky-950/90 via-slate-900/90 to-indigo-950/90" style={{ height: 440 }}>
      <Canvas camera={{ position: [5.4, 3.2, 6.6], fov: 42 }} dpr={[1, 1.75]}>
        <color attach="background" args={["#0a1120"]} />
        <ambientLight intensity={0.7} />
        <directionalLight position={[6, 8, 5]} intensity={1.4} />
        <pointLight position={[-6, -3, -4]} intensity={0.5} color="#38bdf8" />
        <Sparkles count={40} scale={[10, 7, 6]} size={2} speed={0.35} color="#7dd3fc" opacity={0.5} />
        <group onPointerMissed={() => setSelected(null)}>
          {layers.map((l, i) => (
            <Slab key={l.label} item={l} index={i} total={layers.length} gap={gap} selected={selected} onSelect={setSelected} />
          ))}
        </group>
        <OrbitControls enablePan={false} enableZoom={false} minPolarAngle={0.5} maxPolarAngle={1.45} autoRotate autoRotateSpeed={0.9} />
      </Canvas>

      {/* 悬浮控制条 */}
      <div className="absolute left-3 bottom-3 right-3 flex items-center gap-3 bg-white/10 backdrop-blur-xl border border-white/25 rounded-2xl px-4 py-2.5">
        <span className="text-xs text-sky-200 shrink-0">💥 拉开层间距</span>
        <input
          type="range" min={0.7} max={2.6} step={0.05} value={gap}
          onChange={(e) => setGap(parseFloat(e.target.value))}
          className="flex-1 accent-sky-400"
        />
        <span className="text-[11px] text-slate-300 shrink-0 hidden sm:inline">拖拽旋转 · 点击层查看</span>
      </div>

      {sel && (
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-xl border border-white/70 rounded-2xl px-4 py-3 max-w-[260px] shadow-xl">
          <div className="font-mono text-[11px] text-sky-700 font-semibold break-all">{sel.label}</div>
          <div className="text-xs text-slate-500 mt-1">{sel.note}</div>
          <div className="text-xs text-slate-400 mt-0.5">体积占用：{sel.size}</div>
        </div>
      )}
    </div>
  );
}
