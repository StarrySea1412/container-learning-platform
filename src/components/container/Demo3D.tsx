"use client";

import dynamic from "next/dynamic";

const loading = () => (
  <div className="h-[440px] rounded-[22px] flex flex-col items-center justify-center gap-3 bg-slate-900 text-slate-400 text-sm border border-white/30">
    <span className="text-2xl animate-bounce">🧊</span>
    3D 场景加载中（WebGL）…
  </div>
);

export const LayersStack3DDemo = dynamic(() => import("./three/LayerStack3D"), { ssr: false, loading });
export const PortFlow3DDemo = dynamic(() => import("./three/PortFlow3D"), { ssr: false, loading });
export const HeroConcept3DDemo = dynamic(() => import("./three/HeroConcept3D"), { ssr: false, loading: () => <div className="h-[440px] rounded-[26px] bg-slate-900 animate-pulse" /> });
