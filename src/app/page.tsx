import Link from "next/link";
import { courses } from "@/data/courses";
import { challenges } from "@/data/challenges";
import { TRACK_CONFIG } from "@/types";
import HeroMiniLab from "@/components/container/HeroMiniLab";

const lessonCount = courses.reduce((s, c) => s + c.chapters.reduce((x, ch) => x + ch.lessons.length, 0), 0);

const FEATURES = [
  { icon: "🎛️", title: "双栏联动沙盒", desc: "左边敲 docker 命令，右边容器、镜像分层、网络拓扑实时长出来；点任何可视化对象，反向告诉你对应哪条命令。" },
  { icon: "🎬", title: "交互动画", desc: "镜像分层缓存、端口映射、overlayfs 写时复制、容器 vs 虚拟机——动画不是贴片演示，是你命令的真实结果。" },
  { icon: "🧗", title: "高手折叠区", desc: "每节课正文人人能懂；展开折叠区就是生产事故复盘、moby 源码直达、性能数据和面试追问。" },
  { icon: "🚨", title: "真实事故挑战", desc: "镜像 1.2GB 瘦身、容器秒退排查——在模拟沙盒里亲手修好真实世界的事故。" },
];

const TRACKS = [
  { icon: "🌱", title: "零基础轨", desc: "从「代码为什么在别人机器上跑不起来」讲起，全顺序学习路径。", href: "/courses" },
  { icon: "⚡", title: "熟手轨", desc: "已经会点 Docker？直接进沙盒敲命令，缺什么再回课程补。", href: "/sandbox" },
  { icon: "🚒", title: "排障轨", desc: "运维视角：直奔场景挑战和事故复盘，学的是排查方法论。", href: "/challenges" },
];

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="relative max-w-6xl mx-auto px-4 pt-14 pb-10 grid lg:grid-cols-[1.05fr_1fr] gap-8 items-center">
          <div className="text-center lg:text-left">
            <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">
              <span className="bg-gradient-to-r from-sky-600 via-blue-700 to-indigo-600 bg-clip-text text-transparent">容器学习平台</span>
              <span className="block text-xl md:text-2xl font-semibold text-slate-500 mt-3">
                菜鸟看得懂，高手有真案例 · 全程浏览器里跑，不用装任何东西
              </span>
            </h1>
            <p className="mt-6 text-slate-500 leading-relaxed">
              Docker 正课 + K8s 进阶篇 + namespace/cgroups/overlayfs 原理篇。
              自研容器模拟引擎让 <code className="px-1.5 py-0.5 rounded bg-white/60 border border-white/80 font-mono text-sm">docker run</code> 真的在浏览器里跑起来——
              起服务、映射端口、构建镜像、编排 compose，全部可交互。
            </p>
            <div className="flex flex-wrap gap-3 mt-8 lg:justify-start justify-center">
              <Link href="/sandbox" className="glass-btn glass-btn-primary">
                打开沙盒直接练 →
              </Link>
              <Link href="/demos" className="glass-btn">
                🎬 动画实验室
              </Link>
              <Link href="/courses" className="glass-btn">
                从第一课开始
              </Link>
            </div>
            <div className="glass inline-flex flex-wrap gap-x-7 gap-y-1 mt-8 px-7 py-3.5 text-sm text-slate-600 rounded-full">
              <div><span className="text-2xl font-bold text-slate-800">{courses.length}</span> 门课</div>
              <div><span className="text-2xl font-bold text-slate-800">{lessonCount}</span> 节课</div>
              <div><span className="text-2xl font-bold text-slate-800">{challenges.length}</span> 个事故挑战</div>
              <div><span className="text-2xl font-bold text-slate-800">9</span> 组交互动画</div>
              <div><span className="text-2xl font-bold text-slate-800">60+</span> 条模拟命令</div>
            </div>
          </div>
          <div className="min-w-0">
            <HeroMiniLab />
          </div>
        </div>
      </section>

      {/* 动画 SVG 流水线：build → image → run */}
      <div className="max-w-3xl mx-auto mt-8 mb-4">
        <svg viewBox="0 0 720 88" className="w-full" role="img" aria-label="构建流水线动画">
          <defs>
            <linearGradient id="pipe" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#0ea5e9" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>
          </defs>
          {[
            { x: 78, emoji: "📝", label: "Dockerfile" },
            { x: 360, emoji: "📦", label: "镜像 Image" },
            { x: 642, emoji: "🚢", label: "容器 ×N" },
          ].map((n) => (
            <g key={n.label}>
              <circle cx={n.x} cy="38" r="30" fill="rgba(255,255,255,0.75)" stroke="rgba(56,189,248,0.5)" strokeWidth="1.5" />
              <text x={n.x} y="45" textAnchor="middle" fontSize="24">{n.emoji}</text>
              <text x={n.x} y="84" textAnchor="middle" fontSize="13" fill="#475569" fontFamily="ui-monospace, monospace">{n.label}</text>
            </g>
          ))}
          {[200, 480].map((x0) => (
            <g key={x0}>
              <line x1={x0} y1="38" x2={x0 + 90} y2="38" stroke="url(#pipe)" strokeWidth="2.5" strokeDasharray="7 7" className="pipe-flow" />
              <polygon points={`${x0 + 88},32 ${x0 + 100},38 ${x0 + 88},44`} fill="#0ea5e9" />
            </g>
          ))}
        </svg>
      </div>

      {/* 三轨入口 */}
      <section className="max-w-6xl mx-auto px-4 mt-6">
        <div className="grid md:grid-cols-3 gap-4">
          {TRACKS.map((t) => (
            <Link key={t.title} href={t.href} className="card glass-lift p-5 group">
              <div className="text-2xl mb-2">{t.icon}</div>
              <div className="font-semibold text-slate-800 group-hover:text-sky-600 transition-colors">{t.title}</div>
              <div className="text-sm text-slate-500 mt-1 leading-relaxed">{t.desc}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* 课程矩阵 */}
      <section className="max-w-6xl mx-auto px-4 mt-14">
        <div className="flex items-baseline justify-between mb-5">
          <h2 className="text-2xl font-bold text-slate-800">课程矩阵</h2>
          <Link href="/courses" className="text-sm text-sky-600 hover:underline">全部课程 →</Link>
        </div>
        <div className="space-y-6">
          {(["docker", "principle", "k8s"] as const).map((track) => {
            const list = courses.filter((c) => c.track === track);
            if (list.length === 0) return null;
            return (
              <div key={track}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-sm font-semibold px-2.5 py-1 rounded-lg ${TRACK_CONFIG[track].bgColor} ${TRACK_CONFIG[track].color}`}>{TRACK_CONFIG[track].label}</span>
                  <span className="text-xs text-slate-400">{TRACK_CONFIG[track].desc}</span>
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  {list.map((c) => (
                    <Link key={c.id} href={`/course/${c.slug}`} className="card glass-lift p-5 group">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{c.icon}</span>
                        <span className="font-semibold text-slate-800 group-hover:text-sky-600 transition-colors">{c.title}</span>
                      </div>
                      <div className="text-sm text-slate-500 mt-2 leading-relaxed line-clamp-2">{c.description}</div>
                      <div className="flex gap-2 mt-3 text-[11px] text-slate-400">
                        <span>{c.chapters.reduce((s, ch) => s + ch.lessons.length, 0)} 节</span>
                        <span>·</span>
                        <span>{c.duration}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 特性 */}
      <section className="max-w-6xl mx-auto px-4 mt-14">
        <h2 className="text-2xl font-bold text-slate-800 mb-5">为什么是我们</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="card p-5 flex gap-4">
              <div className="text-3xl shrink-0">{f.icon}</div>
              <div>
                <div className="font-semibold text-slate-800">{f.title}</div>
                <div className="text-sm text-slate-500 mt-1 leading-relaxed">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
