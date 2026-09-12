"use client";

import { useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, RoundedBox, Html, Sparkles } from "@react-three/drei";
import * as THREE from "three";

const curve = new THREE.QuadraticBezierCurve3(
  new THREE.Vector3(-3.6, -0.9, 0),
  new THREE.Vector3(-1.2, 2.6, 0),
  new THREE.Vector3(0.4, 1.15, 0),
);

function Packets({ count, speed }: { count: number; speed: number }) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    refs.current.forEach((m, i) => {
      if (!m) return;
      const p = (t * speed + i / count) % 1;
      const pos = curve.getPoint(p);
      m.position.copy(pos);
      const s = 0.5 + Math.sin(p * Math.PI) * 0.5;
      m.scale.setScalar(s);
      (m.material as THREE.MeshStandardMaterial).opacity = Math.sin(p * Math.PI) * 0.95;
    });
  });
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <mesh key={i} ref={(el) => { refs.current[i] = el; }}>
          <sphereGeometry args={[0.09, 16, 16]} />
          <meshStandardMaterial color="#7dd3fc" emissive="#38bdf8" emissiveIntensity={2.2} transparent />
        </mesh>
      ))}
    </>
  );
}

function ContainerBox({ color, label, sub, position, conflict }: {
  color: string; label: string; sub: string; position: [number, number, number]; conflict?: boolean;
}) {
  const box = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (box.current) box.current.position.y = position[1] + Math.sin(clock.getElapsedTime() * 1.4) * 0.08;
  });
  return (
    <group ref={box} position={position}>
      <RoundedBox args={[2.5, 1.9, 2.5]} radius={0.16}>
        <meshStandardMaterial color={color} transparent opacity={conflict ? 0.5 : 0.3} emissive={color} emissiveIntensity={conflict ? 0.7 : 0.22} metalness={0.1} roughness={0.15} />
      </RoundedBox>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.9, 0.55, 0.9]} />
        <meshStandardMaterial color="#ffffff" opacity={0.85} transparent emissive="#ffffff" emissiveIntensity={0.3} />
      </mesh>
      <Html center position={[0, 1.45, 0]} zIndexRange={[10, 0]}>
        <div className={`px-2.5 py-1 rounded-full text-[11px] font-mono whitespace-nowrap backdrop-blur-md border ${conflict ? "bg-rose-500/85 text-white border-rose-300" : "bg-white/80 text-slate-700 border-white"}`}>
          {label} {conflict && "· ⚡端口冲突"}
        </div>
      </Html>
      <Html center position={[0, -1.35, 0]} zIndexRange={[10, 0]}>
        <div className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-black/40 text-sky-200 border border-white/20 whitespace-nowrap">{sub}</div>
      </Html>
    </group>
  );
}

export default function PortFlow3D() {
  const [burst, setBurst] = useState(false);
  const [conflict, setConflict] = useState(false);

  return (
    <div className="relative rounded-[22px] overflow-hidden border border-white/50 bg-gradient-to-b from-slate-950/95 via-sky-950/90 to-slate-900/95" style={{ height: 440 }}>
      <Canvas camera={{ position: [0.5, 2.6, 7.4], fov: 44 }} dpr={[1, 1.75]}>
        <color attach="background" args={["#070d1a"]} />
        <ambientLight intensity={0.65} />
        <directionalLight position={[5, 9, 6]} intensity={1.3} />
        <pointLight position={[-5, 2, -3]} intensity={0.6} color="#38bdf8" />
        <Sparkles count={30} scale={[12, 6, 6]} size={1.8} speed={0.3} color="#7dd3fc" opacity={0.45} />

        {/* 宿主机地面 */}
        <RoundedBox args={[6.4, 0.35, 3.6]} radius={0.1} position={[-0.8, -1.25, 0]}>
          <meshStandardMaterial color="#1e293b" metalness={0.35} roughness={0.4} />
        </RoundedBox>
        <Html center position={[-0.8, -0.95, 1.95]} zIndexRange={[10, 0]}>
          <div className="px-2.5 py-1 rounded-full text-[11px] font-mono bg-white/85 text-slate-700 border border-white whitespace-nowrap">
            🖥️ 宿主机 · localhost:<b className="text-sky-600">8080</b>
          </div>
        </Html>

        {/* 容器 A（映射成功） */}
        <ContainerBox color="#38bdf8" label="容器 web" sub=":80 → 宿主机 :8080" position={[0.4, 1.1, 0]} conflict={false} />
        {/* 容器 B（端口冲突幽灵） */}
        {conflict && <ContainerBox color="#fb7185" label="容器 intruder" sub="也想抢 :8080" position={[3.6, 1.35, -0.4]} conflict />}

        {!conflict && <Packets count={burst ? 14 : 6} speed={burst ? 0.75 : 0.32} />}
        <OrbitControls enablePan={false} enableZoom={false} minPolarAngle={0.6} maxPolarAngle={1.4} />
      </Canvas>

      <div className="absolute left-3 bottom-3 right-3 flex flex-wrap items-center gap-2 bg-white/10 backdrop-blur-xl border border-white/25 rounded-2xl px-4 py-2.5">
        <button
          onClick={() => setBurst((v) => !v)}
          className={`text-xs px-3.5 py-1.5 rounded-full font-medium transition-all ${burst ? "bg-amber-400 text-slate-900" : "bg-sky-500 text-white hover:bg-sky-400"}`}
        >
          {burst ? "🔥 洪峰模式（14 包/秒）" : "⚡ 发送请求洪峰"}
        </button>
        <button
          onClick={() => setConflict((v) => !v)}
          className={`text-xs px-3.5 py-1.5 rounded-full font-medium border transition-all ${conflict ? "bg-rose-500 text-white border-rose-300" : "bg-white/15 text-slate-200 border-white/30 hover:bg-white/25"}`}
        >
          {conflict ? "撤走入侵容器" : "再起一个容器抢 8080？"}
        </button>
        <span className="text-[11px] text-slate-300 ml-auto hidden sm:inline">拖拽旋转视角</span>
      </div>

      {conflict && (
        <div className="absolute top-3 right-3 bg-rose-500/90 backdrop-blur-xl text-white border border-rose-300 rounded-2xl px-4 py-3 text-xs max-w-[240px] shadow-xl">
          <div className="font-semibold">Bind for 0.0.0.0:8080 failed</div>
          <div className="opacity-90 mt-1">port is already allocated —— 一个宿主机端口只能映射给一个容器。</div>
        </div>
      )}
    </div>
  );
}
