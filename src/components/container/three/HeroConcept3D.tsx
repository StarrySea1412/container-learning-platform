"use client";

import { useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { RoundedBox, Html, Float, Sparkles } from "@react-three/drei";
import * as THREE from "three";

/* ============================================================
 * Hero 概念场景：一次构建 → 多处运行
 * 左：镜像 = 分层堆叠（Dockerfile 各层）合并成一个镜像盒
 * 右：每点一次 docker run，就从镜像派生一个容器（点容器 = docker rm）
 * 这就是本站第一课的心智模型：镜像是类，容器是实例。
 * ============================================================ */

const LAYERS = [
  { color: "#60a5fa", h: 0.16 },
  { color: "#818cf8", h: 0.1 },
  { color: "#34d399", h: 0.34 },
  { color: "#fbbf24", h: 0.12 },
];

function ImageStack({ count }: { count: number }) {
  const g = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (g.current) g.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.4) * 0.18;
  });
  let acc = -0.36;
  return (
    <group ref={g} position={[-3.3, 0, 0]}>
      {LAYERS.map((l, i) => {
        const y = acc + l.h / 2;
        acc += l.h + 0.07;
        return (
          <RoundedBox key={i} args={[2.1, l.h, 1.5]} radius={0.045} position={[0, y, 0]}>
            <meshStandardMaterial color={l.color} emissive={l.color} emissiveIntensity={0.22} metalness={0.25} roughness={0.3} />
          </RoundedBox>
        );
      })}
      <Html center position={[0, -1.15, 0]} zIndexRange={[10, 0]}>
        <div className="px-2.5 py-1 rounded-full text-[11px] font-mono bg-white/85 text-slate-700 border border-white whitespace-nowrap">
          📦 镜像 my-app:1.0（只读模板）
        </div>
      </Html>
      <Html center position={[0, 0.95, 0]} zIndexRange={[10, 0]}>
        <div className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-white/50 text-slate-500 border border-white/70 whitespace-nowrap">
          Dockerfile 分层
        </div>
      </Html>
    </group>
  );
}

function PulseLine({ active }: { active: boolean }) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const N = 5;
  useFrame(({ clock }) => {
    if (!active) {
      refs.current.forEach((m) => { if (m) (m.material as THREE.MeshStandardMaterial).opacity = 0; });
      return;
    }
    const t = clock.getElapsedTime();
    refs.current.forEach((m, i) => {
      if (!m) return;
      const p = (t * 0.55 + i / N) % 1;
      m.position.set(-1.9 + p * 2.6, Math.sin(p * Math.PI) * 0.55 - 0.1, 0);
      (m.material as THREE.MeshStandardMaterial).opacity = Math.sin(p * Math.PI) * 0.9;
    });
  });
  return (
    <>
      {Array.from({ length: N }).map((_, i) => (
        <mesh key={i} ref={(el) => { refs.current[i] = el; }}>
          <sphereGeometry args={[0.06, 12, 12]} />
          <meshStandardMaterial color="#7dd3fc" emissive="#38bdf8" emissiveIntensity={2.4} transparent opacity={0} />
        </mesh>
      ))}
    </>
  );
}

function ContainerBox({ c, onKill }: { c: { id: number; name: string; baseX: number; baseY: number; baseZ: number }; onKill: (id: number) => void }) {
  const g = useRef<THREE.Group>(null);
  const born = useRef(-1);
  const dying = useRef(false);
  useFrame(({ clock }) => {
    if (!g.current) return;
    const t = clock.getElapsedTime();
    if (born.current < 0) born.current = t;
    const age = t - born.current;
    const pop = Math.min(1, age / 0.45);
    const target = dying.current ? 0.001 : 0.2 + (1 - Math.pow(1 - pop, 3)) * 0.8; // easeOutCubic
    g.current.scale.setScalar(THREE.MathUtils.lerp(g.current.scale.x, target, 0.16));
    g.current.position.y = c.baseY + Math.sin(t * 1.5 + c.id) * 0.06;
  });
  return (
    <group ref={g} position={[c.baseX, c.baseY, c.baseZ]}
      onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { document.body.style.cursor = "auto"; }}
      onClick={(e) => { e.stopPropagation(); dying.current = true; setTimeout(() => onKill(c.id), 320); }}
    >
      <RoundedBox args={[1.35, 1.35, 1.35]} radius={0.14}>
        <meshStandardMaterial color="#0ea5e9" transparent opacity={0.32} emissive="#38bdf8" emissiveIntensity={0.4} metalness={0.2} roughness={0.18} />
      </RoundedBox>
      <Html center zIndexRange={[10, 0]}>
        <div className="px-1.5 py-0.5 rounded-full text-[9.5px] font-mono bg-sky-500/85 text-white border border-sky-300 whitespace-nowrap">
          {c.name}
        </div>
      </Html>
    </group>
  );
}

const SLOT: Record<number, [number, number, number]> = {
  0: [2.7, 0.95, 0.4],
  1: [4.15, 0.35, -0.5],
  2: [2.6, -0.85, -0.4],
  3: [4.2, -1.0, 0.6],
  4: [3.35, 1.5, -0.9],
};

export default function HeroConcept3D() {
  const [containers, setContainers] = useState<{ id: number; name: string; baseX: number; baseY: number; baseZ: number }[]>([
    { id: 1, name: "web-1", baseX: SLOT[0][0], baseY: SLOT[0][1], baseZ: SLOT[0][2] },
  ]);
  const [nextId, setNextId] = useState(2);

  const run = () => {
    if (containers.length >= 5) return;
    const id = nextId;
    const slot = SLOT[(id - 1) % 5];
    setContainers((cs) => [...cs, { id, name: `web-${id}`, baseX: slot[0], baseY: slot[1], baseZ: slot[2] }]);
    setNextId(id + 1);
  };
  const kill = (id: number) => setContainers((cs) => cs.filter((c) => c.id !== id));

  return (
    <div className="relative h-[440px] rounded-[26px] overflow-hidden border border-white/40 bg-gradient-to-b from-sky-950/85 via-slate-950/90 to-indigo-950/85 shadow-[0_20px_60px_rgba(2,60,120,0.35)]">
      <Canvas camera={{ position: [0.4, 0.4, 9.6], fov: 44 }} dpr={[1, 1.75]}>
        <color attach="background" args={["#060b18"]} />
        <ambientLight intensity={0.8} />
        <directionalLight position={[5, 8, 7]} intensity={1.5} />
        <pointLight position={[-6, -2, -4]} intensity={0.6} color="#818cf8" />
        <Sparkles count={45} scale={[12, 7, 6]} size={1.9} speed={0.3} color="#93c5fd" opacity={0.5} />
        <Float speed={1.1} floatIntensity={0.2}>
          <ImageStack count={containers.length} />
        </Float>
        <PulseLine active={containers.length > 0} />
        {containers.map((c) => (
          <ContainerBox key={c.id} c={c} onKill={kill} />
        ))}
      </Canvas>

      <div className="absolute top-4 left-4 text-[11px] text-sky-200/90 bg-white/10 border border-white/20 backdrop-blur-xl rounded-full px-3.5 py-1.5">
        一次构建 📦 → 多处运行 🚢 —— 这就是容器
      </div>

      <div className="absolute left-3 bottom-3 right-3 flex flex-wrap items-center gap-2 bg-white/10 backdrop-blur-xl border border-white/25 rounded-2xl px-4 py-2.5">
        <button
          onClick={run}
          disabled={containers.length >= 5}
          className="text-xs px-3.5 py-1.5 rounded-full font-mono font-medium bg-sky-500 text-white hover:bg-sky-400 disabled:opacity-40 transition-all"
        >
          $ docker run -d my-app:1.0
        </button>
        <span className="text-[11px] text-emerald-300 font-mono">● {containers.length} 个容器运行中</span>
        <span className="text-[11px] text-slate-300 ml-auto hidden sm:inline">点容器 = docker rm（试试全部删掉）</span>
      </div>
    </div>
  );
}
